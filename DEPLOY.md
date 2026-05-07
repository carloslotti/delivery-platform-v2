# Guia de Deploy — Render.com

Sistema online em 4 passos, **sem cartão de crédito** e **sem terminal**.

---

## Visão geral

O projeto já está configurado pra deploy automático no **Render** (alternativa gratuita ao Heroku). Em 1 commit no GitHub, o Render lê o arquivo `render.yaml` na raiz e cria automaticamente:

- **Postgres** (banco)
- **Redis** (filas + WebSocket)
- **API** (NestJS, porta dinâmica)
- **Web** (Next.js, porta dinâmica)

Tudo de graça. URLs públicas tipo `https://delivery-web-XXXX.onrender.com`.

> **Atenção sobre o tier grátis:** o serviço dorme após 15 min de inatividade. A primeira requisição depois do sono leva ~50s pra acordar. Pra demo isso é aceitável; pra produção real, o plano pago (US$ 7/mês cada serviço) elimina o sleep.

---

## Passo 1 — Subir o código pro GitHub

### 1.1 Crie uma conta GitHub (se não tiver)

https://github.com/signup — gratuito, leva 1 minuto.

### 1.2 Crie um novo repositório

https://github.com/new

- Nome: `delivery-platform` (ou outro)
- Privado ou público (qualquer um serve)
- **Não inicialize com README** (já temos um)
- Clique em "Create repository"

### 1.3 Suba o código

Você tem 2 opções:

#### Opção A — pelo navegador (mais simples)

1. Descompacte o `delivery-platform-v3.tar.gz` na sua máquina
2. Vá em https://github.com/SEU_USUARIO/delivery-platform/upload
3. Arraste a pasta `delivery-platform/` inteira pra área de upload
4. Escreva uma mensagem de commit ("primeira versão") e clique "Commit changes"

#### Opção B — pelo terminal (se você tem `git` instalado)

```bash
cd delivery-platform
git init
git add .
git commit -m "primeira versão"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/delivery-platform.git
git push -u origin main
```

---

## Passo 2 — Conectar Render ao GitHub

### 2.1 Crie conta Render

https://render.com → "Get Started" → "Sign in with GitHub" (use a mesma conta).

Render pede autorização para ler seus repositórios — autorize.

### 2.2 Criar Blueprint (deploy automático tudo-em-um)

1. No dashboard do Render: clique **"New +"** no canto superior direito
2. Selecione **"Blueprint"**
3. Conecte seu repositório `delivery-platform`
4. Render vai detectar o `render.yaml` automaticamente e mostrar:
   - 1 Postgres
   - 1 Redis
   - 1 Web Service (delivery-api)
   - 1 Web Service (delivery-web)
5. Clique **"Apply"**

> Render vai começar a buildar tudo. Pode demorar **8-15 minutos** na primeira vez (instala dependências, compila, roda migrações, seed).

### 2.3 Acompanhe o progresso

Cada serviço tem uma aba **"Events"** que mostra o log em tempo real. Quando aparecer:

- ✅ `delivery-postgres`: "Available"
- ✅ `delivery-redis`: "Available"
- ✅ `delivery-api`: "Live" (verde)
- ⚠️  `delivery-web`: pode ficar **"Failed"** — esperado, ainda falta configurar URLs

---

## Passo 3 — Configurar URLs do frontend

O frontend (`delivery-web`) precisa saber onde está a API. Como o Render gera URLs aleatórias, isso é manual:

### 3.1 Pegue a URL da API

1. Vá no service **`delivery-api`** no dashboard Render
2. Topo da página tem o URL público, tipo: `https://delivery-api-abc1.onrender.com`
3. **Copie** esse URL

### 3.2 Configure no `delivery-web`

1. Vá no service **`delivery-web`**
2. Aba **"Environment"** no menu lateral
3. Clique **"Edit"**
4. Preencha:
   - `NEXT_PUBLIC_API_URL` = `https://delivery-api-abc1.onrender.com/api/v1`  *(URL da API + /api/v1)*
   - `NEXT_PUBLIC_WS_URL` = `https://delivery-api-abc1.onrender.com`  *(URL da API sem o sufixo)*
5. Clique **"Save Changes"**

### 3.3 Force rebuild

Render rebuilda automaticamente após salvar env vars. Aguarde **3-5 minutos**.

Quando aparecer "Live" verde no `delivery-web`, pega o URL público dele (ex: `https://delivery-web-xyz2.onrender.com`).

---

## Passo 4 — Testar!

### 4.1 Abra no Chrome

