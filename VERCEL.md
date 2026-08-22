# Teste na Vercel

Versão de teste do portal. Edições, fotos enviadas e cadastros de admin **não ficam permanentes** na Vercel (armazenamento temporário). O site oficial continua sendo a Square Cloud.

Login por **e-mail** (igual à Square Cloud). Dono: `morpheus.moldador@gmail.com`

## 1. Variáveis na Vercel

Project → Settings → Environment Variables:

| Nome | Valor |
|---|---|
| `OWNER_EMAIL` | `morpheus.moldador@gmail.com` |
| `SESSION_SECRET` | qualquer frase longa |
| `PUBLIC_URL` | opcional: `https://SEU-PROJETO.vercel.app` |

Não precisa de `DISCORD_CLIENT_ID` nem `DISCORD_CLIENT_SECRET` nesta versão.

## 2. Publicar

Na pasta do projeto:

```
npx vercel
```

Na primeira vez faça login, escolha o escopo e confirme. Para produção:

```
npx vercel --prod
```

Abra a URL `.vercel.app` que aparecer.

## Enviar no GitHub (sem o erro de 100 arquivos)

Não arraste a pasta inteira do projeto. A pasta `node_modules` tem centenas de arquivos e o GitHub bloqueia.

No repositório vazio, clique em **Add file → Upload files** e envie **somente**:

- `api`
- `data` (só o `original.html`)
- `public`
- `src`
- `scripts`
- `package.json`
- `package-lock.json`
- `server.js`
- `vercel.json`
- `squarecloud.app`
- `.gitignore`
- `.vercelignore`
- `.env.example`
- `README.md`
- `SETUP.md`
- `VERCEL.md`

**Não envie:** `node_modules`, `.env`, arquivos `.zip`.

A Vercel instala as dependências sozinha depois.

## 3. Login de teste

1. Abra o site da Vercel
2. Clique em **Admin**
3. Entre com `morpheus.moldador@gmail.com`
4. Você já entra como dono e vê **Editar**

Outros e-mails entram como visitante e podem clicar em **Pedir admin**.
