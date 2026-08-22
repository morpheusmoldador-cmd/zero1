const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { getRequest, getAccount, getAdminRole, pendingCount } = require("./staff");

const OWNER_ID = process.env.OWNER_ID || "1228740417839824968";
const OWNER_EMAIL = String(process.env.OWNER_EMAIL || "morpheus.moldador@gmail.com")
  .trim()
  .toLowerCase();

function usesEmailAuth() {
  return true;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 120;
}

function extraAdminIds() {
  return (process.env.ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function ownerIdentity() {
  return usesEmailAuth() ? OWNER_EMAIL : String(OWNER_ID);
}

function isOwner(userId) {
  if (!userId) return false;
  const id = usesEmailAuth() ? normalizeEmail(userId) : String(userId);
  return id === ownerIdentity();
}

function isFullAdmin(userId) {
  if (!userId) return false;
  const id = usesEmailAuth() ? normalizeEmail(userId) : String(userId);
  if (isOwner(id)) return true;
  if (extraAdminIds().includes(String(userId)) || extraAdminIds().includes(id)) return true;
  return getAdminRole(id) === "admin";
}

function isStaff(userId) {
  if (!userId) return false;
  const id = usesEmailAuth() ? normalizeEmail(userId) : String(userId);
  if (isFullAdmin(id)) return true;
  return getAdminRole(id) === "ilegal";
}

function isAdmin(userId) {
  return isFullAdmin(userId);
}

function avatarUrl(user) {
  if (!user) return "";
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

function userFromEmail(email) {
  const normalized = normalizeEmail(email);
  const username = normalized.split("@")[0] || "Usuário";
  return {
    id: normalized,
    email: normalized,
    username,
    global_name: isOwner(normalized) ? "Dono" : username,
    avatar: "",
  };
}

function publicUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (req) {
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim();
    const host = (req.headers["x-forwarded-host"] || req.get("host") || "").split(",")[0].trim();
    if (host) return `${proto}://${host}`;
  }
  return "https://zer01roleplay.livroderegras.app";
}

function redirectUri(req) {
  return `${publicUrl(req)}/auth/discord/callback`;
}

function sessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "troque-por-uma-frase-longa-e-aleatoria") {
    return process.env.SESSION_SECRET;
  }
  if (process.env.VERCEL) {
    return "zer01-vercel-test-secret";
  }
  const file = path.join(__dirname, "..", "data", ".session-secret");
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  } catch {
    /* ignore */
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, secret, "utf8");
  return secret;
}

function discordAuthUrl(state, req) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "identify",
    prompt: "consent",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

async function exchangeCode(code, req) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID || "",
    client_secret: process.env.DISCORD_CLIENT_SECRET || "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(req),
  });

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Falha no token Discord: ${tokenRes.status} ${text}`);
  }
  const token = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!userRes.ok) {
    throw new Error("Falha ao ler o usuário Discord");
  }
  return userRes.json();
}

function toPublicUser(sessionUser) {
  const authMode = usesEmailAuth() ? "email" : "discord";
  if (!sessionUser) return { loggedIn: false, canEdit: false, canEditIlegal: false, isOwner: false, authMode };
  const request = getRequest(sessionUser.id);
  const account = getAccount(sessionUser.id);
  const role = isOwner(sessionUser.id) ? "owner" : getAdminRole(sessionUser.id) || "none";
  return {
    loggedIn: true,
    canEdit: isFullAdmin(sessionUser.id),
    canEditIlegal: isStaff(sessionUser.id),
    id: sessionUser.id,
    email: sessionUser.email || sessionUser.id,
    username: sessionUser.global_name || sessionUser.username,
    avatar: avatarUrl(sessionUser),
    isOwner: isOwner(sessionUser.id),
    role,
    hasPassword: Boolean(account && account.passwordHash),
    requestStatus: isStaff(sessionUser.id) ? role : (request && request.status) || "none",
    pendingCount: isFullAdmin(sessionUser.id) ? pendingCount() : 0,
    canManageStaff: isFullAdmin(sessionUser.id),
    canSetAdminRole: isOwner(sessionUser.id),
    mustChangePassword: Boolean(account && account.mustChangePassword),
    authMode,
  };
}

function requireLogin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: usesEmailAuth() ? "Faça login com o e-mail." : "Faça login com o Discord." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user || !isFullAdmin(req.session.user.id)) {
    return res.status(403).json({ error: "Somente o dono/admin pode editar." });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!req.session?.user || !isStaff(req.session.user.id)) {
    return res.status(403).json({ error: "Somente a administração pode acessar." });
  }
  next();
}

function requireOwner(req, res, next) {
  if (!req.session?.user || !isOwner(req.session.user.id)) {
    return res.status(403).json({ error: "Somente o dono pode gerenciar cadastros." });
  }
  next();
}

module.exports = {
  OWNER_ID,
  OWNER_EMAIL,
  usesEmailAuth,
  normalizeEmail,
  isValidEmail,
  ownerIdentity,
  isOwner,
  isAdmin,
  isFullAdmin,
  isStaff,
  avatarUrl,
  userFromEmail,
  publicUrl,
  redirectUri,
  sessionSecret,
  discordAuthUrl,
  exchangeCode,
  toPublicUser,
  requireLogin,
  requireAdmin,
  requireStaff,
  requireOwner,
};
