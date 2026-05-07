# Delivery Platform — Sistema completo

Plataforma SaaS multi-tenant de logística de última milha. Lojistas chamam entregadores, motoboys aceitam corridas, clientes acompanham em tempo real.

## Stack

**Backend**
- Node.js 20+ · NestJS 10 · TypeScript
- Prisma ORM · PostgreSQL 16
- Redis · BullMQ (filas)
- JWT (access + refresh) · bcrypt
- Socket.io (preparado para tempo real)

**Frontend**
- Next.js 14 (App Router) · TypeScript
- Tailwind CSS com design system próprio
- Leaflet (mapas, sem API key)
- Axios

**Infra**
- Docker Compose (Postgres + Redis)
- Monorepo com npm workspaces

---

## Como rodar (passo a passo)

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose
- npm 9+

### 1. Subir infra
```bash
cp .env.example .env
docker compose up -d
```

Isso sobe Postgres em `localhost:5432` e Redis em `localhost:6379`.

### 2. Instalar dependências
```bash
npm install
```

### 3. Criar tabelas e popular o banco
```bash
npm run db:push   # cria as tabelas (Prisma push)
npm run db:seed   # popula com dados de demo
```

O seed cria:
- Tenant "Pizzaria Bom Sabor"
- Loja em Birigui-SP com endereço de coleta
- 4 entregadores (Anderson, Mario, Roberto, Juliana)
- ~50 entregas históricas dos últimos 7 dias
- Carteira com saldo
- Usuário owner: `demo@bomsabor.com` / `demo1234`

### 4. Rodar API + Web
```bash
npm run dev   # sobe api (porta 4000) e web (porta 3000) juntos
```

Ou separadamente:
```bash
npm run dev:api
npm run dev:web
```

### 5. Acessar
- **Painel:** http://localhost:3000
- **Login:** demo@bomsabor.com / demo1234
- **API:** http://localhost:4000/api/v1
- **Tracking público:** http://localhost:3000/track/{trackingToken}

---

## Estrutura

```
delivery-platform/
├── docker-compose.yml          # Postgres + Redis
├── .env.example                # Variáveis de ambiente
├── package.json                # Workspaces root
└── apps/
    ├── api/                    # Backend NestJS
    │   ├── prisma/
    │   │   ├── schema.prisma   # Modelo de dados (16 entidades)
    │   │   └── seed.ts         # Dados de demo
    │   └── src/
    │       ├── main.ts
    │       ├── app.module.ts
    │       ├── common/
    │       │   ├── auth/       # JWT guard, roles guard
    │       │   ├── decorators/ # @CurrentUser, @TenantId, @Public
    │       │   ├── filters/    # HTTP exception filter
    │       │   └── prisma/
    │       └── modules/
    │           ├── auth/       # Login, registro, JWT
    │           ├── tenants/
    │           ├── users/
    │           ├── stores/     # Lojas (multi-loja por tenant)
    │           ├── deliveries/ # Pedidos + pricing + dispatch
    │           ├── drivers/    # Entregadores + GPS + gamificação
    │           ├── wallet/     # Carteira pré/pós paga
    │           ├── invoices/   # Faturas mensais
    │           ├── tracking/   # Tracking público
    │           └── reports/    # KPIs e analytics
    │
    └── web/                    # Frontend Next.js
        ├── tailwind.config.js  # Design tokens próprios
        └── src/
            ├── app/
            │   ├── login/      # Página de login
            │   ├── (panel)/    # Layout protegido
            │   │   ├── dashboard/
            │   │   ├── lancar-pedido/
            │   │   ├── pedidos/
            │   │   │   └── [id]/
            │   │   ├── entregadores/
            │   │   ├── carteira/
            │   │   ├── faturas/
            │   │   ├── relatorios/
            │   │   └── configuracoes/
            │   └── track/      # Tracking público (sem auth)
            │       └── [token]/
            ├── components/
            │   ├── ui/         # Button, Card, Input, Pill, Map, Logo
            │   └── layout/     # Sidebar, PageHeader
            ├── lib/
            │   ├── api.ts      # Axios client com interceptor JWT
            │   ├── types.ts    # Tipos compartilhados + labels
            │   └── utils.ts    # cn, formatCents, formatDateTime
            └── styles/
                └── globals.css
```

---

## Módulos implementados

### Backend

| Módulo | Endpoints principais | Funções |
|---|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | JWT, bcrypt, registro cria tenant+loja+wallet em uma transação |
| **Tenants** | `GET /tenants/me` | Multi-tenant via `tenant_id` em todas as queries |
| **Stores** | `GET/POST/PATCH /stores`, `PATCH /stores/:id/{open,close}` | Multi-loja por tenant, tabela de preços por loja |
| **Deliveries** | `POST/GET /deliveries`, `PATCH /:id/status` | Pricing, dispatch, state machine, eventos |
| **Drivers** | `GET/POST/PATCH /drivers`, `POST /:id/location` | GPS, gamificação (XP, levels), histórico |
| **Wallet** | `GET /wallet`, `POST /wallet/recharge`, `GET /wallet/transactions` | Pós-pago com limite de crédito |
| **Invoices** | `GET /invoices`, `POST /invoices/generate`, `POST /:id/pay` | Faturas mensais consolidadas |
| **Tracking** | `GET /tracking/:token` (público) | Sem auth, sanitiza dados sensíveis |
| **Reports** | `GET /reports/dashboard`, `/by-date`, `/by-driver` | KPIs, gráficos, agregações |

