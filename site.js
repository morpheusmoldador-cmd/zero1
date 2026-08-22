<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZER01 Roleplay | Portal Oficial</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div id="admin-bar"></div>
    <div id="editor-toolbar">
        <button class="btn btn-ok" type="button" data-action="save">Salvar</button>
        <button class="btn btn-ghost" type="button" data-action="cancel">Cancelar</button>
        <button class="btn btn-ghost" type="button" data-action="add-card">+ Caixa</button>
        <button class="btn btn-ghost" type="button" data-action="add-button">+ Botão</button>
        <button class="btn btn-ghost" type="button" data-action="add-image">+ Foto</button>
        <button class="btn btn-ghost" type="button" data-action="add-tab">+ Aba</button>
        <button class="btn btn-ghost" type="button" data-action="add-subtab">+ Subaba</button>
        <button class="btn btn-ghost" type="button" data-action="add-row">+ Linha tabela</button>
        <button class="btn btn-ghost" type="button" data-action="edit-link">Link</button>
        <button class="btn btn-ghost" type="button" data-action="edit-logo">Logo</button>
        <button class="btn btn-ghost" type="button" data-action="loja-vip">Loja VIP</button>
        <button class="btn btn-ghost" type="button" data-action="connect">Connect</button>
        <button class="btn btn-danger" type="button" data-action="delete">Apagar</button>
    </div>
    <div id="site-root"></div>
    <div id="toast"></div>
    <div id="staff-panel" class="staff-panel" hidden>
        <div class="staff-panel-inner">
            <div class="staff-panel-head">
                <h3>Cadastros de admin</h3>
                <button class="btn btn-ghost" type="button" id="staff-close">Fechar</button>
            </div>
            <p class="staff-hint">Quem pede acesso aparece aqui. Aceite para liberar o botão Editar, ou recuse.</p>
            <h4>Pedidos pendentes</h4>
            <div id="staff-pending"></div>
            <h4>Admins aprovados</h4>
            <div id="staff-admins"></div>
            <h4>Recusados</h4>
            <div id="staff-refused"></div>
        </div>
    </div>
    <div class="modal-backdrop" id="modal">
        <div class="modal">
            <h3 id="modal-title">Editar</h3>
            <div id="modal-fields"></div>
            <div class="modal-actions">
                <button class="btn btn-ghost" type="button" id="modal-cancel">Fechar</button>
                <button class="btn" type="button" id="modal-ok">Aplicar</button>
            </div>
        </div>
    </div>
    <input type="file" id="file-input" accept="image/*" hidden>
    <script src="/js/site.js"></script>
    <script src="/js/editor.js"></script>
    <script src="/js/app.js"></script>
</body>
</html>
