# Kursach-SPP-Paulik — запуск

## 1) База (Postgres)

```bash
cd /Users/mashkakoser/Documents/Uni/SPPKursachPaulik
docker compose up -d
```

## 2) Backend (API :3001)

```bash
cd /Users/mashkakoser/Documents/Uni/SPPKursachPaulik/backend
npm i
set -a; source config/env/development.env; set +a
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## 3) Frontend (UI :5173)

```bash
cd /Users/mashkakoser/Documents/Uni/SPPKursachPaulik/frontend
npm i
npm run dev
```

## Демо-логин
`admin@example.com` / `admin12345`
