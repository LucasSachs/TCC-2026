# Camadas GeoJSON

Coloque nesta pasta os arquivos finais exportados do QGIS. A aplicação já procura pelos seguintes nomes:

- `campos_gerais.geojson`
- `estepe.geojson`
- `floresta_ombrofila_mista.geojson`
- `floresta_ombrofila_densa.geojson`
- `floresta_estacional_semidecidual.geojson`
- `savana.geojson`
- `contato_estepe_fom.geojson`
- `contato_savana_fom.geojson`
- `apps_map.geojson` (versão otimizada para exibição no navegador)
- `unidades_conservacao.geojson`
- `reserva_legal_car_map.geojson` (versão otimizada para exibição no navegador)

Todos devem estar em `FeatureCollection` GeoJSON e preferencialmente em coordenadas geográficas compatíveis com EPSG:4674/SIRGAS 2000 ou WGS84.

O arquivo `apps.geojson` é a fonte original de alta resolução. Ele não deve ser carregado diretamente no navegador: a aplicação usa `apps_map.geojson`, com geometrias reparadas, consolidadas e simplificadas para a escala do mapa.

O arquivo `reserva_legal_car.geojson` também é mantido como fonte original de alta resolução. Para a visualização interativa, a aplicação usa `reserva_legal_car_map.geojson`, contendo apenas componentes poligonais reparados, agrupados e simplificados.
