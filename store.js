:root {
    --primary: #3b82f6;
    --bg: #050505;
    --surface: #121212;
    --glass: rgba(255, 255, 255, 0.03);
    --text-main: #ffffff;
    --text-dim: #a0a0a0;
    --green: #22c55e;
    --red: #ef4444;
    --yellow: #fffb00;
    --blue: #1900ff;
    --purple: #7700ff;
    --discord: #5865F2;
    --transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: 'Inter', sans-serif;
    background-color: var(--bg);
    color: var(--text-main);
    line-height: 1.6;
    overflow-x: hidden;
}

nav {
    position: fixed;
    top: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 20px;
    background: rgba(5, 5, 5, 0.9);
    backdrop-filter: blur(10px);
    z-index: 1000;
}

.nav-container {
    display: flex;
    gap: 10px;
    background: var(--glass);
    padding: 5px;
    border-radius: 50px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-wrap: wrap;
    justify-content: center;
}

nav a {
    color: var(--text-dim);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 10px 20px;
    border-radius: 50px;
    cursor: pointer;
    transition: var(--transition);
}

nav a:hover { color: white; }
nav a.active { background: white; color: black; }

.container {
    max-width: 1000px;
    margin: 120px auto 50px;
    padding: 0 20px;
}

.tab-content, .subtab-content, .subsubtab-content { display: none; }
.tab-content.active, .subtab-content.active, .subsubtab-content.active { display: block; animation: fadeIn 0.5s; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.logo-container { text-align: center; margin-bottom: 30px; }
.logo-img { max-width: 200px; height: auto; }

h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -1px; text-align: center; margin-bottom: 10px; }
h2 { font-size: 1.2rem; margin-bottom: 30px; text-align: center; color: var(--text-dim); }

.card {
    background: var(--surface);
    padding: 30px;
    border-radius: 20px;
    margin-bottom: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
}

