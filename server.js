require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const cookieSession = require("cookie-session");
const multer = require("multer");
const { loadSite, saveSite, ensureDirs, UPLOADS_DIR, DATA_DIR } = require("./src/store");
const { FileSessionStore } = require("./src/sessionStore");
const {
  sessionSecret,
  discordAuthUrl,
  exchangeCode,
  toPublicUser,
  requireLogin,
  requireAdmin,
  requireOwner,
  redirectUri,
  usesEmailAuth,
  isValidEmail,
  userFromEmail,
} = require("./src/auth");
const { requestAdmin, decideRequest, removeAdmin, listForOwner } = require("./src/staff");

ensureDirs();

const app = express();
const PORT = Number(process.env.PORT) || 80;
const isHttps = process.env.PUBLIC_URL
  ? process.env.PUBLIC_URL.startsWith("https")
  : true;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "8mb" }));

if (process.env.VERCEL) {
  app.use(
    cookieSession({
      name: "zer01.sid",
      keys: [sessionSecret()],
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: process.env.VERCEL_ENV !== "development",
      httpOnly: true,
    })
  );
} else {
  app.use(
    session({
      name: "zer01.sid",
      secret: sessionSecret(),
      resave: false,
      saveUninitialized: false,
      store: new FileSessionStore(path.join(DATA_DIR, "sessions")),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );
}

function saveSession(req, cb) {
  if (req.session && typeof req.session.save === "function") {
    req.session.save(cb);
  } else {
    cb();
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error("Envie apenas imagens."));
    }
    cb(null, true);
  },
});

function lightSanitize(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son(?!click)[a-z]+=(".*?"|'.*?')/gi, "");
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/api/me", (req, res) => {
  res.json(toPublicUser(req.session.user));
});

app.get("/api/site", (_req, res) => {
  const site = loadSite();
  res.json({
    title: site.title,
    html: site.html,
    vipStoreUrl: site.vipStoreUrl || "",
    vipStoreLabel: site.vipStoreLabel || "LOJA VIP",
    connectText: site.connectText || "",
    updatedAt: site.updatedAt,
  });
});

app.put("/api/site", requireAdmin, (req, res) => {
  const current = loadSite();
  const html =
    req.body.html != null ? lightSanitize(String(req.body.html)) : current.html;
  const title = String(req.body.title || current.title || "ZER01 Roleplay | Portal Oficial").slice(0, 120);
  const saved = saveSite({
    html,
    title,
    vipStoreUrl: req.body.vipStoreUrl != null ? req.body.vipStoreUrl : current.vipStoreUrl,
    vipStoreLabel: req.body.vipStoreLabel != null ? req.body.vipStoreLabel : current.vipStoreLabel,
    connectText: req.body.connectText != null ? req.body.connectText : current.connectText,
  });
  res.json({
    ok: true,
    updatedAt: saved.updatedAt,
    vipStoreUrl: saved.vipStoreUrl,
    vipStoreLabel: saved.vipStoreLabel,
    connectText: saved.connectText,
  });
});

app.post("/api/upload", requireAdmin, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload inválido" });
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

app.post("/api/admin/request", requireLogin, (req, res) => {
  const result = requestAdmin(req.session.user);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, requestStatus: "pending" });
});

app.get("/api/admin/requests", requireOwner, (_req, res) => {
  res.json(listForOwner());
});

app.post("/api/admin/requests/:id/accept", requireOwner, (req, res) => {
  const result = decideRequest(req.params.id, "accept");
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, ...listForOwner() });
});

app.post("/api/admin/requests/:id/refuse", requireOwner, (req, res) => {
  const result = decideRequest(req.params.id, "refuse");
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, ...listForOwner() });
});

app.post("/api/admin/admins/:id/remove", requireOwner, (req, res) => {
  const result = removeAdmin(req.params.id);
  if (!result.ok) return res.status(400).json({ error: result.error });
  res.json({ ok: true, ...listForOwner() });
});

app.get("/auth/discord", (req, res) => {
  if (usesEmailAuth()) {
    return res.redirect("/?login=email");
  }
  if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
    return res
      .status(500)
      .send("Login Discord ainda não foi configurado. Preencha DISCORD_CLIENT_ID e DISCORD_CLIENT_SECRET.");
  }
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;
  saveSession(req, () => res.redirect(discordAuthUrl(state, req)));
});

app.get("/auth/discord/callback", async (req, res) => {
  if (usesEmailAuth()) {
    return res.redirect("/?login=email");
  }
  try {
    if (!req.query.code || req.query.state !== req.session.oauthState) {
      return res.redirect("/?login=erro");
    }
    delete req.session.oauthState;
    const user = await exchangeCode(String(req.query.code), req);
    req.session.user = {
      id: user.id,
      username: user.username,
      global_name: user.global_name,
      avatar: user.avatar,
      discriminator: user.discriminator,
    };
    saveSession(req, () => res.redirect("/?login=ok"));
  } catch (err) {
    console.error(err);
    res.redirect("/?login=erro");
  }
});

app.post("/auth/email", (req, res) => {
  if (!usesEmailAuth()) {
    return res.status(404).json({ error: "Login por e-mail só está disponível na versão de teste." });
  }
  const email = String(req.body?.email || "").trim();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Digite um e-mail válido." });
  }
  req.session.user = userFromEmail(email);
  saveSession(req, () => res.json({ ok: true, user: toPublicUser(req.session.user) }));
});

app.post("/auth/logout", (req, res) => {
  if (req.session && typeof req.session.destroy === "function") {
    req.session.destroy(() => res.json({ ok: true }));
    return;
  }
  req.session = null;
  res.json({ ok: true });
});

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "public")));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Erro interno. Tente de novo." });
});

module.exports = app;

if (!process.env.VERCEL) {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`ZER01 Roleplay online na porta ${PORT}`);
    console.log(`Dono: ${process.env.OWNER_EMAIL || "morpheus.moldador@gmail.com"}`);
  });

  server.on("error", (err) => {
    console.error("Falha ao subir o servidor:", err);
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    console.error("uncaughtException:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (err) => {
    console.error("unhandledRejection:", err);
    process.exit(1);
  });
}
