function handleRouting() {
    let hash = window.location.hash || "#inicio";
    let mainTabId = hash.split("-")[0].replace("#", "");
    if (!document.getElementById(mainTabId)) mainTabId = "inicio";

    document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll("nav a:not([data-vip-button])").forEach((link) => link.classList.remove("active"));

    const targetTab = document.getElementById(mainTabId);
    if (targetTab) {
        targetTab.classList.add("active");
        const navLink = document.querySelector(`nav a[href="#${mainTabId}"]`);
        if (navLink) navLink.classList.add("active");

        const firstSubLink = targetTab.querySelector(".submenu a");
        const activeSub = targetTab.querySelector(".subtab-content.active");
        if (firstSubLink && !activeSub) firstSubLink.click();
    }

    const calcFooter = document.getElementById("calcFooter");
    if (calcFooter) calcFooter.style.display = mainTabId === "precos" ? "block" : "none";
    if (typeof calcular === "function") calcular();
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

function calcular() {
    let totalCom = 0, totalSem = 0;
    document.querySelectorAll(".tab-content.active .item-row, .subtab-content.active .item-row, .subsubtab-content.active .item-row").forEach((row) => {
        const sel = row.querySelector(".sel");
        const qtd = row.querySelector(".qtd");
        if (sel && sel.checked && row.closest(".active")) {
            const q = parseInt(qtd && qtd.value, 10) || 0;
            totalCom += q * (parseFloat(row.dataset.com) || 0);
            totalSem += q * (parseFloat(row.dataset.sem) || 0);
        }
    });
    const com = document.getElementById("resTotalCom");
    const sem = document.getElementById("resTotalSem");
    if (com) com.innerText = totalCom.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
    if (sem) sem.innerText = totalSem.toLocaleString("pt-br", { style: "currency", currency: "BRL" });
}

function bootSiteRouting() {
    window.removeEventListener("hashchange", handleRouting);
    window.addEventListener("hashchange", handleRouting);
    document.addEventListener("input", function (e) {
        if (e.target.classList.contains("sel") || e.target.classList.contains("qtd")) calcular();
    });
    if (!window.location.hash) window.location.hash = "#inicio";
    handleRouting();
}

window.handleRouting = handleRouting;
window.openSubTab = openSubTab;
window.openSubSubTab = openSubSubTab;
window.calcular = calcular;
window.bootSiteRouting = bootSiteRouting;
