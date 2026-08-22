const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { DATA_DIR } = require("./store");

const STAFF_PATH = path.join(DATA_DIR, "staff.json");
const MIN_PASSWORD = 6;

function emptyStaff() {
  return { admins: [], requests: [], users: [] };
}

function normalizeStaffId(value) {
  const id = String(value || "").trim();
  return id.includes("@") ? id.toLowerCase() : id;
}

function ownerIdentity() {
  return String(process.env.OWNER_EMAIL || "morpheus.moldador@gmail.com").trim().toLowerCase();
}

function isValidEmail(email) {
  const value = normalizeStaffId(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

function loadStaff() {
  try {
    if (fs.existsSync(STAFF_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STAFF_PATH, "utf8"));
      return {
        admins: Array.isArray(parsed.admins) ? parsed.admins : [],
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        users: Array.isArray(parsed.users) ? parsed.users : [],
      };
    }
  } catch {
    /* ignore corrupt file */
  }
  return emptyStaff();
}

function saveStaff(staff) {
  fs.mkdirSync(path.dirname(STAFF_PATH), { recursive: true });
  const payload = {
    admins: staff.admins || [],
    requests: staff.requests || [],
    users: staff.users || [],
  };
  const tmp = STAFF_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tmp, STAFF_PATH);
  return payload;
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), s, 32).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  try {
    const check = crypto.scryptSync(String(password), salt, 32);
    const expected = Buffer.from(hash, "hex");
    if (check.length !== expected.length) return false;
    return crypto.timingSafeEqual(check, expected);
  } catch {
    return false;
  }
}

function randomPassword() {
  return crypto.randomBytes(4).toString("hex");
}

function findUser(staff, userId) {
  const id = normalizeStaffId(userId);
  return (staff.users || []).find((user) => normalizeStaffId(user.id) === id) || null;
}

function usernameFromEmail(email) {
  return String(email || "").split("@")[0] || "Usuário";
}

function avatarOf(user) {
  if (String(user.avatar || "").startsWith("http")) return user.avatar;
  if (user.email || String(user.id || "").includes("@")) {
    const name = encodeURIComponent(user.global_name || user.username || "U");
    return `https://ui-avatars.com/api/?name=${name}&background=3b82f6&color=fff&size=64`;
  }
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  return "https://cdn.discordapp.com/embed/avatars/0.png";
}

function profileFromSession(user) {
  const id = normalizeStaffId(user.id || user.email);
  const email = isValidEmail(user.email || id) ? normalizeStaffId(user.email || id) : "";
  return {
    id,
    email: email || id,
    username: user.global_name || user.username || usernameFromEmail(email || id),
    avatar: avatarOf(user),
  };
}

function sessionUserFromAccount(account) {
  const email = normalizeStaffId(account.email || account.id);
  return {
    id: email,
    email,
    username: account.username || usernameFromEmail(email),
    global_name: normalizeStaffId(email) === ownerIdentity() ? "Dono" : account.username || usernameFromEmail(email),
    avatar: account.avatar || "",
  };
}

function publicAccount(account) {
  if (!account) return null;
  return {
    id: normalizeStaffId(account.id),
    email: normalizeStaffId(account.email || account.id),
    username: account.username,
    mustChangePassword: Boolean(account.mustChangePassword),
  };
}

