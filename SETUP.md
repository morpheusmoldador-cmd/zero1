# Hospedar o portal ZER01 na Square Cloud

O site **não depende do seu computador**. Depois do upload, ele fica no ar 24h na Square Cloud. Se o processo cair, a Square Cloud sobe de novo (`AUTORESTART=true`).

Textos, fotos, Loja VIP, admins e login ficam salvos no servidor da Square Cloud. Você só usa o navegador para editar.

Login por **e-mail**. Dono: `morpheus.moldador@gmail.com`.

## 1. Enviar o zip

Arquivo: `zer01regras.zip`

1. Abra https://squarecloud.app
2. Crie uma aplicação **Website / Site** (não bot)
3. Envie o zip
4. Confirme memória **512 MB** (mínimo de site)

## 2. Variáveis no painel da Square Cloud

Não coloque isso no seu PC. Só no painel da aplicação:

| Variável | Valor |
|---|---|
| `PUBLIC_URL` | `https://zer01roleplay.livroderegras.app` |
| `OWNER_EMAIL` | `morpheus.moldador@gmail.com` |
| `SESSION_SECRET` | frase longa e aleatória |

Não defina `PORT`. O site já escuta a **porta 80**.

Pode apagar `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET` se ainda estiverem lá. Não são mais usados.

## 3. Depois de online

- Site público: `https://zer01roleplay.livroderegras.app`
- **Admin** (painel na direita) → entre com `morpheus.moldador@gmail.com`
- **Editar**, **Loja VIP**, **Cadastros** — tudo no site, no ar
- No modo Editar, **Enter** cria uma linha nova
- Pode desligar o computador

## Teste na Vercel

Para testar sem mexer na Square Cloud, use o guia [VERCEL.md](VERCEL.md). Edições e fotos na Vercel **não ficam permanentes**.
