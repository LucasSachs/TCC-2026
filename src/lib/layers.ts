export type LayerGroup = "limite" | "vegetacao" | "conservacao" | "car";

export type DashboardLayer = {
  id: string;
  name: string;
  description: string;
  helpText?: string;
  group: LayerGroup;
  file: string;
  color: string;
  fillColor: string;
  defaultVisible: boolean;
  opacity: number;
  fillOpacity: number;
};

export const DASHBOARD_LAYERS: DashboardLayer[] = [
  {
    id: "campos-gerais",
    name: "Limite dos Campos Gerais",
    description: "Recorte territorial dos 19 municípios da área de estudo.",
    group: "limite",
    file: "campos_gerais.geojson",
    color: "#1b7837",
    fillColor: "#b8e186",
    defaultVisible: false,
    opacity: 0.95,
    fillOpacity: 0.08,
  },
  {
    id: "estepe",
    name: "Estepe / Campos Nativos",
    description: "Formação vegetal predominante nos Campos Gerais.",
    group: "vegetacao",
    file: "estepe.geojson",
    color: "#4d9221",
    fillColor: "#7fbc41",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.42,
  },
  {
    id: "floresta-ombrofila-mista",
    name: "Floresta Ombrófila Mista",
    description: "Floresta com Araucária e remanescentes associados.",
    group: "vegetacao",
    file: "floresta_ombrofila_mista.geojson",
    color: "#006837",
    fillColor: "#238443",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.42,
  },
  {
    id: "floresta-ombrofila-densa",
    name: "Floresta Ombrófila Densa",
    description: "Tipologia florestal identificada em ocorrência pontual.",
    group: "vegetacao",
    file: "floresta_ombrofila_densa.geojson",
    color: "#00441b",
    fillColor: "#006d2c",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.42,
  },
  {
    id: "floresta-estacional-semidecidual",
    name: "Floresta Estacional Semidecidual",
    description: "Formação vegetal de transição fitogeográfica.",
    group: "vegetacao",
    file: "floresta_estacional_semidecidual.geojson",
    color: "#8c510a",
    fillColor: "#bf812d",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.42,
  },
  {
    id: "savana",
    name: "Savana",
    description: "Áreas de savana recortadas para o escopo regional.",
    group: "vegetacao",
    file: "savana.geojson",
    color: "#dfc27d",
    fillColor: "#f6e8c3",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.5,
  },
  {
    id: "contato-estepe-fom",
    name: "Contato Estepe/FOM",
    description:
      "Área de tensão ecológica entre Estepe e Floresta Ombrófila Mista.",
    group: "vegetacao",
    file: "contato_estepe_fom.geojson",
    color: "#5aae61",
    fillColor: "#a6dba0",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.45,
  },
  {
    id: "contato-savana-fom",
    name: "Contato Savana/FOM",
    description:
      "Área de tensão ecológica entre Savana e Floresta Ombrófila Mista.",
    group: "vegetacao",
    file: "contato_savana_fom.geojson",
    color: "#80cdc1",
    fillColor: "#c7eae5",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.48,
  },
  {
    id: "unidades-conservacao",
    name: "Unidades de Conservação",
    description:
      "Unidades de Conservação de Proteção Integral e de Uso Sustentável no estado do Paraná de gestão Estadual.",
    helpText:
      "As Unidades de Conservação são áreas criadas pelo poder público para proteger a natureza. Algumas possuem regras mais restritivas, enquanto outras permitem o uso sustentável de parte dos recursos naturais, dependendo da categoria em que estão classificadas. Esse mapeamento é utilizado pelo Instituto Água e Terra como apoio ao planejamento ambiental do Paraná",
    group: "conservacao",
    file: "unidades_conservacao.geojson",
    color: "#762a83",
    fillColor: "#af8dc3",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.32,
  },
  {
    id: "apps",
    name: "Áreas de Preservação Permanente",
    description:
      "APPs hídricas, nascentes e reservatórios exportados para GeoJSON.",
    helpText:
      "As Áreas de Preservação Permanente protegem locais importantes, como margens de rios, nascentes e áreas com maior fragilidade ambiental",
    group: "car",
    file: "apps_map.geojson",
    color: "#2b8cbe",
    fillColor: "#7bccc4",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.38,
  },
  {
    id: "reserva-legal-car",
    name: "Reserva Legal / CAR",
    description: "Áreas declaradas no Cadastro Ambiental Rural.",
    group: "car",
    file: "reserva_legal_car_map.geojson",
    color: "#b35806",
    fillColor: "#f1a340",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.34,
  },
];

export const GROUP_LABELS: Record<LayerGroup, string> = {
  limite: "Delimitação espacial",
  vegetacao: "Cobertura vegetal",
  conservacao: "Unidades de conservação",
  car: "Cadastro Ambiental Rural",
};