function ensurePassword(password) {
  const value = String(password || "");
  if (value.length < MIN_PASSWORD) {
    return { ok: false, error: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` };
  }
  return { ok: true, value };
}

function upsertUser(staff, email, password, opts) {
  const id = normalizeStaffId(email);
  let user = findUser(staff, id);
  if (!user) {
    user = {
      id,
      email: id,
      username: usernameFromEmail(id),
      avatar: "",
      passwordHash: hashPassword(password),
      mustChangePassword: Boolean(opts && opts.mustChangePassword),
      createdAt: new Date().toISOString(),
    };
    staff.users.push(user);
  } else if (password) {
    user.passwordHash = hashPassword(password);
    if (opts && opts.mustChangePassword != null) user.mustChangePassword = Boolean(opts.mustChangePassword);
  }
  return user;
}

function isApprovedAdmin(userId) {
  if (!userId) return false;
  const id = normalizeStaffId(userId);
  return loadStaff().admins.some((admin) => normalizeStaffId(admin.id) === id);
}

function getRequest(userId) {
  if (!userId) return null;
  const id = normalizeStaffId(userId);
  return loadStaff().requests.find((req) => normalizeStaffId(req.id) === id) || null;
}

function getAccount(userId) {
  return findUser(loadStaff(), userId);
}

function requestAdmin(user) {
  const staff = loadStaff();
  const profile = profileFromSession(user);
  if (normalizeStaffId(profile.id) === ownerIdentity()) {
    return { ok: false, error: "O dono já tem acesso total." };
  }
  if (staff.admins.some((admin) => normalizeStaffId(admin.id) === profile.id)) {
    return { ok: false, error: "Você já é admin." };
  }
  const existing = staff.requests.find((req) => normalizeStaffId(req.id) === profile.id);
  if (existing && existing.status === "pending") {
    return { ok: false, error: "Seu pedido já está em análise." };
  }
  const entry = {
    ...profile,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  staff.requests = staff.requests.filter((req) => normalizeStaffId(req.id) !== profile.id);
  staff.requests.unshift(entry);
  saveStaff(staff);
  return { ok: true, request: entry };
}

function registerAndRequest(email, password) {
  if (!isValidEmail(email)) return { ok: false, error: "Digite um e-mail válido." };
  const id = normalizeStaffId(email);
  if (id === ownerIdentity()) return { ok: false, error: "Este e-mail é do dono." };
  const check = ensurePassword(password);
  if (!check.ok) return check;

  const staff = loadStaff();
  if (staff.admins.some((admin) => normalizeStaffId(admin.id) === id)) {
    return { ok: false, error: "Você já é admin. Entre com e-mail e senha." };
  }
  const existingUser = findUser(staff, id);
  if (existingUser && !verifyPassword(check.value, existingUser.passwordHash)) {
    return { ok: false, error: "Já existe uma conta com este e-mail. Entre com a senha." };
  }
  const existing = staff.requests.find((req) => normalizeStaffId(req.id) === id);
  if (existing && existing.status === "pending") {
    return { ok: false, error: "Seu pedido já está em análise." };
  }

  const user = upsertUser(staff, id, existingUser ? null : check.value);
  saveStaff(staff);
  const result = requestAdmin(sessionUserFromAccount(user));
  if (!result.ok) return result;
  return { ok: true, user: sessionUserFromAccount(user), request: result.request };
}

function loginWithPassword(email, password) {
  if (!isValidEmail(email)) return { ok: false, error: "Digite um e-mail válido." };
  const id = normalizeStaffId(email);
  const check = ensurePassword(password);
  if (!check.ok) return check;

  const staff = loadStaff();
  let user = findUser(staff, id);

  if (!user && id === ownerIdentity()) {
    user = upsertUser(staff, id, check.value, { mustChangePassword: false });
    saveStaff(staff);
    return { ok: true, user: sessionUserFromAccount(user), created: true };
  }

  if (!user) {
    return { ok: false, error: "Conta não encontrada. Clique em Pedir acesso para se cadastrar." };
  }
  if (!verifyPassword(check.value, user.passwordHash)) {
    return { ok: false, error: "Senha incorreta." };
  }
  return { ok: true, user: sessionUserFromAccount(user), account: publicAccount(user) };
}

function decideRequest(userId, action, provisionalPassword) {
  const staff = loadStaff();
  const id = normalizeStaffId(userId);
  const request = staff.requests.find((req) => normalizeStaffId(req.id) === id);
  if (!request || request.status !== "pending") {
    return { ok: false, error: "Pedido não encontrado." };
  }

  let generatedPassword = "";
  if (action === "accept") {
    request.status = "accepted";
    request.decidedAt = new Date().toISOString();
    staff.admins = staff.admins.filter((admin) => normalizeStaffId(admin.id) !== id);
    staff.admins.push({
      id: request.id,
      email: request.email || request.id,
      username: request.username,
      avatar: request.avatar,
      approvedAt: request.decidedAt,
    });
    const wanted = String(provisionalPassword || "").trim();
    if (wanted) {
      const check = ensurePassword(wanted);
      if (!check.ok) return check;
      generatedPassword = check.value;
      upsertUser(staff, id, generatedPassword, { mustChangePassword: true });
    } else if (!findUser(staff, id)) {
      generatedPassword = randomPassword();
      upsertUser(staff, id, generatedPassword, { mustChangePassword: true });
    }
  } else if (action === "refuse") {
    request.status = "refused";
    request.decidedAt = new Date().toISOString();
    staff.admins = staff.admins.filter((admin) => normalizeStaffId(admin.id) !== id);
  } else {
    return { ok: false, error: "Ação inválida." };
  }

  saveStaff(staff);
  return { ok: true, staff, provisionalPassword: generatedPassword || undefined };
}

function removeAdmin(userId) {
  const staff = loadStaff();
  const id = normalizeStaffId(userId);
  const before = staff.admins.length;
  staff.admins = staff.admins.filter((admin) => normalizeStaffId(admin.id) !== id);
  if (staff.admins.length === before) {
    return { ok: false, error: "Admin não encontrado." };
  }
  const request = staff.requests.find((req) => normalizeStaffId(req.id) === id);
  if (request) request.status = "removed";
  saveStaff(staff);
  return { ok: true, staff };
}

function changePassword(userId, currentPassword, newPassword) {
  const staff = loadStaff();
  const user = findUser(staff, userId);
  if (!user) return { ok: false, error: "Conta não encontrada." };
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { ok: false, error: "Senha atual incorreta." };
  }
  const check = ensurePassword(newPassword);
  if (!check.ok) return check;
  user.passwordHash = hashPassword(check.value);
  user.mustChangePassword = false;
  saveStaff(staff);
  return { ok: true };
}

function changeEmail(userId, currentPassword, newEmail) {
  if (!isValidEmail(newEmail)) return { ok: false, error: "Digite um e-mail válido." };
  const staff = loadStaff();
  const user = findUser(staff, userId);
  if (!user) return { ok: false, error: "Conta não encontrada." };
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { ok: false, error: "Senha atual incorreta." };
  }
  const from = normalizeStaffId(user.id);
  const to = normalizeStaffId(newEmail);
  if (from === to) return { ok: false, error: "O e-mail novo é o mesmo de agora." };
  if (to === ownerIdentity() && from !== ownerIdentity()) {
    return { ok: false, error: "Este e-mail não pode ser usado." };
  }
  if (from === ownerIdentity()) {
    return { ok: false, error: "O e-mail do dono não pode ser trocado por aqui." };
  }
  if (findUser(staff, to)) return { ok: false, error: "Já existe uma conta com este e-mail." };

  user.id = to;
  user.email = to;
  user.username = usernameFromEmail(to);
  staff.requests.forEach((req) => {
    if (normalizeStaffId(req.id) === from) {
      req.id = to;
      req.email = to;
      req.username = user.username;
    }
  });
  staff.admins.forEach((admin) => {
    if (normalizeStaffId(admin.id) === from) {
      admin.id = to;
      admin.email = to;
      admin.username = user.username;
    }
  });
  saveStaff(staff);
  return { ok: true, user: sessionUserFromAccount(user) };
}

function listForOwner() {
  const staff = loadStaff();
  const withEmail = (person) => ({
    ...person,
    id: normalizeStaffId(person.id),
    email: normalizeStaffId(person.email || person.id),
  });
  return {
    pending: staff.requests.filter((req) => req.status === "pending").map(withEmail),
    refused: staff.requests.filter((req) => req.status === "refused").map(withEmail),
    admins: staff.admins.map(withEmail),
  };
}

function pendingCount() {
  return loadStaff().requests.filter((req) => req.status === "pending").length;
}

module.exports = {
  STAFF_PATH,
  MIN_PASSWORD,
  loadStaff,
  isApprovedAdmin,
  getRequest,
  getAccount,
  requestAdmin,
  registerAndRequest,
  loginWithPassword,
  decideRequest,
  removeAdmin,
  changePassword,
  changeEmail,
  listForOwner,
  pendingCount,
  publicAccount,
  randomPassword,
  sessionUserFromAccount,
};
