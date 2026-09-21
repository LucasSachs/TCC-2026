# Dashboard Geoespacial dos Campos Gerais

Aplicação WebGIS em Next.js para visualização de vegetação nativa, APPs, unidades de conservação e dados do CAR na região dos Campos Gerais (PR).

## Executar localmente

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`.

## Dados geoespaciais

Os arquivos GeoJSON devem ser colocados em `public/geojson`. Consulte `public/geojson/README.md` para os nomes esperados.

Enquanto os arquivos reais não estiverem disponíveis, o dashboard informa quais camadas estão ausentes e mantém a interface funcional.

## Docker

```bash
docker build -t dashboard-campos-gerais .
docker run --rm -p 3000:3000 dashboard-campos-gerais
```

## Principais funcionalidades

- Mapa interativo com Leaflet e OpenStreetMap.
- Controle de visibilidade por camada temática.
- Indicador de área ativa em hectares e km² calculado no cliente.
- Estrutura preparada para filtros por município.
- Configuração centralizada de camadas em `src/lib/layers.ts`.
