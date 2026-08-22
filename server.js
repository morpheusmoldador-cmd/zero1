const fs = require("fs");
const path = require("path");

const STAFF_PATH = path.join(__dirname, "..", "data", "staff.json");

function emptyStaff() {
  return { admins: [], requests: [] };
}

function loadStaff() {
  try {
    if (fs.existsSync(STAFF_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STAFF_PATH, "utf8"));
      return {
        admins: Array.isArray(parsed.admins) ? parsed.admins : [],
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
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
  };
  const tmp = STAFF_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tmp, STAFF_PATH);
  return payload;
}

function isApprovedAdmin(userId) {
  if (!userId) return false;
  const id = String(userId);
  return loadStaff().admins.some((admin) => String(admin.id) === id);
}

function getRequest(userId) {
  if (!userId) return null;
  const id = String(userId);
  return loadStaff().requests.find((req) => String(req.id) === id) || null;
}

function avatarOf(user) {
  if (String(user.avatar || "").startsWith("http")) return user.avatar;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  }
  return "https://cdn.discordapp.com/embed/avatars/0.png";
}

function profileFromSession(user) {
  return {
    id: String(user.id),
    username: user.global_name || user.username || "Usuário",
    avatar: avatarOf(user),
  };
}

function requestAdmin(user) {
  const staff = loadStaff();
  const profile = profileFromSession(user);
  const ownerId = process.env.OWNER_ID || "1228740417839824968";
  if (profile.id === String(ownerId)) {
    return { ok: false, error: "O dono já tem acesso total." };
  }
  if (staff.admins.some((admin) => admin.id === profile.id)) {
    return { ok: false, error: "Você já é admin." };
  }
  const existing = staff.requests.find((req) => req.id === profile.id);
  if (existing && existing.status === "pending") {
    return { ok: false, error: "Seu pedido já está em análise." };
  }
  const entry = {
    ...profile,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };
  staff.requests = staff.requests.filter((req) => req.id !== profile.id);
  staff.requests.unshift(entry);
  saveStaff(staff);
  return { ok: true, request: entry };
}

function decideRequest(userId, action) {
  const staff = loadStaff();
  const id = String(userId);
  const request = staff.requests.find((req) => req.id === id);
  if (!request || request.status !== "pending") {
    return { ok: false, error: "Pedido não encontrado." };
  }

  if (action === "accept") {
    request.status = "accepted";
    request.decidedAt = new Date().toISOString();
    staff.admins = staff.admins.filter((admin) => admin.id !== id);
    staff.admins.push({
      id: request.id,
      username: request.username,
      avatar: request.avatar,
      approvedAt: request.decidedAt,
    });
  } else if (action === "refuse") {
    request.status = "refused";
    request.decidedAt = new Date().toISOString();
    staff.admins = staff.admins.filter((admin) => admin.id !== id);
  } else {
    return { ok: false, error: "Ação inválida." };
  }

  saveStaff(staff);
  return { ok: true, staff };
}

function removeAdmin(userId) {
  const staff = loadStaff();
  const id = String(userId);
  const before = staff.admins.length;
  staff.admins = staff.admins.filter((admin) => admin.id !== id);
  if (staff.admins.length === before) {
    return { ok: false, error: "Admin não encontrado." };
  }
  const request = staff.requests.find((req) => req.id === id);
  if (request) request.status = "removed";
  saveStaff(staff);
  return { ok: true, staff };
}

function listForOwner() {
  const staff = loadStaff();
  return {
    pending: staff.requests.filter((req) => req.status === "pending"),
    refused: staff.requests.filter((req) => req.status === "refused"),
    admins: staff.admins,
  };
}

function pendingCount() {
  return loadStaff().requests.filter((req) => req.status === "pending").length;
}

module.exports = {
  STAFF_PATH,
  loadStaff,
  isApprovedAdmin,
  getRequest,
  requestAdmin,
  decideRequest,
  removeAdmin,
  listForOwner,
  pendingCount,
};
