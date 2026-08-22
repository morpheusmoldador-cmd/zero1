(function () {
  const TEXT_TAGS = "h1,h2,h3,h4,p,span,strong,em,a,td,th,label,li";
  let snapshot = "";
  let selected = null;
  let me = { loggedIn: false, canEdit: false };
  let siteTitle = document.title;
  let vipStoreUrl = "";
  let vipStoreLabel = "LOJA VIP";
  let connectText = "";
  let editBackup = null;

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.style.display = "none"), 2800);
  }

  function activePane() {
    const tab = document.querySelector("#site-root .tab-content.active");
    if (!tab) return document.querySelector("#site-root .container") || document.querySelector(".container");
    const sub = tab.querySelector(":scope > .subtab-content.active") || tab.querySelector(".subtab-content.active");
    if (!sub) return tab;
    const nested = sub.querySelector(":scope > .subsubtab-content.active") || sub.querySelector(".subsubtab-content.active");
    return nested || sub;
  }

  function lastTopicCard(pane) {
    const cards = [...pane.querySelectorAll(".card")].filter((card) => {
      if (card.closest(".calculator-footer")) return false;
      const home = card.closest(".subsubtab-content, .subtab-content, .tab-content");
      return home === pane;
    });
    return cards[cards.length - 1] || null;
  }

  function slug(text) {
    return String(text || "nova")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "nova";
  }

  function uniqueId(base) {
    let id = base;
    let n = 2;
    while (document.getElementById(id)) {
      id = `${base}-${n++}`;
    }
    return id;
  }

  function selectEl(el) {
    if (selected) selected.classList.remove("is-selected");
    selected = el;
    if (selected) selected.classList.add("is-selected");
  }

  function setEditable(on) {
    document.querySelectorAll(`#site-root ${TEXT_TAGS}`).forEach((el) => {
      if (el.closest(".calculator-footer, #connect-box, [data-connect-box]")) return;
      if (el.closest("[data-vip-button]")) {
        el.removeAttribute("contenteditable");
        return;
      }
      if (el.tagName === "A" && !on) el.removeAttribute("contenteditable");
      else el.contentEditable = on ? "true" : "false";
    });
    const connectValue = document.getElementById("connect-value");
    if (connectValue && connectValue.tagName === "INPUT") {
      connectValue.readOnly = !on || !me.canEdit;
      if (on && me.canEdit) connectValue.removeAttribute("readonly");
    }
  }

  function openModal(title, fields) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById("modal");
      document.getElementById("modal-title").textContent = title;
      const box = document.getElementById("modal-fields");
      box.innerHTML = fields
        .map(
          (f) =>
            `<label>${f.label}</label><input id="f-${f.name}" value="${String(f.value || "").replace(/"/g, "&quot;")}"${f.placeholder ? ` placeholder="${String(f.placeholder).replace(/"/g, "&quot;")}"` : ""}>`
        )
        .join("");
      backdrop.classList.add("open");
      const first = box.querySelector("input");
      if (first) setTimeout(() => first.focus(), 0);
      const ok = () => {
        const values = {};
        fields.forEach((f) => {
          values[f.name] = document.getElementById(`f-${f.name}`).value;
        });
        cleanup();
        resolve(values);
      };
      const cancel = () => {
        cleanup();
        resolve(null);
      };
      function cleanup() {
        backdrop.classList.remove("open");
        document.getElementById("modal-ok").onclick = null;
        document.getElementById("modal-cancel").onclick = null;
      }
      document.getElementById("modal-ok").onclick = ok;
      document.getElementById("modal-cancel").onclick = cancel;
    });
  }

  function pickFile() {
    return new Promise((resolve) => {
      const input = document.getElementById("file-input");
      input.value = "";
      input.onchange = () => resolve(input.files[0] || null);
      input.click();
    });
  }

  function openImageModal(currentUrl) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById("modal");
      document.getElementById("modal-title").textContent = "Editar foto";
      const box = document.getElementById("modal-fields");
      box.innerHTML = `
        <label>Cole o link da foto</label>
        <input id="f-image-url" value="${String(currentUrl || "").replace(/"/g, "&quot;")}" placeholder="https://...">
        <p class="staff-hint" style="margin: 14px 0 8px;">ou envie um arquivo PNG</p>
        <button class="btn btn-ghost" type="button" id="f-image-file">Enviar PNG</button>
        <p id="f-image-file-name" class="staff-empty"></p>
      `;
      backdrop.classList.add("open");
      const fileBtn = document.getElementById("f-image-file");
      fileBtn.onclick = async () => {
        const file = await pickFile();
        if (!file) return;
        try {
          const url = await uploadFile(file);
          document.getElementById("f-image-url").value = url;
          document.getElementById("f-image-file-name").textContent = file.name + " — pronto para salvar";
        } catch (err) {
          toast(err.message);
        }
      };
      const ok = () => {
        const url = document.getElementById("f-image-url").value.trim();
        cleanup();
        resolve(url || null);
      };
      const cancel = () => {
        cleanup();
        resolve(null);
      };
      function cleanup() {
        backdrop.classList.remove("open");
        document.getElementById("modal-ok").onclick = null;
        document.getElementById("modal-cancel").onclick = null;
      }
      document.getElementById("modal-ok").onclick = ok;
      document.getElementById("modal-cancel").onclick = cancel;
    });
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no upload");
    return data.url;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeImageUrl(raw) {
    let url = String(raw || "").trim();
    if (!url) return "";
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      return parsed.href;
    } catch {
      return "";
    }
  }

  function stripChrome() {
    document.querySelectorAll("[data-composer], [data-chrome]").forEach((el) => el.remove());
  }

  function makePlus(type, title) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "add-inline-plus";
    btn.dataset.chrome = "1";
    btn.dataset.plus = type;
    btn.textContent = "+";
    btn.title = title || "Adicionar";
    btn.setAttribute("aria-label", title || "Adicionar");
    return btn;
  }

  function makeRemove(type) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "edit-remove";
    btn.dataset.chrome = "1";
    btn.dataset.remove = type;
    btn.contentEditable = "false";
    btn.textContent = "Remover";
    return btn;
  }

  function lineAlign(p) {
    if (p.classList.contains("align-center")) return "center";
    if (p.classList.contains("align-start")) return "start";
    const own = p.getAttribute("style") || "";
    const parent = (p.parentElement && p.parentElement.getAttribute("style")) || "";
    if (/text-align:\s*center/i.test(own) || /text-align:\s*center/i.test(parent)) return "center";
    return "start";
  }

  function setLineAlign(p, align) {
    p.classList.remove("align-start", "align-center");
    p.classList.add(align === "center" ? "align-center" : "align-start");
    if (p.style.textAlign) p.style.removeProperty("text-align");
  }

  function makeAlign(p) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "edit-align";
    btn.dataset.chrome = "1";
    btn.dataset.alignToggle = "1";
    btn.contentEditable = "false";
    const next = lineAlign(p) === "center" ? "start" : "center";
    btn.textContent = next === "center" ? "Centro" : "Início";
    btn.title = next === "center" ? "Alinhar ao centro" : "Alinhar ao início da linha";
    return btn;
  }

  function mountLineTools(p) {
    if (!p || p.closest(".calculator-footer")) return;
    p.querySelectorAll("[data-chrome]").forEach((el) => el.remove());
    const tools = document.createElement("span");
    tools.className = "line-tools";
    tools.dataset.chrome = "1";
    tools.contentEditable = "false";
    tools.appendChild(makeAlign(p));
    tools.appendChild(makeRemove("line"));
    p.appendChild(tools);
  }

  function formatBRL(n) {
    return "R$ " + Number(n || 0).toLocaleString("pt-BR");
  }

  function parseMoney(text) {
    let s = String(text || "").replace(/[R$\s]/gi, "").trim();
    if (!s) return 0;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
    return parseFloat(s) || 0;
  }

  function refreshChrome() {
    stripChrome();
    if (!document.body.classList.contains("editing")) return;
    mountCardComposer();
    mountTableChrome();
    mountButtonChrome();
    mountNavChrome();
    mountSubmenuChrome();
    mountCardRemovers();
    mountLineChrome();
  }

  function mountCardComposer() {
    const pane = activePane();
    if (!pane) return;
    const dock = document.createElement("div");
    dock.className = "add-card-dock";
    dock.dataset.composer = "1";
    dock.innerHTML = `
      <button class="add-card-plus" type="button" data-plus="card" aria-label="Nova caixa">+</button>
      <span class="add-card-label">Nova caixa</span>
      <form class="add-card-form" hidden>
        <label>Título</label>
        <input name="title" maxlength="160" placeholder="Título da caixa">
        <label>Texto</label>
        <textarea name="body" rows="4" placeholder="Escreva o texto"></textarea>
        <label>Foto (cole o link)</label>
        <input name="image" placeholder="https://i.postimg.cc/...">
        <div class="add-card-actions">
          <button class="btn btn-ghost" type="button" data-composer-cancel>Cancelar</button>
          <button class="btn btn-ok" type="submit">Salvar</button>
        </div>
      </form>
    `;
    const last = lastTopicCard(pane);
    if (last) last.after(dock);
    else pane.appendChild(dock);
    const plus = dock.querySelector(".add-card-plus");
    const form = dock.querySelector(".add-card-form");
    plus.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = form.hidden;
      form.hidden = !open;
      plus.classList.toggle("is-open", open);
      if (open) form.querySelector("[name=title]").focus();
    });
    dock.querySelector("[data-composer-cancel]").addEventListener("click", () => {
      form.reset();
      form.hidden = true;
      plus.classList.remove("is-open");
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitComposer(form);
    });
  }

  function mountTableChrome() {
    document.querySelectorAll("#site-root table").forEach((table) => {
      const tbody = table.tBodies[0] || table.querySelector("tbody");
      if (!tbody) return;
      tbody.querySelectorAll("tr.item-row").forEach((tr) => {
        const td = document.createElement("td");
        td.dataset.chrome = "1";
        td.appendChild(makeRemove("row"));
        tr.appendChild(td);
      });
      const plusRow = document.createElement("tr");
      plusRow.dataset.chrome = "1";
      const cols = Math.max(2, (tbody.querySelector("tr.item-row") || tbody.querySelector("tr") || {}).children?.length || 5);
      plusRow.innerHTML = `<td colspan="${cols}"></td>`;
      plusRow.querySelector("td").appendChild(makePlus("row", "Nova linha"));
      tbody.appendChild(plusRow);
    });
  }

  function mountButtonChrome() {
    document.querySelectorAll("#site-root .card").forEach((card) => {
      if (card.closest(".calculator-footer")) return;
      const buttons = [...card.querySelectorAll("a.btn")].filter(
        (btn) => !btn.closest("[data-chrome]") && !btn.dataset.vipButton && !btn.dataset.loginButton
      );
      if (!buttons.length) return;
      buttons.forEach((btn) => {
        const wrap = document.createElement("span");
        wrap.className = "edit-chip";
        wrap.dataset.chrome = "1";
        wrap.appendChild(makeRemove("button"));
        btn.after(wrap);
      });
      const last = buttons[buttons.length - 1];
      const chip = last.nextElementSibling;
      (chip && chip.dataset.chrome ? chip : last).after(makePlus("button", "Novo botão"));
    });
  }

  function mountNavChrome() {
    const nav = document.querySelector(".nav-container");
    if (!nav) return;
    [...nav.querySelectorAll("a[href^='#']")].forEach((a) => {
      if (a.dataset.vipButton || a.dataset.loginButton) return;
      const href = a.getAttribute("href") || "";
      if (href === "#inicio") return;
      const chip = document.createElement("span");
      chip.className = "edit-chip";
      chip.dataset.chrome = "1";
      chip.appendChild(makeRemove("tab"));
      a.after(chip);
    });
    const plus = makePlus("tab", "Nova aba");
    const vip = document.getElementById("btn-loja-vip-nav");
    if (vip) vip.before(plus);
    else nav.appendChild(plus);
  }

  function mountSubmenuChrome() {
    document.querySelectorAll("#site-root .submenu").forEach((menu) => {
      const links = [...menu.querySelectorAll(":scope > a")];
      links.forEach((a) => {
        const chip = document.createElement("span");
        chip.className = "edit-chip";
        chip.dataset.chrome = "1";
        chip.appendChild(makeRemove("subtab"));
        a.after(chip);
      });
      menu.appendChild(makePlus("subtab", "Nova aba"));
    });
  }

  function mountCardRemovers() {
    document.querySelectorAll("#site-root .card").forEach((card) => {
      if (card.closest(".calculator-footer")) return;
      card.appendChild(makeRemove("card"));
    });
  }

  function mountLineChrome() {
    document.querySelectorAll("#site-root .card > p").forEach((p) => mountLineTools(p));
  }

  async function persistAndRefresh(msg) {
    try {
      await persistSite({});
      if (msg) toast(msg);
    } catch (err) {
      toast(err.message);
    }
  }

  function addTableRow(table) {
    const tbody = table.tBodies[0] || table.querySelector("tbody");
    if (!tbody) return;
    const sample = tbody.querySelector("tr.item-row");
    const tr = document.createElement("tr");
    tr.className = "item-row";
    tr.dataset.com = "0";
    tr.dataset.sem = "0";
    if (sample) {
      tr.innerHTML = sample.innerHTML;
      tr.querySelectorAll("[data-chrome]").forEach((el) => el.remove());
      const name = tr.querySelector("strong");
      if (name) name.textContent = "Novo item";
      const tds = [...tr.querySelectorAll("td")].filter((td) => !td.querySelector("input") && !td.dataset.chrome);
      tds.slice(-2).forEach((td) => {
        td.textContent = formatBRL(0);
      });
    } else {
      tr.innerHTML = `<td><input type="checkbox" class="sel"></td><td><strong>Novo item</strong></td><td><input type="number" class="qtd" value="1" min="1"></td><td>${formatBRL(0)}</td><td>${formatBRL(0)}</td>`;
    }
    const chromeRow = tbody.querySelector("tr[data-chrome]");
    if (chromeRow) chromeRow.before(tr);
    else tbody.appendChild(tr);
    setEditable(true);
    const nameEl = tr.querySelector("strong") || tr;
    selectEl(nameEl);
    placeCaretStart(nameEl);
    persistAndRefresh("Linha adicionada");
  }

  async function addButtonNear(plus) {
    const values = await openModal("Novo botão", [
      { name: "label", label: "Texto do botão", value: "Novo botão" },
      { name: "href", label: "Link", value: "https://" },
    ]);
    if (!values) return;
    const a = document.createElement("a");
    a.className = "btn";
    a.href = values.href || "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = values.label || "Botão";
    plus.before(a);
    setEditable(true);
    selectEl(a);
    persistAndRefresh("Botão adicionado");
  }

  async function addTab() {
    const values = await openModal("Nova aba", [{ name: "label", label: "Nome da aba", value: "Nova aba" }]);
    if (!values) return;
    const id = uniqueId(slug(values.label));
    const nav = document.querySelector(".nav-container") || document.querySelector("nav");
    if (!nav) return toast("Menu principal não encontrado");
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.id = `link-${id}`;
    a.textContent = values.label;
    const vip = document.getElementById("btn-loja-vip-nav");
    const plus = nav.querySelector('[data-plus="tab"]');
    if (plus) plus.before(a);
    else if (vip) vip.before(a);
    else nav.appendChild(a);
    const container = document.querySelector(".container");
    const page = document.createElement("div");
    page.id = id;
    page.className = "tab-content";
    page.innerHTML = `<h1>${escapeHtml(values.label)}</h1><div class="card"><p>Nova página. Edite este texto.</p></div>`;
    container.appendChild(page);
    location.hash = `#${id}`;
    setEditable(true);
    if (window.handleRouting) window.handleRouting();
    persistAndRefresh("Aba criada");
  }

  async function addSubtabIn(menu) {
    const values = await openModal("Nova aba", [{ name: "label", label: "Nome", value: "Nova seção" }]);
    if (!values) return;
    const id = uniqueId(slug(values.label));
    const nested = Boolean(menu.closest(".subtab-content")) ||
      [...menu.querySelectorAll("a")].some((a) => String(a.getAttribute("onclick") || "").includes("openSubSubTab"));
    const a = document.createElement("a");
    a.textContent = values.label;
    const plus = menu.querySelector('[data-plus="subtab"]');
    if (nested) {
      a.setAttribute("onclick", `openSubSubTab('${id}')`);
      const parent = menu.closest(".subtab-content");
      const pane = document.createElement("div");
      pane.id = id;
      pane.className = "subsubtab-content";
      pane.innerHTML = `<div class="card"><h3>${escapeHtml(values.label)}</h3><p>Conteúdo da nova seção.</p></div>`;
      parent.appendChild(pane);
    } else {
      a.setAttribute("onclick", `openSubTab('${id}')`);
      const page = menu.closest(".tab-content");
      const pane = document.createElement("div");
      pane.id = id;
      pane.className = "subtab-content";
      pane.innerHTML = `<div class="card"><h3>${escapeHtml(values.label)}</h3><p>Conteúdo da nova seção.</p></div>`;
      page.appendChild(pane);
    }
    if (plus) plus.before(a);
    else menu.appendChild(a);
    a.click();
    setEditable(true);
    persistAndRefresh("Aba criada");
  }

  async function handlePlus(btn) {
    const type = btn.dataset.plus;
    if (type === "card") return;
    if (type === "row") return addTableRow(btn.closest("table"));
    if (type === "button") return addButtonNear(btn);
    if (type === "tab") return addTab();
    if (type === "subtab") return addSubtabIn(btn.closest(".submenu"));
  }

  async function handleRemove(btn) {
    const type = btn.dataset.remove;
    if (type === "card") {
      const card = btn.closest(".card");
      if (card) card.remove();
    } else if (type === "row") {
      const tr = btn.closest("tr");
      if (tr) tr.remove();
    } else if (type === "line") {
      const p = btn.closest("p");
      if (p) p.remove();
    } else if (type === "button") {
      const wrap = btn.closest(".edit-chip");
      const target = wrap && wrap.previousElementSibling;
      if (target && target.matches("a.btn")) target.remove();
    } else if (type === "tab") {
      const wrap = btn.closest(".edit-chip");
      const a = wrap && wrap.previousElementSibling;
      if (!a || !a.matches("a")) return;
      const href = a.getAttribute("href") || "";
      const id = href.replace("#", "");
      if (id === "inicio") return toast("A aba Início não pode ser apagada.");
      a.remove();
      const page = document.getElementById(id);
      if (page) page.remove();
      if (location.hash.replace("#", "") === id) location.hash = "#inicio";
    } else if (type === "subtab") {
      const wrap = btn.closest(".edit-chip");
      const a = wrap && wrap.previousElementSibling;
      if (!a) return;
      const onclick = a.getAttribute("onclick") || "";
      const m = onclick.match(/'([^']+)'/);
      a.remove();
      if (m && document.getElementById(m[1])) document.getElementById(m[1]).remove();
    }
    persistAndRefresh("Removido");
  }

  async function submitComposer(form) {
    const title = form.title.value.trim();
    const body = form.body.value.trim();
    const imageRaw = form.image.value.trim();
    const image = normalizeImageUrl(imageRaw);
    if (imageRaw && !image) return toast("Cole um link de foto válido.");
    if (!title && !body && !image) return toast("Preencha título, texto ou o link da foto.");

    const parts = [];
    if (title) parts.push(`<h3>${escapeHtml(title)}</h3>`);
    if (body) {
      body.split(/\n+/).forEach((line) => {
        parts.push(`<p>${escapeHtml(line)}</p>`);
      });
    }
    if (image) {
      parts.push(`<img src="${escapeHtml(image)}" alt="${escapeHtml(title || "Imagem")}" class="action-img">`);
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = parts.join("");
    const dock = form.closest("[data-composer]");
    if (dock) dock.before(card);
    else activePane().appendChild(card);

    form.reset();
    form.hidden = true;
    if (dock) dock.querySelector(".add-card-plus").classList.remove("is-open");
    setEditable(true);
    selectEl(card.querySelector("h3, p, img") || card);

    try {
      await persistSite({});
      toast("Caixa publicada");
    } catch (err) {
      toast(err.message);
    }
  }

  async function editLink() {
    const el = selected && (selected.closest("a") || (selected.tagName === "A" ? selected : null));
    if (!el) return toast("Selecione um botão ou link");
    const values = await openModal("Editar link", [
      { name: "label", label: "Texto", value: el.textContent.trim() },
      { name: "href", label: "URL", value: el.getAttribute("href") || "" },
    ]);
    if (!values) return;
    el.textContent = values.label;
    el.setAttribute("href", values.href || "#");
    persistAndRefresh("Link atualizado");
  }

  async function editImageFor(img) {
    try {
      const url = await openImageModal(img.getAttribute("src") || "");
      if (!url) return;
      img.src = url;
      await persistAndRefresh("Foto atualizada");
    } catch (err) {
      toast(err.message);
    }
  }

  function parkAdminBar() {
    const bar = document.getElementById("admin-bar");
    if (bar) document.body.prepend(bar);
  }

  function parkCalcFooter() {
    const footer = document.getElementById("calcFooter");
    if (footer) document.body.appendChild(footer);
  }

  function placeAdminBar() {
    const bar = document.getElementById("admin-bar");
    const nav = document.querySelector(".nav-container") || document.querySelector("nav");
    if (!bar || !nav) return;
    const vip = document.getElementById("btn-loja-vip-nav");
    if (vip) vip.after(bar);
    else nav.appendChild(bar);
  }

  function cleanHtml() {
    parkAdminBar();
    parkCalcFooter();
    const root = document.getElementById("site-root");
    root.querySelectorAll(".is-selected").forEach((el) => el.classList.remove("is-selected"));
    root.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
    root.querySelectorAll("[data-vip-button], [data-connect-box], [data-login-button], [data-composer], [data-chrome]").forEach((el) => el.remove());
    return root.innerHTML;
  }

  function bindVipClicks(el) {
    if (el.dataset.vipBound) return;
    el.dataset.vipBound = "1";
    el.addEventListener("click", (e) => {
      if (document.body.classList.contains("editing")) {
        e.preventDefault();
        editVipLink();
        return;
      }
      if (!vipStoreUrl) {
        e.preventDefault();
        toast("Loja VIP em breve.");
      }
    });
  }

  function renderVipButtons() {
    const url = vipStoreUrl || "#";
    const nav = document.querySelector(".nav-container") || document.querySelector("nav");
    if (nav && !document.getElementById("btn-loja-vip-nav")) {
      const a = document.createElement("a");
      a.id = "btn-loja-vip-nav";
      a.className = "btn-loja-vip";
      a.dataset.vipButton = "1";
      a.textContent = vipStoreLabel || "LOJA VIP";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      nav.appendChild(a);
    }

    const homeVip = document.getElementById("btn-loja-vip-home");
    if (homeVip) homeVip.remove();

    document.querySelectorAll("[data-vip-button]").forEach((el) => {
      el.href = url;
      el.textContent = vipStoreLabel || "LOJA VIP";
      el.classList.toggle("is-empty", !vipStoreUrl);
      bindVipClicks(el);
    });
    renderAdminBar();
  }

  function renderConnectBox() {
    const homeCard = document.querySelector("#inicio .card");
    if (!homeCard) return;
    const editing = document.body.classList.contains("editing") && me.canEdit;
    let box = document.getElementById("connect-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "connect-box";
      box.className = "connect-box";
      box.dataset.connectBox = "1";
      homeCard.appendChild(box);
      box.addEventListener("click", (e) => {
        if (e.target.closest("#btn-copy-connect")) copyConnect(e);
      });
      box.addEventListener("input", (e) => {
        if (e.target.id !== "connect-value") return;
        if (!document.body.classList.contains("editing") || !me.canEdit) return;
        connectText = e.target.value.trim();
        e.target.classList.toggle("is-empty", !connectText);
        scheduleSave();
      });
    }

    const current = box.querySelector("#connect-value");
    const hasInput = current && current.tagName === "INPUT";
    const keepFocus = document.activeElement && document.activeElement.id === "connect-value";
    if (!current || editing !== hasInput) {
      box.innerHTML = `
        <span class="connect-label">Connect</span>
        ${
          editing
            ? `<input class="connect-value" id="connect-value" type="text" spellcheck="false" placeholder="Cole ou escreva o connect" autocomplete="off">`
            : `<code class="connect-value" id="connect-value"></code>`
        }
        <button class="btn btn-copy" type="button" id="btn-copy-connect">Copiar</button>
      `;
    }

    const field = box.querySelector("#connect-value");
    const copyBtn = box.querySelector("#btn-copy-connect");
    if (field.tagName === "INPUT") {
      if (!keepFocus) field.value = connectText || "";
      field.readOnly = false;
      field.classList.toggle("is-empty", !connectText);
    } else {
      field.textContent = connectText || "Aguardando connect";
      field.classList.toggle("is-empty", !connectText);
    }
    copyBtn.disabled = !connectText;
    copyBtn.title = connectText ? "Copiar connect" : "Connect ainda não foi definido";
  }

  function syncConnectFromDom() {
    const field = document.getElementById("connect-value");
    if (!field || field.tagName !== "INPUT") return;
    connectText = field.value.trim();
  }

  async function copyConnect(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (document.body.classList.contains("editing") && me.canEdit) syncConnectFromDom();
    if (!connectText) return toast("Connect ainda não foi definido.");
    try {
      await navigator.clipboard.writeText(connectText);
      toast("Connect copiado");
    } catch {
      const area = document.createElement("textarea");
      area.value = connectText;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast("Connect copiado");
    }
  }

  async function editConnect() {
    const values = await openModal("Connect", [
      { name: "text", label: "Texto que o jogador vai copiar", value: connectText || "connect " },
    ]);
    if (!values) return;
    connectText = values.text || "";
    try {
      await persistSite({ connectText });
      toast(connectText ? "Connect salvo" : "Connect removido");
      renderConnectBox();
    } catch (err) {
      toast(err.message);
    }
  }

  async function persistSite(extra) {
    syncConnectFromDom();
    const html = document.body.classList.contains("editing") ? cleanHtml() : snapshot;
    const res = await fetch("/api/site", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        title: siteTitle,
        vipStoreUrl,
        vipStoreLabel,
        connectText,
        ...extra,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível salvar");
    if (data.vipStoreUrl != null) vipStoreUrl = data.vipStoreUrl;
    if (data.vipStoreLabel) vipStoreLabel = data.vipStoreLabel;
    if (data.connectText != null) connectText = data.connectText;
    snapshot = html;
    renderVipButtons();
    renderConnectBox();
    if (typeof calcular === "function") calcular();
    if (document.body.classList.contains("editing")) {
      setEditable(true);
      refreshChrome();
    }
    return data;
  }

  async function editVipLink() {
    const values = await openModal("Loja VIP", [
      { name: "url", label: "Cole ou escreva o link da loja", value: vipStoreUrl || "", placeholder: "https://..." },
      { name: "label", label: "Nome do botão (opcional)", value: vipStoreLabel || "LOJA VIP" },
    ]);
    if (!values) return;
    vipStoreUrl = values.url || "";
    vipStoreLabel = (values.label || "").trim() || "LOJA VIP";
    try {
      await persistSite({ vipStoreUrl, vipStoreLabel });
      toast(vipStoreUrl ? "Loja VIP atualizada" : "Link da Loja VIP removido");
      renderVipButtons();
    } catch (err) {
      toast(err.message);
    }
  }

  async function save() {
    try {
      await persistSite({});
      toast("Alterações salvas");
      exitEdit();
      renderVipButtons();
      renderConnectBox();
    } catch (err) {
      toast(err.message);
    }
  }

  function cancel() {
    if (!editBackup) {
      exitEdit();
      renderAdminBar();
      return;
    }
    clearTimeout(saveTimer);
    vipStoreUrl = editBackup.vipStoreUrl;
    vipStoreLabel = editBackup.vipStoreLabel;
    connectText = editBackup.connectText;
    siteTitle = editBackup.title;
    document.title = siteTitle;
    parkAdminBar();
    parkCalcFooter();
    document.getElementById("site-root").innerHTML = editBackup.html;
    snapshot = editBackup.html;
    editBackup = null;
    if (window.bootSiteRouting) window.bootSiteRouting();
    exitEdit();
    renderVipButtons();
    renderConnectBox();
    persistSite({})
      .then(() => toast("Alterações canceladas. Voltou ao que era antes."))
      .catch((err) => toast(err.message));
    renderAdminBar();
  }

  function enterEdit(silent) {
    if (!document.body.classList.contains("editing")) {
      parkAdminBar();
      parkCalcFooter();
      snapshot = document.getElementById("site-root").innerHTML;
      editBackup = {
        html: snapshot,
        vipStoreUrl,
        vipStoreLabel,
        connectText,
        title: siteTitle,
      };
      document.body.classList.add("editing");
    }
    setEditable(true);
    refreshChrome();
    renderConnectBox();
    if (!silent) toast("Use o + para adicionar e Remover para apagar. Os textos salvam sozinhos.");
  }

  function exitEdit() {
    syncConnectFromDom();
    document.body.classList.remove("editing");
    setEditable(false);
    stripChrome();
    if (selected) selected.classList.remove("is-selected");
    selected = null;
    renderConnectBox();
  }

  function editBlockFrom(node) {
    if (!node) return null;
    if (node.nodeType !== 1) node = node.parentElement;
    if (!node || !node.closest) return null;
    if (node.closest("#admin-bar, #modal, #staff-panel, #login-panel, #account-panel, #toast, [data-composer], [data-chrome]")) return null;
    return node.closest("#site-root p, #site-root li, #site-root h1, #site-root h2, #site-root h3, #site-root h4");
  }

  function placeCaretStart(el) {
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function splitBlockOnEnter(block) {
    const sel = window.getSelection();
    const isHeading = /^H[1-4]$/.test(block.tagName);
    const next = isHeading ? document.createElement("p") : block.cloneNode(false);

    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      if (block.contains(range.startContainer) || range.startContainer === block) {
        range.deleteContents();
        const tail = document.createRange();
        tail.selectNodeContents(block);
        tail.setStart(range.startContainer, range.startOffset);
        next.appendChild(tail.extractContents());
      }
    }

    if (!String(next.textContent || "").trim()) next.innerHTML = "<br>";
    if (!String(block.textContent || "").trim()) block.innerHTML = "<br>";

    block.after(next);
    next.contentEditable = "true";
    if (next.tagName === "P" && next.closest(".card")) mountLineTools(next);
    setEditable(true);
    selectEl(next);
    placeCaretStart(next);
    scheduleSave();
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!document.body.classList.contains("editing")) return;
      persistSite({}).catch((err) => toast(err.message));
    }, 1400);
  }

  function bindToolbar() {
    const root = document.getElementById("site-root");
    root.addEventListener("click", (e) => {
      if (!document.body.classList.contains("editing")) return;
      const plus = e.target.closest("[data-plus]");
      if (plus) {
        e.preventDefault();
        e.stopPropagation();
        handlePlus(plus);
        return;
      }
      const alignBtn = e.target.closest("[data-align-toggle]");
      if (alignBtn) {
        e.preventDefault();
        e.stopPropagation();
        const p = alignBtn.closest("p");
        if (p && p.parentElement && p.parentElement.classList.contains("card")) {
          setLineAlign(p, lineAlign(p) === "center" ? "start" : "center");
          persistAndRefresh();
        }
        return;
      }
      const rm = e.target.closest("[data-remove]");
      if (rm) {
        e.preventDefault();
        e.stopPropagation();
        handleRemove(rm);
        return;
      }
      if (e.target.closest("[data-login-button], [data-composer], #connect-box")) return;
      const img = e.target.closest("img.action-img, img.logo-img");
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        selectEl(img);
        editImageFor(img);
        return;
      }
      if (e.target.closest(".submenu a")) {
        setTimeout(refreshChrome, 50);
      }
      const btnLink = e.target.closest("a.btn");
      if (btnLink && e.detail === 2) {
        e.preventDefault();
        selectEl(btnLink);
        editLink();
        return;
      }
      const target = e.target.closest("a, .card, img, tr, h1, h2, h3, p, nav a");
      if (target && !target.closest("[data-vip-button], [data-chrome]")) selectEl(target);
      if (e.target.closest("a") && !e.target.closest(".submenu") && !e.target.closest("nav")) {
        e.preventDefault();
      }
    });

    root.addEventListener("input", (e) => {
      if (!document.body.classList.contains("editing")) return;
      if (e.target.closest && e.target.closest("[data-composer], [data-chrome], #modal")) return;
      scheduleSave();
    });

    root.addEventListener(
      "blur",
      (e) => {
        if (!document.body.classList.contains("editing")) return;
        const tr = e.target.closest && e.target.closest("tr.item-row");
        if (!tr) return;
        const tds = [...tr.querySelectorAll("td")].filter((td) => !td.dataset.chrome && !td.querySelector("input"));
        if (tds.length >= 2) {
          tr.dataset.com = String(parseMoney(tds[tds.length - 2].textContent));
          tr.dataset.sem = String(parseMoney(tds[tds.length - 1].textContent));
        }
        scheduleSave();
      },
      true
    );

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!document.body.classList.contains("editing")) return;
      if (e.target && e.target.closest && e.target.closest("input, textarea, select, #modal, #login-panel, #staff-panel, #account-panel, [data-composer], #connect-box")) return;
      const block = editBlockFrom(e.target) || editBlockFrom(window.getSelection() && window.getSelection().anchorNode);
      if (!block) return;
      e.preventDefault();
      splitBlockOnEnter(block);
    });

    window.addEventListener("hashchange", () => {
      if (document.body.classList.contains("editing")) setTimeout(refreshChrome, 50);
    });
  }

  function renderAdminBar() {
    const bar = document.getElementById("admin-bar");
    if (!bar) return;
    document.querySelectorAll("#btn-login-nav").forEach((el) => {
      if (!bar.contains(el)) el.remove();
    });

    if (!me.loggedIn) {
      if (me.authMode === "email") {
        bar.innerHTML = `<button class="btn-login-nav" type="button" id="btn-login-nav">Login</button>`;
      } else {
        bar.innerHTML = `<a class="btn-login-nav" id="btn-login-nav" href="/auth/discord">Login</a>`;
      }
      placeAdminBar();
      const loginBtn = document.getElementById("btn-login-nav");
      if (loginBtn && me.authMode === "email") {
        loginBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          openLoginPanel();
        };
      }
      return;
    }

    const role = me.isOwner ? " · dono" : me.canEdit ? " · admin" : "";
    const who = escapeHtml(`${me.username}${role}`);
    let extra = `
      <div class="admin-user" title="${who}">
        <img src="${escapeHtml(me.avatar)}" alt="${who}">
      </div>
    `;
    if (me.isOwner) {
      extra += `<button class="btn btn-ghost" type="button" id="btn-staff">Cadastros${
        me.pendingCount ? `<span class="badge">${me.pendingCount}</span>` : ""
      }</button>`;
    } else if (me.requestStatus === "pending") {
      extra += `<button class="btn btn-ghost" type="button" disabled>Pedido em análise</button>`;
    } else if (me.requestStatus === "refused") {
      extra += `<button class="btn btn-ghost" type="button" id="btn-request">Pedir de novo</button>`;
    } else if (!me.canEdit) {
      extra += `<button class="btn btn-ghost" type="button" id="btn-request">Pedir admin</button>`;
    }
    extra += `<button class="btn btn-ghost" type="button" id="btn-account">Conta</button>`;
    if (me.canEdit) {
      extra += `<button class="btn" type="button" id="btn-edit">${
        document.body.classList.contains("editing") ? "Concluir" : "Editar"
      }</button>`;
      if (document.body.classList.contains("editing")) {
        extra += `<button class="btn btn-ghost" type="button" id="btn-cancel">Cancelar</button>`;
      }
    }

    bar.innerHTML = `
      ${extra}
      <button class="btn btn-ghost" type="button" id="btn-logout">Sair</button>
    `;
    placeAdminBar();

    const requestBtn = document.getElementById("btn-request");
    if (requestBtn) requestBtn.onclick = requestAccess;
    const staffBtn = document.getElementById("btn-staff");
    if (staffBtn) staffBtn.onclick = openStaffPanel;
    const accountBtn = document.getElementById("btn-account");
    if (accountBtn) accountBtn.onclick = openAccountPanel;
    const editBtn = document.getElementById("btn-edit");
    if (editBtn) {
      editBtn.onclick = () => {
        if (document.body.classList.contains("editing")) {
          editBackup = null;
          exitEdit();
        } else enterEdit();
        renderAdminBar();
      };
    }
    const cancelBtn = document.getElementById("btn-cancel");
    if (cancelBtn) cancelBtn.onclick = cancel;
    document.getElementById("btn-logout").onclick = async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
      location.href = "/";
    };
    if (!me.canEdit && document.body.classList.contains("editing")) exitEdit();
  }

  async function refreshMe() {
    const meRes = await fetch("/api/me", { credentials: "include" });
    me = await meRes.json();
    renderAdminBar();
  }

  async function requestAccess() {
    const res = await fetch("/api/admin/request", { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || "Não foi possível enviar o pedido");
    toast("Pedido enviado. O dono vai aceitar ou recusar.");
    await refreshMe();
  }

  function openLoginPanel() {
    const panel = document.getElementById("login-panel");
    const error = document.getElementById("login-error");
    error.hidden = true;
    error.textContent = "";
    panel.hidden = false;
    const input = document.getElementById("login-email");
    input.value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("login-password-confirm").value = "";
    setTimeout(() => input.focus(), 0);
  }

  function closeLoginPanel() {
    document.getElementById("login-panel").hidden = true;
  }

  async function submitEmailLogin(event) {
    event.preventDefault();
    const error = document.getElementById("login-error");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    error.hidden = true;
    const res = await fetch("/auth/email", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      error.textContent = data.error || "Não foi possível entrar.";
      error.hidden = false;
      return;
    }
    closeLoginPanel();
    me = data.user || me;
    await refreshMe();
    if (me.mustChangePassword) {
      toast("Troque a senha provisória na sua conta.");
      openAccountPanel();
    } else if (me.isOwner || me.canEdit) toast("Login feito. Clique em Editar para alterar o site.");
    else if (me.requestStatus === "pending") toast("Login feito. Seu pedido de admin está em análise.");
    else toast("Login feito. Clique em Pedir admin para solicitar acesso.");
  }

  async function submitAccessRequest() {
    const error = document.getElementById("login-error");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const confirm = document.getElementById("login-password-confirm").value;
    error.hidden = true;
    if (!confirm) {
      error.textContent = "Confirme a senha para pedir acesso.";
      error.hidden = false;
      return;
    }
    if (password !== confirm) {
      error.textContent = "A confirmação da senha não confere.";
      error.hidden = false;
      return;
    }
    const res = await fetch("/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirm }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      error.textContent = data.error || "Não foi possível enviar o pedido.";
      error.hidden = false;
      return;
    }
    closeLoginPanel();
    me = data.user || me;
    await refreshMe();
    toast("Pedido enviado. O dono vai ver em Cadastros.");
  }

  function personRow(person, actionsHtml) {
    const when = person.requestedAt || person.approvedAt || "";
    const date = when ? new Date(when).toLocaleString("pt-BR") : "";
    const email = person.email || person.id || "";
    return `<div class="staff-row">
      <img src="${person.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}" alt="">
      <div class="meta">
        <strong>${escapeHtml(email || person.username || "Usuário")}</strong>
        <small>${escapeHtml(person.username || "")}${date ? " · " + date : ""}</small>
      </div>
      <div class="actions">${actionsHtml}</div>
    </div>`;
  }

  function fillStaffLists(data) {
    const pending = document.getElementById("staff-pending");
    const admins = document.getElementById("staff-admins");
    const refused = document.getElementById("staff-refused");
    const pendingList = Array.isArray(data.pending) ? data.pending : [];
    const adminList = Array.isArray(data.admins) ? data.admins : [];
    const refusedList = Array.isArray(data.refused) ? data.refused : [];
    pending.innerHTML = pendingList.length
      ? pendingList
          .map(
            (p) =>
              personRow(
                p,
                `<button class="btn btn-ok" type="button" data-act="accept" data-id="${encodeURIComponent(p.id)}">Aceitar</button>
                 <button class="btn btn-danger" type="button" data-act="refuse" data-id="${encodeURIComponent(p.id)}">Recusar</button>`
              )
          )
          .join("")
      : `<p class="staff-empty">Nenhum pedido pendente.</p>`;
    admins.innerHTML = adminList.length
      ? adminList
          .map(
            (p) =>
              personRow(
                p,
                `<button class="btn btn-danger" type="button" data-act="remove" data-id="${encodeURIComponent(p.id)}">Remover</button>`
              )
          )
          .join("")
      : `<p class="staff-empty">Nenhum admin aprovado ainda.</p>`;
    refused.innerHTML = refusedList.length
      ? refusedList.map((p) => personRow(p, "")).join("")
      : `<p class="staff-empty">Ninguém recusado.</p>`;
  }

  async function openStaffPanel() {
    const panel = document.getElementById("staff-panel");
    const res = await fetch("/api/admin/requests", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || "Não foi possível abrir os cadastros");
    fillStaffLists(data);
    panel.hidden = false;
  }

  async function staffAction(act, encodedId) {
    const id = decodeURIComponent(encodedId || "");
    let password = "";
    if (act === "accept") {
      const values = await openModal("Aceitar admin", [
        {
          name: "password",
          label: "Senha provisória (opcional). Vazio mantém a senha que a pessoa cadastrou",
          value: "",
          placeholder: "Ex.: zer01temp",
        },
      ]);
      if (!values) return;
      password = (values.password || "").trim();
    }
    const res = await fetch("/api/admin/decide", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: act === "remove" ? "remove" : act, id, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || "Não foi possível atualizar");
    fillStaffLists(data);
    if (data.provisionalPassword) {
      await openModal("Senha provisória", [
        { name: "password", label: "Envie esta senha para a pessoa. Ela poderá trocar depois em Conta", value: data.provisionalPassword },
      ]);
    } else {
      toast(act === "accept" ? "Admin aceito" : act === "refuse" ? "Pedido recusado" : "Admin removido");
    }
    await refreshMe();
  }

  function openAccountPanel() {
    const panel = document.getElementById("account-panel");
    const error = document.getElementById("account-error");
    const hint = document.getElementById("account-hint");
    error.hidden = true;
    error.textContent = "";
    document.getElementById("account-email").value = me.email || me.id || "";
    document.getElementById("account-current").value = "";
    document.getElementById("account-password").value = "";
    document.getElementById("account-password-confirm").value = "";
    hint.textContent = me.mustChangePassword
      ? "Você está com senha provisória. Troque a senha para continuar com segurança."
      : "Altere seu e-mail ou sua senha. A senha atual é obrigatória para confirmar.";
    document.getElementById("account-email").readOnly = Boolean(me.isOwner);
    panel.hidden = false;
    setTimeout(() => document.getElementById("account-current").focus(), 0);
  }

  function closeAccountPanel() {
    document.getElementById("account-panel").hidden = true;
  }

  async function submitAccount(event) {
    event.preventDefault();
    const error = document.getElementById("account-error");
    const email = document.getElementById("account-email").value.trim();
    const currentPassword = document.getElementById("account-current").value;
    const newPassword = document.getElementById("account-password").value;
    const confirm = document.getElementById("account-password-confirm").value;
    const currentEmail = String(me.email || me.id || "").toLowerCase();
    error.hidden = true;
    if (newPassword && newPassword !== confirm) {
      error.textContent = "A confirmação da nova senha não confere.";
      error.hidden = false;
      return;
    }
    const emailChanged = Boolean(email && email.toLowerCase() !== currentEmail && !me.isOwner);
    if (!newPassword && !emailChanged) {
      error.textContent = "Informe a nova senha ou um e-mail diferente.";
      error.hidden = false;
      return;
    }
    try {
      if (emailChanged) {
        const res = await fetch("/api/account/email", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newEmail: email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Não foi possível trocar o e-mail.");
        me = data.user || me;
      }
      if (newPassword) {
        const res = await fetch("/api/account/password", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Não foi possível trocar a senha.");
        me = data.user || me;
      }
      closeAccountPanel();
      await refreshMe();
      toast("Conta atualizada");
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    }
  }

  async function boot() {
    bindToolbar();
    document.getElementById("staff-close").onclick = () => {
      document.getElementById("staff-panel").hidden = true;
    };
    document.getElementById("staff-panel").addEventListener("click", (e) => {
      if (e.target.id === "staff-panel") document.getElementById("staff-panel").hidden = true;
      const btn = e.target.closest("button[data-act]");
      if (btn) staffAction(btn.dataset.act, btn.dataset.id);
    });
    document.getElementById("login-close").onclick = closeLoginPanel;
    document.getElementById("login-panel").addEventListener("click", (e) => {
      if (e.target.id === "login-panel") closeLoginPanel();
    });
    document.getElementById("login-form").addEventListener("submit", submitEmailLogin);
    document.getElementById("login-request").onclick = submitAccessRequest;
    document.getElementById("account-close").onclick = closeAccountPanel;
    document.getElementById("account-panel").addEventListener("click", (e) => {
      if (e.target.id === "account-panel") closeAccountPanel();
    });
    document.getElementById("account-form").addEventListener("submit", submitAccount);

    const [meRes, siteRes] = await Promise.all([
      fetch("/api/me", { credentials: "include" }),
      fetch("/api/site"),
    ]);
    me = await meRes.json();
    const site = await siteRes.json();
    siteTitle = site.title || document.title;
    vipStoreUrl = site.vipStoreUrl || "";
    vipStoreLabel = site.vipStoreLabel || "LOJA VIP";
    connectText = site.connectText || "";
    document.title = siteTitle;
    document.getElementById("site-root").innerHTML = site.html || "";
    snapshot = site.html || "";
    if (window.bootSiteRouting) window.bootSiteRouting();
    renderVipButtons();
    renderConnectBox();
    if (me.mustChangePassword) openAccountPanel();

    const params = new URLSearchParams(location.search);
    if (params.get("login") === "ok") {
      if (me.isOwner || me.canEdit) toast("Login feito. Clique em Editar para alterar o site.");
      else if (me.requestStatus === "pending") toast("Login feito. Seu pedido de admin está em análise.");
      else toast("Login feito. Clique em Pedir admin para solicitar acesso.");
      history.replaceState({}, "", "/");
    }
    if (params.get("login") === "erro") {
      toast("Falha no login Discord. Confira o Client ID/Secret e o Redirect URL.");
      history.replaceState({}, "", "/");
    }
    if (params.get("login") === "email") {
      openLoginPanel();
      history.replaceState({}, "", "/");
    }
  }

  window.Zer01Editor = { boot, toast };
})();
