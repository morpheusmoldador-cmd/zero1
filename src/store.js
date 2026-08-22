const fs = require("fs");
const path = require("path");

const IS_VERCEL = Boolean(process.env.VERCEL);
const ROOT = path.join(__dirname, "..");
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "zer01-data") : path.join(ROOT, "data");
const SITE_PATH = path.join(DATA_DIR, "site.json");
const ORIGINAL_PATH = path.join(ROOT, "data", "original.html");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const MISSING_DOMINATION = `
        <div id="dom-guerra" class="subtab-content">
            <div class="card">
                <h3>⚔️ Guerra</h3>
                <p>Use o modo Editar para preencher as regras de guerra.</p>
            </div>
        </div>
        <div id="dom-br" class="subtab-content">
            <div class="card">
                <h3>👑 Battle Royale</h3>
                <p>Use o modo Editar para preencher as regras de Battle Royale.</p>
            </div>
        </div>
`

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function extractHtml(original) {
  const bodyMatch = original.match(/<body[^>]*>([\s\S]*?)<script>/i);
  let html = bodyMatch ? bodyMatch[1].trim() : original;

  if (!html.includes('id="dom-guerra"')) {
    html = html.replace(/<\/div>\s*<div id="precos"/, `${MISSING_DOMINATION}    </div>\n\n    <div id="precos"`);
  }

  return html;
}

function extractTitle(original) {
  const m = original.match(/<title>([\s\S]*?)<\/title>/i);
  return (m && m[1].trim()) || "ZER01 Roleplay | Portal Oficial";
}

function defaultSite() {
  const original = fs.existsSync(ORIGINAL_PATH)
    ? fs.readFileSync(ORIGINAL_PATH, "utf8")
    : "<nav></nav><div class=\"container\"><div id=\"inicio\" class=\"tab-content active\"><h1>ZER01 ROLEPLAY</h1></div></div>";

  return {
    title: extractTitle(original).replace(/Zero01 Roleplay/i, "ZER01 Roleplay").replace(/Central Roleplay/i, "ZER01 Roleplay"),
    html: extractHtml(original),
    vipStoreUrl: "",
    vipStoreLabel: "LOJA VIP",
    connectText: "",
    ilegalInfo: emptyIlegalInfo(),
    updatedAt: new Date().toISOString(),
  };
}

function loadSite() {
  ensureDirs();
  if (fs.existsSync(SITE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SITE_PATH, "utf8"));
      if (parsed && typeof parsed.html === "string") return parsed;
    } catch {
      /* fallback to seed */
    }
  }
  const site = defaultSite();
  saveSite(site);
  return site;
}

function sanitizeVipUrl(url) {
  let raw = String(url || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function sanitizeVipLabel(text) {
  const label = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return label || "LOJA VIP";
}

function sanitizeConnectText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

const ILEGAL_GROUPS = ["favela", "qg", "gueto"];
const ILEGAL_FIELD_KEYS = ["nome", "lider", "vice", "discord", "connect"];

function emptyIlegalInfo() {
  return { favela: [], qg: [], gueto: [] };
}

function sanitizePhotoUrl(url) {
  const raw = String(url || "").trim().slice(0, 500);
  if (!raw) return "";
  if (raw.startsWith("/uploads/")) return raw;
  return sanitizeVipUrl(raw);
}

function sanitizeIlegalOrg(org, index) {
  const name = String((org && org.name) || "Organização")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "Organização";
  const id = String((org && org.id) || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 40) || `org-${index + 1}`;
  const photos = Array.isArray(org && org.photos) ? org.photos : [];
  const fields = (org && org.fields) || {};
  const cleanFields = {};
  ILEGAL_FIELD_KEYS.forEach((key) => {
    cleanFields[key] = String(fields[key] || "").replace(/\s+/g, " ").trim().slice(0, 200);
  });
  return {
    id,
    name,
    photos: [0, 1, 2, 3, 4].map((i) => sanitizePhotoUrl(photos[i] || "")),
    fields: cleanFields,
  };
}

function sanitizeIlegalInfo(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = emptyIlegalInfo();
  ILEGAL_GROUPS.forEach((group) => {
    const list = Array.isArray(src[group]) ? src[group] : [];
    const used = new Set();
    out[group] = list.slice(0, 40).map((org, index) => {
      const clean = sanitizeIlegalOrg(org, index);
      let id = clean.id;
      let n = 2;
      while (used.has(id)) id = `${clean.id}-${n++}`;
      used.add(id);
      clean.id = id;
      return clean;
    });
  });
  return out;
}

function saveSite(site) {
  ensureDirs();
  const current = fs.existsSync(SITE_PATH)
    ? (() => {
        try {
          return JSON.parse(fs.readFileSync(SITE_PATH, "utf8"));
        } catch {
          return {};
        }
      })()
    : {};
  const payload = {
    title: site.title || current.title || "ZER01 Roleplay | Portal Oficial",
    html: site.html != null ? site.html : current.html || "",
    vipStoreUrl: sanitizeVipUrl(site.vipStoreUrl != null ? site.vipStoreUrl : current.vipStoreUrl),
    vipStoreLabel: sanitizeVipLabel(site.vipStoreLabel != null ? site.vipStoreLabel : current.vipStoreLabel),
    connectText: sanitizeConnectText(site.connectText != null ? site.connectText : current.connectText),
    ilegalInfo: sanitizeIlegalInfo(site.ilegalInfo != null ? site.ilegalInfo : current.ilegalInfo),
    updatedAt: new Date().toISOString(),
  };
  const tmp = SITE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), "utf8");
  fs.renameSync(tmp, SITE_PATH);
  return payload;
}

module.exports = {
  DATA_DIR,
  SITE_PATH,
  UPLOADS_DIR,
  loadSite,
  saveSite,
  sanitizeVipUrl,
  sanitizeIlegalInfo,
  emptyIlegalInfo,
  ILEGAL_GROUPS,
  ILEGAL_FIELD_KEYS,
  ensureDirs,
};
