export type LayerGroup = "limite" | "vegetacao" | "app" | "conservacao" | "car";

export type DashboardLayer = {
  id: string;
  name: string;
  description: string;
  group: LayerGroup;
  file: string;
  color: string;
  fillColor: string;
  defaultVisible: boolean;
  opacity: number;
  fillOpacity: number;
};

export const MUNICIPALITIES = [
  "Arapoti",
  "Carambeí",
  "Castro",
  "Curiúva",
  "Imbaú",
  "Ipiranga",
  "Ivaí",
  "Jaguariaíva",
  "Ortigueira",
  "Palmeira",
  "Piraí do Sul",
  "Ponta Grossa",
  "Porto Amazonas",
  "Reserva",
  "São João do Triunfo",
  "Sengés",
  "Telêmaco Borba",
  "Tibagi",
  "Ventania",
];

export const DASHBOARD_LAYERS: DashboardLayer[] = [
  {
    id: "campos-gerais",
    name: "Limite dos Campos Gerais",
    description: "Recorte territorial dos 19 municípios da área de estudo.",
    group: "limite",
    file: "campos_gerais.geojson",
    color: "#1b7837",
    fillColor: "#b8e186",
    defaultVisible: true,
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
    defaultVisible: true,
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
    defaultVisible: true,
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
    id: "apps",
    name: "Áreas de Preservação Permanente",
    description:
      "APPs hídricas, nascentes e reservatórios exportados para GeoJSON.",
    group: "app",
    file: "apps.geojson",
    color: "#2b8cbe",
    fillColor: "#7bccc4",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.38,
  },
  {
    id: "unidades-conservacao",
    name: "Unidades de Conservação",
    description: "Unidades de Proteção Integral e Uso Sustentável.",
    group: "conservacao",
    file: "unidades_conservacao.geojson",
    color: "#762a83",
    fillColor: "#af8dc3",
    defaultVisible: false,
    opacity: 0.9,
    fillOpacity: 0.32,
  },
  {
    id: "reserva-legal-car",
    name: "Reserva Legal / CAR",
    description: "Áreas declaradas no Cadastro Ambiental Rural.",
    group: "car",
    file: "reserva_legal_car.geojson",
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
  app: "Áreas de preservação",
  conservacao: "Unidades de conservação",
  car: "Cadastro Ambiental Rural",
};
