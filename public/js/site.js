function handleRouting() {
    let hash = window.location.hash || "#inicio";
    let mainTabId = hash.split("-")[0].replace("#", "");
    if (!document.getElementById(mainTabId)) mainTabId = "inicio";

    document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll("nav a:not([data-vip-button]):not([data-login-button])").forEach((link) => link.classList.remove("active"));

    const targetTab = document.getElementById(mainTabId);
    if (targetTab) {
        targetTab.classList.add("active");
        const navLink = document.querySelector(`nav a[href="#${mainTabId}"]`);
        if (navLink) navLink.classList.add("active");

        const firstSubLink = targetTab.querySelector(".submenu a");
        const activeSub = targetTab.querySelector(".subtab-content.active");
        if (firstSubLink && !activeSub) firstSubLink.click();
    }

    ensureCalcFooter();
    const calcFooter = document.getElementById("calcFooter");
    if (calcFooter) calcFooter.style.display = mainTabId === "precos" ? "block" : "none";
    calcular();
}

function openSubTab(subTabId) {
    const targetContent = document.getElementById(subTabId);
    if (!targetContent) return;

    const parentTab = targetContent.closest(".tab-content");
    if (!parentTab) return;

    parentTab.querySelectorAll(".subtab-content").forEach((content) => content.classList.remove("active"));
    const topMenu = parentTab.querySelector(":scope > .submenu");
    if (topMenu) topMenu.querySelectorAll("a").forEach((link) => link.classList.remove("active"));

    targetContent.classList.add("active");
    const ev = window.event;
    if (ev && ev.currentTarget) ev.currentTarget.classList.add("active");

    const firstSubSub = targetContent.querySelector(".submenu a");
    if (firstSubSub) firstSubSub.click();

    if (typeof calcular === "function") calcular();
}

function openSubSubTab(subSubTabId) {
    const targetContent = document.getElementById(subSubTabId);
    if (!targetContent) return;

    const parentSubTab = targetContent.closest(".subtab-content");
    if (!parentSubTab) return;

    parentSubTab.querySelectorAll(".subsubtab-content").forEach((content) => content.classList.remove("active"));
    parentSubTab.querySelectorAll(".submenu a").forEach((link) => link.classList.remove("active"));

    targetContent.classList.add("active");
    const ev = window.event;
    if (ev && ev.currentTarget) ev.currentTarget.classList.add("active");

    if (typeof calcular === "function") calcular();
}

