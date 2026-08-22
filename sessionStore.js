(function () {
  const TEXT_TAGS = "h1,h2,h3,h4,p,span,strong,em,a,td,th,label,li";
  let snapshot = "";
  let selected = null;
  let me = { loggedIn: false, canEdit: false };
  let siteTitle = document.title;
  let vipStoreUrl = "";
  let connectText = "";

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (el.style.display = "none"), 2800);
  }

  function activePane() {
    return (
      document.querySelector(".subsubtab-content.active") ||
      document.querySelector(".subtab-content.active") ||
      document.querySelector(".tab-content.active") ||
      document.querySelector(".container")
    );
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
      if (el.closest(".calculator-footer")) return;
      if (el.tagName === "A" && !on) el.removeAttribute("contenteditable");
      else el.contentEditable = on ? "true" : "false";
    });
  }

  function openModal(title, fields) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById("modal");
      document.getElementById("modal-title").textContent = title;
      const box = document.getElementById("modal-fields");
      box.innerHTML = fields
        .map(
          (f) =>
            `<label>${f.label}</label><input id="f-${f.name}" value="${String(f.value || "").replace(/"/g, "&quot;")}">`
        )
        .join("");
      backdrop.classList.add("open");
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

  async function uploadImage() {
    const file = await pickFile();
    if (!file) {
      const values = await openModal("URL da imagem", [
        { name: "url", label: "Link da foto ou logo", value: "" },
      ]);
      return values && values.url;
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha no upload");
    return data.url;
  }

  async function addCard() {
    const pane = activePane();
    if (!pane) return;
    const values = await openModal("Nova caixa", [
      { name: "title", label: "Título", value: "Nova caixa" },
      { name: "body", label: "Texto", value: "Clique para editar este texto." },
    ]);
    if (!values) return;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>${values.title}</h3><p>${values.body}</p>`;
    pane.appendChild(card);
    setEditable(true);
    selectEl(card);
  }

  async function addButton() {
    const pane = activePane();
    if (!pane) return;
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
    const wrap = document.createElement("div");
    wrap.className = "card";
    wrap.style.textAlign = "center";
    wrap.appendChild(a);
    pane.appendChild(wrap);
    setEditable(true);
    selectEl(a);
  }

  async function addImage() {
    const pane = activePane();
    if (!pane) return;
    try {
      const url = await uploadImage();
      if (!url) return;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `<img src="${url}" alt="Imagem" class="action-img">`;
      pane.appendChild(card);
      selectEl(card.querySelector("img"));
    } catch (err) {
      toast(err.message);
    }
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
    nav.appendChild(a);
    const container = document.querySelector(".container");
    const page = document.createElement("div");
    page.id = id;
    page.className = "tab-content";
    page.innerHTML = `<h1>${values.label}</h1><div class="card"><p>Nova página. Edite este texto, acrescente caixas, botões e fotos.</p></div>`;
    container.appendChild(page);
    location.hash = `#${id}`;
    setEditable(true);
    if (window.handleRouting) window.handleRouting();
  }

  async function addSubtab() {
    const page = document.querySelector(".tab-content.active");
    if (!page) return toast("Abra uma aba principal primeiro");
    const values = await openModal("Nova subaba", [{ name: "label", label: "Nome", value: "Nova seção" }]);
    if (!values) return;
    const id = uniqueId(slug(values.label));
    let menu = page.querySelector(":scope > .submenu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "submenu";
      page.insertBefore(menu, page.querySelector("h1") ? page.querySelector("h1").nextSibling : page.firstChild);
    }
    const a = document.createElement("a");
    a.setAttribute("onclick", `openSubTab('${id}')`);
    a.textContent = values.label;
    menu.appendChild(a);
    const pane = document.createElement("div");
    pane.id = id;
    pane.className = "subtab-content";
    pane.innerHTML = `<div class="card"><h3>${values.label}</h3><p>Conteúdo da nova seção.</p></div>`;
    page.appendChild(pane);
    a.click();
    setEditable(true);
  }

  function addRow() {
    const table =
      document.querySelector(".subsubtab-content.active table tbody") ||
      document.querySelector(".subtab-content.active table tbody") ||
      document.querySelector(".tab-content.active table tbody");
    if (!table) return toast("Abra uma tabela de preços primeiro");
    const tr = document.createElement("tr");
    tr.className = "item-row";
    tr.dataset.com = "0";
    tr.dataset.sem = "0";
    tr.innerHTML = `<td><input type="checkbox" class="sel"></td><td><strong>Novo item</strong></td><td><input type="number" class="qtd" value="1" min="1"></td><td>R$ 0</td><td>R$ 0</td>`;
    table.appendChild(tr);
    setEditable(true);
    selectEl(tr);
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
  }

  async function editLogo() {
    try {
      const url = await uploadImage();
      if (!url) return;
      const selectedImg = selected && selected.tagName === "IMG" ? selected : null;
      if (selectedImg) {
        selectedImg.src = url;
        return;
      }
      let img = document.querySelector(".logo-img");
      if (!img) {
        const box = document.createElement("div");
        box.className = "logo-container";
        box.innerHTML = `<img src="${url}" alt="Logo" class="logo-img">`;
        const container = document.querySelector(".container");
        container.insertBefore(box, container.firstChild);
      } else {
        img.src = url;
      }
    } catch (err) {
      toast(err.message);
    }
  }

  function deleteSelected() {
    if (!selected) return toast("Clique no item que deseja apagar");
    if (selected.classList.contains("logo-img") || selected.classList.contains("nav-container")) {
      return toast("Esse item não pode ser apagado assim");
    }
    if (selected.matches("nav a")) {
      const href = selected.getAttribute("href") || "";
      const id = href.replace("#", "");
      const page = document.getElementById(id);
      if (page) page.remove();
    }
    const onclick = selected.getAttribute && selected.getAttribute("onclick");
    if (onclick && onclick.includes("openSubTab")) {
      const m = onclick.match(/openSubTab\('([^']+)'\)/);
      if (m && document.getElementById(m[1])) document.getElementById(m[1]).remove();
    }
    selected.remove();
    selected = null;
  }

  function cleanHtml() {
    const root = document.getElementById("site-root");
    root.querySelectorAll(".is-selected").forEach((el) => el.classList.remove("is-selected"));
    root.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
    root.querySelectorAll("[data-vip-button], [data-connect-box]").forEach((el) => el.remove());
    return root.innerHTML;
  }

  function bindVipClicks(el) {
    el.addEventListener("click", (e) => {
      if (document.body.classList.contains("editing") || !vipStoreUrl) {
        e.preventDefault();
        if (me.canEdit) editVipLink();
        else toast("Loja VIP em breve.");
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
      a.textContent = "LOJA VIP";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      nav.appendChild(a);
      bindVipClicks(a);
    }

    const homeCard = document.querySelector("#inicio .card");
    if (homeCard && !document.getElementById("btn-loja-vip-home")) {
      const a = document.createElement("a");
      a.id = "btn-loja-vip-home";
      a.className = "btn btn-loja-vip-home";
      a.dataset.vipButton = "1";
      a.textContent = "LOJA VIP";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      homeCard.appendChild(a);
      bindVipClicks(a);
    }

    document.querySelectorAll("[data-vip-button]").forEach((el) => {
      el.href = url;
      el.classList.toggle("is-empty", !vipStoreUrl);
    });
  }

  function renderConnectBox() {
    const homeCard = document.querySelector("#inicio .card");
    if (!homeCard) return;
    let box = document.getElementById("connect-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "connect-box";
      box.className = "connect-box";
      box.dataset.connectBox = "1";
      box.innerHTML = `
        <span class="connect-label">Connect</span>
        <code class="connect-value" id="connect-value"></code>
        <button class="btn btn-copy" type="button" id="btn-copy-connect">Copiar</button>
      `;
      homeCard.appendChild(box);
      box.querySelector("#btn-copy-connect").addEventListener("click", copyConnect);
    }
    const value = box.querySelector("#connect-value");
    const copyBtn = box.querySelector("#btn-copy-connect");
    const text = connectText || "Aguardando connect";
    value.textContent = text;
    value.classList.toggle("is-empty", !connectText);
    copyBtn.disabled = !connectText;
  }

  async function copyConnect() {
    if (!connectText) {
      if (me.canEdit) return editConnect();
      return toast("Connect ainda não foi definido.");
    }
    try {
      await navigator.clipboard.writeText(connectText);
      toast("Connect copiado");
    } catch {
      const area = document.createElement("textarea");
      area.value = connectText;
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
    const html = document.body.classList.contains("editing") ? cleanHtml() : snapshot;
    const res = await fetch("/api/site", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        title: siteTitle,
        vipStoreUrl,
        connectText,
        ...extra,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível salvar");
    if (data.vipStoreUrl != null) vipStoreUrl = data.vipStoreUrl;
    if (data.connectText != null) connectText = data.connectText;
    snapshot = html;
    renderVipButtons();
    renderConnectBox();
    if (document.body.classList.contains("editing")) setEditable(true);
    return data;
  }

  async function editVipLink() {
    const values = await openModal("Link da Loja VIP", [
      { name: "url", label: "Cole o link da loja", value: vipStoreUrl || "https://" },
    ]);
    if (!values) return;
    vipStoreUrl = values.url || "";
    try {
      await persistSite({ vipStoreUrl });
      toast(vipStoreUrl ? "Link da Loja VIP salvo" : "Link da Loja VIP removido");
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
    document.getElementById("site-root").innerHTML = snapshot;
    if (window.bootSiteRouting) window.bootSiteRouting();
    exitEdit();
    renderVipButtons();
    renderConnectBox();
  }

  function enterEdit() {
    snapshot = document.getElementById("site-root").innerHTML;
    document.body.classList.add("editing");
    setEditable(true);
    toast("Modo edição: clique nos textos, fotos e botões");
  }

  function exitEdit() {
    document.body.classList.remove("editing");
    setEditable(false);
    if (selected) selected.classList.remove("is-selected");
    selected = null;
  }

  function bindToolbar() {
    document.getElementById("editor-toolbar").addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const action = btn.dataset.action;
      const map = {
        save,
        cancel,
        "add-card": addCard,
        "add-button": addButton,
        "add-image": addImage,
        "add-tab": addTab,
        "add-subtab": addSubtab,
        "add-row": addRow,
        "edit-link": editLink,
        "edit-logo": editLogo,
        "loja-vip": editVipLink,
        connect: editConnect,
        delete: deleteSelected,
      };
      if (map[action]) map[action]();
    });

    document.getElementById("site-root").addEventListener("click", (e) => {
      if (!document.body.classList.contains("editing")) return;
      const target = e.target.closest("a, .card, img, tr, h1, h2, h3, p, nav a");
      if (target) selectEl(target);
      if (e.target.closest("a") && !e.target.closest(".submenu") && !e.target.closest("nav")) {
        e.preventDefault();
      }
      if (e.target.closest("img.action-img, img.logo-img") && e.detail === 2) {
        e.preventDefault();
        selectEl(e.target);
        editLogoFor(e.target);
      }
    });
  }

  async function editLogoFor(img) {
    try {
      const url = await uploadImage();
      if (url) img.src = url;
    } catch (err) {
      toast(err.message);
    }
  }

  function renderAdminBar() {
    const bar = document.getElementById("admin-bar");
    if (!me.loggedIn) {
      bar.innerHTML = `<a class="btn btn-discord" href="/auth/discord">Admin</a>`;
      return;
    }

    let extra = "";
    if (me.canEdit) {
      extra += `<button class="btn" type="button" id="btn-edit">Editar</button>`;
      extra += `<button class="btn btn-ghost" type="button" id="btn-vip">Loja VIP</button>`;
      extra += `<button class="btn btn-ghost" type="button" id="btn-connect">Connect</button>`;
    }
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

    bar.innerHTML = `
      ${extra}
      <div class="admin-user">
        <img src="${me.avatar}" alt="">
        <span>${me.username}${me.isOwner ? " · dono" : me.canEdit ? " · admin" : ""}</span>
      </div>
      <button class="btn btn-ghost" type="button" id="btn-logout">Sair</button>
    `;

    const edit = document.getElementById("btn-edit");
    if (edit) {
      edit.onclick = () => {
        if (document.body.classList.contains("editing")) exitEdit();
        else enterEdit();
      };
    }
    const vipBtn = document.getElementById("btn-vip");
    if (vipBtn) vipBtn.onclick = editVipLink;
    const connectBtn = document.getElementById("btn-connect");
    if (connectBtn) connectBtn.onclick = editConnect;
    const requestBtn = document.getElementById("btn-request");
    if (requestBtn) requestBtn.onclick = requestAccess;
    const staffBtn = document.getElementById("btn-staff");
    if (staffBtn) staffBtn.onclick = openStaffPanel;
    document.getElementById("btn-logout").onclick = async () => {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
      location.href = "/";
    };
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

  function personRow(person, actionsHtml) {
    const when = person.requestedAt || person.approvedAt || "";
    const date = when ? new Date(when).toLocaleString("pt-BR") : "";
    return `<div class="staff-row">
      <img src="${person.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}" alt="">
      <div class="meta">
        <strong>${person.username || "Usuário"}</strong>
        <small>${person.id}${date ? " · " + date : ""}</small>
      </div>
      <div class="actions">${actionsHtml}</div>
    </div>`;
  }

  function fillStaffLists(data) {
    const pending = document.getElementById("staff-pending");
    const admins = document.getElementById("staff-admins");
    const refused = document.getElementById("staff-refused");
    pending.innerHTML = data.pending.length
      ? data.pending
          .map(
            (p) =>
              personRow(
                p,
                `<button class="btn btn-ok" type="button" data-act="accept" data-id="${p.id}">Aceitar</button>
                 <button class="btn btn-danger" type="button" data-act="refuse" data-id="${p.id}">Recusar</button>`
              )
          )
          .join("")
      : `<p class="staff-empty">Nenhum pedido pendente.</p>`;
    admins.innerHTML = data.admins.length
      ? data.admins
          .map(
            (p) =>
              personRow(
                p,
                `<button class="btn btn-danger" type="button" data-act="remove" data-id="${p.id}">Remover</button>`
              )
          )
          .join("")
      : `<p class="staff-empty">Nenhum admin aprovado ainda.</p>`;
    refused.innerHTML = data.refused.length
      ? data.refused.map((p) => personRow(p, "")).join("")
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

  async function staffAction(act, id) {
    const routes = {
      accept: `/api/admin/requests/${id}/accept`,
      refuse: `/api/admin/requests/${id}/refuse`,
      remove: `/api/admin/admins/${id}/remove`,
    };
    const res = await fetch(routes[act], { method: "POST", credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || "Não foi possível atualizar");
    fillStaffLists(data);
    toast(act === "accept" ? "Admin aceito" : act === "refuse" ? "Pedido recusado" : "Admin removido");
    await refreshMe();
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

    const [meRes, siteRes] = await Promise.all([
      fetch("/api/me", { credentials: "include" }),
      fetch("/api/site"),
    ]);
    me = await meRes.json();
    const site = await siteRes.json();
    siteTitle = site.title || document.title;
    vipStoreUrl = site.vipStoreUrl || "";
    connectText = site.connectText || "";
    document.title = siteTitle;
    document.getElementById("site-root").innerHTML = site.html || "";
    snapshot = site.html || "";
    renderAdminBar();
    if (window.bootSiteRouting) window.bootSiteRouting();
    renderVipButtons();
    renderConnectBox();

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
  }

  window.Zer01Editor = { boot, toast };
})();