`https://delivery-web-xyz2.onrender.com` (URL do seu service web)

### 4.2 Login

- Email: `demo@bomsabor.com`
- Senha: `demo1234`

> Se aparecer "Falha no login" na primeira tentativa, é porque o serviço estava dormindo. Espere 30s e tente de novo.

### 4.3 Teste o tempo real

Abra **DUAS janelas/abas** ao mesmo tempo:

**Janela 1 (lojista, desktop):**
1. https://delivery-web-xyz2.onrender.com
2. Login → vá em "Lançar pedido"
3. Digite um CEP de Birigui-SP (tipo `16200-005`)
4. Preencha endereço e clique "Chamar entregador"

**Janela 2 (motoboy, celular ou outra aba):**
1. https://delivery-web-xyz2.onrender.com/motoboy
2. Escolha um motoboy (ex: Anderson Camargo)
3. Clique "Iniciar turno"
4. **Permita acesso à localização**
5. Você verá a oferta aparecer instantaneamente
6. Clique "Aceitar"

**Janela 1 (lojista) deve mostrar:**
- O pedido mudou de "Buscando entregador" pra "Entregador a caminho"
- O pino verde apareceu no mapa, pulsando
- Quando o motoboy se mover (na janela 2 com GPS ativo), o pino vai se mover suavemente

### 4.4 Compartilhe a página de tracking

Na tela de detalhe do pedido, clique **"Copiar link de rastreio"**. Cole esse link em outra aba (ou mande no WhatsApp). Quem abrir vê o pedido sendo entregue em tempo real, sem precisar de login.

---

## Personalizando

### Mudando seu próprio cadastro

Atualmente o sistema vem com um tenant demo "Pizzaria Bom Sabor". Pra trocar pelo seu:

1. Login com `demo@bomsabor.com`
2. Vá em **"Configurações"**
3. Mude o nome da loja, endereço, telefone
4. Salve

Os dados de demonstração (motoboys e pedidos antigos) ficam — você pode ignorá-los ou ir editando/desativando aos poucos.

### Adicionando seus motoboys reais

1. Vá em **"Entregadores"** → "+ Novo entregador"
2. Cadastre nome e telefone
3. Após cadastrar, clique **"Link de acesso"** no card do motoboy
4. Cole esse link no WhatsApp do motoboy
5. Ele abre no celular, faz "Iniciar turno", e está pronto pra receber corridas

---

## Plano pago (recomendado depois de validar)

Quando a demo virar uso real, **upgrade pra Starter ($7/mês cada serviço)** elimina:

- ❌ Sleep de 15 min (serviço fica online 24/7)
- ❌ Latência alta no acordar (~50s)
- ❌ Limite de horas mensais

Custo total estimado: ~$30/mês (API + Web + Redis + Postgres no plano básico).

Alternativa mais barata: migrar pra **Railway** ($5/mês com sleep) ou **Fly.io** (free tier sem sleep mas mais técnico).

---

## Problemas comuns

### "delivery-web ficou em Failed"
→ Normal antes de configurar `NEXT_PUBLIC_API_URL`. Configure (Passo 3) e rebuild.

### "Pino do motoboy não aparece"
→ Verifique se o motoboy permitiu acesso à localização. No Chrome: cadeado da URL → Site settings → Localização: Permitir.

### "Login não funciona"
→ Provavelmente o seed não rodou. Vá no Render → `delivery-api` → "Shell" → execute:
```bash
cd /opt/render/project/src/apps/api
npx tsx prisma/seed.ts
```

### "WebSocket dropa a cada 30s"
→ Render free tier força reconexão periódica. Não é bug seu — Socket.io já reconecta automaticamente. Em produção paga, isso some.

### "CORS error no console"
→ Edite `delivery-api` → Environment → `CORS_ORIGINS` = URL completa do `delivery-web` (ex: `https://delivery-web-xyz2.onrender.com`). Save → rebuild.

---

## Checklist final

Antes de mandar o link pra qualquer cliente, confira:

- [ ] Login funciona com `demo@bomsabor.com` / `demo1234`
- [ ] Lançar pedido cria pedido (CEP funciona, mapa mostra coleta)
- [ ] `/motoboy` lista motoboys
- [ ] Iniciar turno como motoboy pede permissão de GPS
- [ ] Aceitar oferta atualiza painel do lojista em tempo real
- [ ] Pino verde aparece no mapa do detalhe do pedido
- [ ] Link de tracking público funciona em aba anônima

Tudo em ordem? Boa demo. 🚀