.action-img {
    max-width: 100%;
    border-radius: 15px;
    margin-top: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.submenu {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 30px;
    flex-wrap: wrap;
}
.submenu a {
    background: var(--surface);
    color: var(--text-dim);
    padding: 10px 20px;
    border-radius: 10px;
    text-decoration: none;
    font-size: 0.8rem;
    border: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: var(--transition);
}
.submenu a:hover { background: #1a1a1a; color: white; }
.submenu a.active { background: var(--primary); color: white; }

table { width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-top: 15px; }
th { padding: 15px 20px; color: var(--text-dim); font-size: 0.75rem; text-transform: uppercase; text-align: left; }
td { padding: 15px 20px; background: var(--surface); border-top: 1px solid rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
td:first-child { border-left: 1px solid rgba(255, 255, 255, 0.03); border-radius: 12px 0 0 12px; }
td:last-child { border-right: 1px solid rgba(255, 255, 255, 0.03); border-radius: 0 12px 12px 0; }

input[type="number"] { background: #1a1a1a; border: 1px solid #333; color: white; padding: 5px; border-radius: 6px; width: 50px; }
input[type="checkbox"] { accent-color: var(--primary); width: 16px; height: 16px; }

.calculator-footer {
    position: fixed; bottom: 20px; right: 20px;
    background: #1a1a1a; color: white;
    padding: 20px; border-radius: 15px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    font-weight: 700; z-index: 100;
    border: 1px solid rgba(255,255,255,0.1);
    min-width: 250px;
}
.calc-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
.calc-label { color: var(--text-dim); font-size: 0.8rem; }
.calc-total { color: var(--green); margin-top: 5px; padding-top: 5px; border-top: 1px solid #333; }

.btn {
    background: var(--primary); color: white; padding: 15px 30px;
    border-radius: 50px; text-decoration: none; font-weight: 700; display: inline-block;
    transition: var(--transition); border: none; cursor: pointer; font-family: inherit;
}
.btn:hover { filter: brightness(1.2); }
.btn-discord { background: var(--discord); }
.btn-loja-vip,
.btn-loja-vip-home {
    background: linear-gradient(135deg, #f59e0b, #eab308);
    color: #111;
    font-weight: 800;
    letter-spacing: 0.08em;
}
.btn-loja-vip {
    padding: 10px 18px;
    border-radius: 50px;
    text-decoration: none;
    font-size: 0.8rem;
    display: inline-flex;
    align-items: center;
}
#inicio .card .btn { margin: 6px; }
.btn-loja-vip.is-empty,
.btn-loja-vip-home.is-empty {
    opacity: 0.7;
}

.connect-box {
    margin-top: 22px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    justify-content: center;
    background: #0b0b0b;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 14px 16px;
}
.connect-box .connect-label {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
}
.connect-box .connect-value {
    font-family: ui-monospace, "Courier New", monospace;
    font-size: 0.95rem;
    color: #fff;
    background: #161616;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 10px 14px;
    min-width: min(100%, 280px);
    flex: 1;
    text-align: left;
    word-break: break-all;
}
.connect-box .connect-value.is-empty { color: #666; }
.connect-box .btn-copy { background: #1d4ed8; padding: 10px 18px; font-size: 0.8rem; }
.btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: white; padding: 10px 16px; font-size: 0.8rem; }
.btn-danger { background: #7f1d1d; }
.btn-ok { background: var(--green); color: #052e16; }

#admin-bar {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 3000;
    display: flex;
    align-items: center;
    gap: 8px;
}

#admin-bar .admin-user {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(15,15,15,0.92);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    padding: 6px 10px 6px 6px;
}

#admin-bar img {
    width: 28px;
    height: 28px;
    border-radius: 50%;
}

#admin-bar span { font-size: 0.75rem; font-weight: 600; }

#editor-toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 24px;
    z-index: 4000;
    display: none;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    background: rgba(10,10,10,0.96);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    padding: 12px;
    max-width: 960px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.45);
}

body.editing #editor-toolbar { display: flex; }
body.editing { padding-bottom: 120px; }
body.editing nav { top: 0; }

body.editing [contenteditable="true"] {
    outline: 1px dashed rgba(59,130,246,0.45);
    outline-offset: 3px;
    min-height: 1em;
}

body.editing .card:hover,
body.editing .logo-img:hover,
body.editing .action-img:hover,
body.editing .btn:hover,
body.editing nav a:hover,
body.editing .submenu a:hover {
    outline: 2px solid var(--primary);
}

body.editing .is-selected {
    outline: 2px solid #22c55e !important;
}

#toast {
    position: fixed;
    top: 80px;
    right: 16px;
    z-index: 5000;
    background: #111;
    border: 1px solid rgba(255,255,255,0.12);
    padding: 12px 16px;
    border-radius: 12px;
    display: none;
    font-size: 0.85rem;
}

.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 4500;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.modal-backdrop.open { display: flex; }
.modal {
    background: #121212;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 24px;
    width: min(480px, 100%);
}
.modal h3 { margin-bottom: 16px; }
.modal label { display: block; font-size: 0.75rem; color: var(--text-dim); margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.08em; }
.modal input, .modal textarea {
    width: 100%;
    background: #1a1a1a;
    border: 1px solid #333;
    color: white;
    padding: 10px 12px;
    border-radius: 10px;
    font-family: inherit;
}
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; }

.staff-panel {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.72);
    z-index: 4400;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 80px 16px 24px;
    overflow: auto;
}
.staff-panel[hidden] { display: none; }
.staff-panel-inner {
    width: min(640px, 100%);
    background: #121212;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 24px;
}
.staff-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}
.staff-hint { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 18px; }
.staff-panel h4 {
    margin: 18px 0 10px;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
}
.staff-empty { color: #666; font-size: 0.85rem; padding: 8px 0; }
.staff-row {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 10px 12px;
    margin-bottom: 8px;
}
.staff-row img { width: 36px; height: 36px; border-radius: 50%; }
.staff-row .meta { flex: 1; min-width: 0; }
.staff-row strong { display: block; font-size: 0.9rem; }
.staff-row small { color: var(--text-dim); font-size: 0.75rem; }
.staff-row .actions { display: flex; gap: 6px; flex-wrap: wrap; }
.badge {
    display: inline-flex;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--red);
    color: white;
    font-size: 0.7rem;
    font-weight: 800;
    align-items: center;
    justify-content: center;
    margin-left: 6px;
}

@media (max-width: 720px) {
    #admin-bar { top: auto; bottom: 16px; right: 16px; left: 16px; justify-content: flex-end; }
    body.editing #admin-bar { bottom: 110px; }
    h1 { font-size: 1.8rem; }
    .filters, .filters { grid-template-columns: 1fr; }
}
