# Backend (NodeJS + Express + Prisma + PostgreSQL)

## Запуск (очень кратко)

```bash
cd /Users/mashkakoser/Documents/Uni/SPPKursachPaulik
docker compose up -d

cd backend
npm i

# env для Prisma (DATABASE_URL) и сервера:
set -a; source config/env/development.env; set +a

npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Демо-логин
- `admin@example.com` / `admin12345`

## Проверка
- `GET /health` → `{ ok: true }`