function formatBRL(n) {
    return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itemName(row) {
    const strong = row.querySelector("td strong, strong");
    const td = row.querySelectorAll("td")[1];
    const text = (strong && strong.textContent) || (td && td.textContent) || "Item";
    return String(text).replace(/\s+/g, " ").trim() || "Item";
}

function selectedCalcRows() {
    const seen = new Set();
    const rows = [];
    document.querySelectorAll(".tab-content.active .item-row, .subtab-content.active .item-row, .subsubtab-content.active .item-row").forEach((row) => {
        if (seen.has(row) || !row.closest(".active")) return;
        seen.add(row);
        const sel = row.querySelector(".sel");
        if (sel && sel.checked) rows.push(row);
    });
    return rows;
}

let calcItemsById = new Map();

function ensureCalcFooter() {
    let footer = document.getElementById("calcFooter");
    if (!footer) {
        footer = document.createElement("div");
        footer.id = "calcFooter";
        footer.className = "calculator-footer";
        footer.style.display = "none";
        document.body.appendChild(footer);
    }
    if (footer.parentElement !== document.body) document.body.appendChild(footer);

    if (!document.getElementById("calcItems")) {
        const head = document.createElement("div");
        head.className = "calc-head";
        head.textContent = "Resumo";
        const list = document.createElement("ul");
        list.id = "calcItems";
        list.className = "calc-items";
        const empty = document.createElement("p");
        empty.id = "calcEmpty";
        empty.className = "calc-empty";
        empty.textContent = "Nenhum item selecionado.";
        footer.prepend(empty);
        footer.prepend(list);
        footer.prepend(head);
    }
    if (!document.getElementById("resTotalCom") || !document.getElementById("resTotalSem")) {
        footer.querySelectorAll(".calc-row").forEach((el) => el.remove());
        footer.insertAdjacentHTML(
            "beforeend",
            `<div class="calc-row"><span class="calc-label">Total Mínimo:</span><span id="resTotalCom">R$ 0,00</span></div>
             <div class="calc-row"><span class="calc-label">Total Máximo:</span><span id="resTotalSem">R$ 0,00</span></div>`
        );
    }
    if (!document.getElementById("calcClear")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "calcClear";
        btn.className = "calc-clear";
        btn.textContent = "Limpar tudo";
        btn.hidden = true;
        footer.appendChild(btn);
    }
    return footer;
}

function renderCalcItems(items) {
    const list = document.getElementById("calcItems");
    const empty = document.getElementById("calcEmpty");
    const clear = document.getElementById("calcClear");
    if (!list) return;
    list.innerHTML = "";
    items.forEach((item) => {
        const li = document.createElement("li");
        li.className = "calc-item";
        const info = document.createElement("div");
        info.className = "calc-item-info";
        const name = document.createElement("span");
        name.className = "calc-item-name";
        name.textContent = item.q + "× " + item.name;
        const price = document.createElement("span");
        price.className = "calc-item-price";
        price.textContent = formatBRL(item.com) + " – " + formatBRL(item.sem);
        info.append(name, price);
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "calc-item-remove";
        rm.dataset.calcRemove = item.id;
        rm.textContent = "Remover";
        li.append(info, rm);
        list.appendChild(li);
    });
    if (empty) empty.hidden = items.length > 0;
    if (clear) clear.hidden = items.length === 0;
}

function removeCalcItem(id) {
    const row = calcItemsById.get(id);
    if (!row) return;
    const sel = row.querySelector(".sel");
    if (sel) sel.checked = false;
    calcular();
}

function clearCalc() {
    document.querySelectorAll(".item-row .sel").forEach((cb) => {
        cb.checked = false;
    });
    calcular();
}

function calcular() {
    ensureCalcFooter();
    calcItemsById = new Map();
    let totalCom = 0;
    let totalSem = 0;
    const items = [];
    selectedCalcRows().forEach((row, index) => {
        const qtd = row.querySelector(".qtd");
        const q = parseInt(qtd && qtd.value, 10) || 0;
        const unitCom = parseFloat(row.dataset.com) || 0;
        const unitSem = parseFloat(row.dataset.sem) || 0;
        totalCom += q * unitCom;
        totalSem += q * unitSem;
        const id = "c" + index;
        calcItemsById.set(id, row);
        items.push({
            id,
            name: itemName(row),
            q,
            com: q * unitCom,
            sem: q * unitSem,
        });
    });
    const com = document.getElementById("resTotalCom");
    const sem = document.getElementById("resTotalSem");
    if (com) com.innerText = formatBRL(totalCom);
    if (sem) sem.innerText = formatBRL(totalSem);
    renderCalcItems(items);
}

function bootSiteRouting() {
    window.removeEventListener("hashchange", handleRouting);
    window.addEventListener("hashchange", handleRouting);
    if (!window.__calcBound) {
        window.__calcBound = true;
        document.addEventListener("input", function (e) {
            if (e.target.classList.contains("sel") || e.target.classList.contains("qtd")) calcular();
        });
        document.addEventListener("change", function (e) {
            if (e.target.classList.contains("sel") || e.target.classList.contains("qtd")) calcular();
        });
        document.addEventListener("click", function (e) {
            const rm = e.target.closest("[data-calc-remove]");
            if (rm) {
                e.preventDefault();
                removeCalcItem(rm.dataset.calcRemove);
                return;
            }
            if (e.target.closest("#calcClear")) {
                e.preventDefault();
                clearCalc();
            }
        });
    }
    ensureCalcFooter();
    if (!window.location.hash) window.location.hash = "#inicio";
    handleRouting();
}

window.handleRouting = handleRouting;
window.openSubTab = openSubTab;
window.openSubSubTab = openSubSubTab;
window.calcular = calcular;
window.bootSiteRouting = bootSiteRouting;