### Frontend (10 páginas)

1. `/login` — login editorial em duas colunas
2. `/dashboard` — KPIs, gráfico de pedidos por hora, lista recente
3. `/lancar-pedido` — form + mapa + tabela de preços ao lado
4. `/pedidos` — kanban-like com filtros por status e busca
5. `/pedidos/[id]` — detalhe com mapa, timeline, ações de mudança de status
6. `/entregadores` — cards de motoboy com rating, XP, level, ganhos
7. `/carteira` — saldo destacado, barra de uso de crédito, histórico
8. `/faturas` — lista de faturas mensais com pagamento
9. `/relatorios` — filtros de data, KPIs, por entregador, lista detalhada
10. `/configuracoes` — dados da loja, endereço de coleta, tabela de preços
11. `/track/[token]` — página pública de tracking com mapa em tempo real (refresh 8s)

---

## Decisões técnicas importantes

### Multi-tenancy
Row-level via `tenantId` em toda tabela operacional. Middleware injeta automaticamente em todas as queries via decorator `@TenantId()`. Isolamento sem custo de schema.

### Dinheiro
Sempre em **centavos como `Int`**. Nunca float. Conversão na borda (UI).

### Pricing engine
Service dedicado (`PricingService`) com Haversine para distância simples. Em produção: trocar por chamada ao Mapbox/Google Maps. Surge multiplier preparado.

### Dispatch (matching motoboy ↔ pedido)
Service dedicado (`DispatchService`) que:
1. Busca motoboys `AVAILABLE` no tenant
2. Calcula score: distância (peso alto) + rating + XP
3. Atribui o melhor candidato em transação atômica (atualiza delivery + driver + cria evento)

### State machine de entregas
Transições validadas em `assertValidTransition()`. Estados: `PENDING → SEARCHING → ASSIGNED → PICKING_UP → IN_TRANSIT → DELIVERED`. Cancelamento permitido em qualquer estado anterior a `DELIVERED`.

### Tracking público
Cada delivery tem `trackingToken` (cuid). Endpoint público `/tracking/:token` retorna dados sanitizados (sem CPF/CNH/dados internos). Frontend faz polling a cada 8s.

### Design system
Paleta terrosa própria (`ink` neutro, `clay` âmbar, `moss` verde) — distante do azul/roxo genérico. Tipografia: **Fraunces** (display serif com optical sizing) + **Geist** (sans). Tabular nums para dinheiro/IDs/métricas. Animações sutis (pulse-ring nos status ativos).

---

## Próximos passos sugeridos

Para evoluir do MVP atual:

- **WebSocket real** — emitir eventos ao mudar status, push do GPS do motoboy
- **App nativo do motoboy** — React Native (mesma API)
- **Geocoding real** — endereço → lat/lng via API
- **Webhook assinado** — callback para PDV da loja a cada mudança de status
- **API pública** — endpoint para PDV criar entrega via integração
- **Surge automático** — multiplicador baseado em demanda/oferta
- **Cron de faturamento** — geração automática mensal
- **Gateway de pagamento real** — Asaas/Pagar.me para Pix
- **WhatsApp bot** — criar entrega via mensagem

---

## Comandos úteis

```bash
# Subir tudo
docker compose up -d
npm run dev

# Resetar banco (apaga tudo e recria)
npm run db:push -- --force-reset
npm run db:seed

# Ver banco com Prisma Studio
npm run db:studio

# Rebuild
npm run build

# Logs do docker
docker compose logs -f postgres
```

---

## Conta de demonstração

```
Email:  demo@bomsabor.com
Senha:  demo1234
```

Loja em Birigui-SP, 4 entregadores cadastrados, ~50 entregas históricas, carteira com saldo.

---

## 🆕 Página do motoboy + tempo real

### Como testar o tempo real

Abra **três abas/janelas** no navegador:

1. **Lojista (desktop):** http://localhost:3000 → login com `demo@bomsabor.com` / `demo1234` → vai pro Dashboard
2. **Detalhe de pedido (desktop):** lance um pedido em "Lançar pedido" → vai abrir a tela com mapa
3. **Motoboy (celular ou outra aba):** http://localhost:3000/motoboy → escolhe um motoboy → toca "Iniciar turno"

Com o motoboy online, no celular ele permite acesso ao GPS. A cada 5 segundos a posição é enviada pro backend, que faz broadcast via WebSocket. **No painel do lojista, o pino verde do motoboy se move suavemente no mapa**, sem refresh, sem polling.

Quando o motoboy clica em "Aceitar" numa oferta, o lojista vê o status mudar instantaneamente. Quando ele coleta e entrega, mesmo comportamento.

### Fluxo completo da demo

1. Lojista lança pedido → status `SEARCHING`
2. Motoboy online vê a oferta na lista → clica "Aceitar"
3. Status vai pra `ASSIGNED` (visto em tempo real pelo lojista)
4. Motoboy vê "Vá até a loja" + mapa com rota
5. Motoboy chega na loja → clica "Cheguei e coletei o pedido"
6. Status `IN_TRANSIT` → motoboy vai pro endereço do cliente
7. Cliente acompanha pelo link público `/track/{token}` (também tempo real)
8. Motoboy clica "Entreguei" → fecha o ciclo, cobra a carteira da loja, paga o motoboy

