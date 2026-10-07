# Dashboard Geoespacial dos Campos Gerais

Aplicação WebGIS em Next.js para visualização de vegetação nativa, APPs, unidades de conservação e dados do CAR na região dos Campos Gerais (PR).

## Executar localmente

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`.

## Docker

```bash
docker build -t dashboard-campos-gerais .
docker run --rm -p 3000:3000 dashboard-campos-gerais
```

