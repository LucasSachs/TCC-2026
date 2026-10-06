"use client";

import {
  DASHBOARD_LAYERS,
  GROUP_LABELS,
  type DashboardLayer,
} from "@/lib/layers";
import {
  emptyFeatureCollection,
  featureCollectionAreaInSquareMeters,
  getPropertyAsString,
  type Feature,
  type FeatureCollection,
} from "@/lib/geojson";
import {
  getMunicipalityOptions,
  type LayerCollections,
  type MunicipalityFilterWorkerRequest,
  type MunicipalityFilterWorkerResponse,
} from "@/lib/municipality-filter";
import type * as Leaflet from "leaflet";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type LayerStatus = "idle" | "loading" | "ready" | "missing" | "error";
type FilterStatus = "initializing" | "idle" | "processing";

type LayerState = {
  data: FeatureCollection;
  status: LayerStatus;
  message?: string;
};

type LeafletModule = typeof Leaflet;
type LeafletMap = Leaflet.Map;
type LeafletLayer = Leaflet.GeoJSON;

const CAMPOS_GERAIS_CENTER: [number, number] = [-24.75, -50.05];
const ALWAYS_VISIBLE_LAYER_ID = "campos-gerais";
const ALL_MUNICIPALITIES = "todos";

function isLayerVisible(layerId: string, visibleLayerIds: Set<string>) {
  return (
    layerId === ALWAYS_VISIBLE_LAYER_ID || visibleLayerIds.has(layerId)
  );
}

// Caixa delimitadora aproximada cobrindo os 19 municípios dos Campos Gerais
// (PR): Arapoti, Carambeí, Castro, Curiúva, Imbaú, Ipiranga, Ivaí,
// Jaguariaíva, Ortigueira, Palmeira, Piraí do Sul, Ponta Grossa, Porto
// Amazonas, Reserva, São João do Triunfo, Sengés, Telêmaco Borba, Tibagi e
// Ventania, com margem de segurança.
const CAMPOS_GERAIS_BOUNDS: [[number, number], [number, number]] = [
  [-25.9, -51.3],
  [-23.8, -49.1],
];

const PROPERTY_LABELS: Record<string, string> = {
  fid: "ID",
  CD_MUN: "Código",
  NM_MUN: "Município",
  id1: "ID da área",
  cd_fcim: "Folha",
  leg_carga: "Legenda",
  cd_fito: "Cód. fitogeográfico",
  cd_leg_2: "Cód. de uso",
  clas_domi: "Classe",
  leg_uveg: "Sigla da vegetação",
  nm_uveg: "Vegetação",
  leg_uantr: "Sigla de uso",
  nm_uantr: "Uso antrópico",
  leg_contat: "Sigla do contato",
  nm_contat: "Contato",
  veg_pretet: "Sigla da vegetação",
  nm_pretet: "Vegetação original",
  leg_sec1: "Sigla secundária 1",
  nm_sec1: "Vegetação secundária 1",
  leg_sec2: "Sigla secundária 2",
  nm_sec2: "Vegetação secundária 2",
  leg_sup: "Predominância",
  legenda_1: "Formação",
  legenda_2: "Cobertura do solo",
  legenda: "Classificação",
  ar_poli_km: "Área (km²)",
  leg1_id: "ID da formação",
  leg2_id: "ID da cobertura",
};

function formatPropertyLabel(key: string) {
  const mappedLabel = PROPERTY_LABELS[key];
  if (mappedLabel) return mappedLabel;

  const readableLabel = key
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLocaleLowerCase("pt-BR");

  return readableLabel.replace(/^./, (firstLetter) =>
    firstLetter.toLocaleUpperCase("pt-BR"),
  );
}

function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatArea(squareMeters: number) {
  const hectares = squareMeters / 10_000;
  const squareKilometers = squareMeters / 1_000_000;

  return {
    hectares: new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: hectares >= 100 ? 0 : 2,
    }).format(hectares),
    squareKilometers: new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: squareKilometers >= 100 ? 0 : 2,
    }).format(squareKilometers),
  };
}

function buildPopupContent(feature: Feature, layer: DashboardLayer) {
  const properties = feature.properties ?? {};
  const title =
    getPropertyAsString(properties, [
      "NM_MUN",
      "nome",
      "NOME",
      "name",
      "legenda",
      "leg_uveg",
      "categoria",
    ]) ?? layer.name;

  const rows = Object.entries(properties)
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .slice(0, 8)
    .map(
      ([key, value]) =>
        `<tr><th>${escapeHtml(formatPropertyLabel(key))}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<strong>${title}</strong><br/><span>${layer.name}</span>${
    rows ? `<table>${rows}</table>` : ""
  }`;
}

async function loadLeaflet(): Promise<LeafletModule> {
  if (typeof window === "undefined") {
    throw new Error("Leaflet só pode ser carregado no navegador.");
  }

  return import("leaflet");
}

async function loadLayer(layer: DashboardLayer): Promise<LayerState> {
  try {
    const response = await fetch(`/geojson/${layer.file}`);

    if (response.status === 404) {
      return {
        data: emptyFeatureCollection(),
        status: "missing",
        message: `Arquivo não encontrado: public/geojson/${layer.file}`,
      };
    }

    if (!response.ok) {
      return {
        data: emptyFeatureCollection(),
        status: "error",
        message: `Erro HTTP ${response.status} ao carregar ${layer.file}`,
      };
    }

    const data = (await response.json()) as FeatureCollection;
    if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      return {
        data: emptyFeatureCollection(),
        status: "error",
        message: `${layer.file} não é um FeatureCollection GeoJSON válido.`,
      };
    }

    return { data, status: "ready" };
  } catch (error) {
    return {
      data: emptyFeatureCollection(),
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : `Erro ao carregar ${layer.file}`,
    };
  }
}

function layerStatesWithFilteredCollections(
  layerStates: Record<string, LayerState>,
  filteredCollections: LayerCollections | null,
  keepFullBoundary: boolean,
) {
  if (!filteredCollections) return layerStates;

  return Object.fromEntries(
    Object.entries(layerStates).map(([layerId, state]) => [
      layerId,
      {
        ...state,
        data:
          keepFullBoundary && layerId === ALWAYS_VISIBLE_LAYER_ID
            ? state.data
            : (filteredCollections[layerId] ?? state.data),
      },
    ]),
  );
}

export function GeoDashboard() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const renderedLayersRef = useRef<Map<string, LeafletLayer>>(new Map());
  const filterWorkerRef = useRef<Worker | null>(null);
  const filterRequestIdRef = useRef(0);
  const lastFittedMunicipalityRef = useRef<string | null>(null);
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>(
    () =>
      Object.fromEntries(
        DASHBOARD_LAYERS.map((layer) => [
          layer.id,
          { data: emptyFeatureCollection(), status: "idle" as LayerStatus },
        ]),
      ),
  );
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(
    () => {
      const defaultLayerIds = DASHBOARD_LAYERS.filter(
        (layer) => layer.defaultVisible,
      ).map((layer) => layer.id);

      return new Set([...defaultLayerIds, ALWAYS_VISIBLE_LAYER_ID]);
    },
  );
  const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState(
    ALL_MUNICIPALITIES,
  );
  const [appliedMunicipalityCode, setAppliedMunicipalityCode] = useState(
    ALL_MUNICIPALITIES,
  );
  const [filteredCollections, setFilteredCollections] =
    useState<LayerCollections | null>(null);
  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>("initializing");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [leafletError, setLeafletError] = useState<string | null>(null);
  const layersLoaded = Object.values(layerStates).every(
    (state) => state.status !== "idle" && state.status !== "loading",
  );

  useEffect(() => {
    let cancelled = false;

    setLayerStates((current) =>
      Object.fromEntries(
        DASHBOARD_LAYERS.map((layer) => [
          layer.id,
          { ...current[layer.id], status: "loading" as LayerStatus },
        ]),
      ),
    );

    Promise.all(
      DASHBOARD_LAYERS.map(async (layer) => [layer.id, await loadLayer(layer)]),
    )
      .then((entries) => {
        if (!cancelled) {
          setLayerStates(Object.fromEntries(entries));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLeafletError(
            error instanceof Error
              ? error.message
              : "Falha ao carregar camadas.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const municipalities = useMemo(() => {
    const boundaryState = layerStates[ALWAYS_VISIBLE_LAYER_ID];
    return boundaryState?.status === "ready"
      ? getMunicipalityOptions(boundaryState.data)
      : [];
  }, [layerStates]);

  const displayLayerStates = useMemo(
    () =>
      appliedMunicipalityCode === ALL_MUNICIPALITIES
        ? layerStates
        : layerStatesWithFilteredCollections(
            layerStates,
            filteredCollections,
            true,
          ),
    [appliedMunicipalityCode, filteredCollections, layerStates],
  );

  const analysisLayerStates = useMemo(
    () =>
      appliedMunicipalityCode === ALL_MUNICIPALITIES
        ? layerStates
        : layerStatesWithFilteredCollections(
            layerStates,
            filteredCollections,
            false,
          ),
    [appliedMunicipalityCode, filteredCollections, layerStates],
  );

  useEffect(() => {
    if (!layersLoaded) return;

    if (layerStates[ALWAYS_VISIBLE_LAYER_ID]?.status !== "ready") {
      setFilterStatus("idle");
      setFilterError("A camada de limites municipais não está disponível.");
      return;
    }

    const worker = new Worker(
      new URL("../workers/municipality-filter.worker.ts", import.meta.url),
      { type: "module" },
    );
    filterWorkerRef.current = worker;
    setFilterStatus("initializing");

    worker.onmessage = (
      event: MessageEvent<MunicipalityFilterWorkerResponse>,
    ) => {
      const message = event.data;

      if (message.type === "ready") {
        setFilterStatus("idle");
        setFilterError(null);
        return;
      }

      if (message.requestId !== filterRequestIdRef.current) return;

      if (message.type === "result") {
        setFilteredCollections(message.result.collections);
        setAppliedMunicipalityCode(message.municipalityCode);
        setFilterStatus("idle");
        setFilterError(null);
        return;
      }

      setFilteredCollections(null);
      setSelectedMunicipalityCode(ALL_MUNICIPALITIES);
      setAppliedMunicipalityCode(ALL_MUNICIPALITIES);
      setFilterStatus("idle");
      setFilterError(message.message);
    };

    worker.onerror = () => {
      setFilteredCollections(null);
      setSelectedMunicipalityCode(ALL_MUNICIPALITIES);
      setAppliedMunicipalityCode(ALL_MUNICIPALITIES);
      setFilterStatus("idle");
      setFilterError("Não foi possível iniciar o filtro municipal.");
    };

    const readyCollections = Object.fromEntries(
      Object.entries(layerStates)
        .filter(([, state]) => state.status === "ready")
        .map(([layerId, state]) => [layerId, state.data]),
    );

    worker.postMessage({
      type: "initialize",
      boundaryLayerId: ALWAYS_VISIBLE_LAYER_ID,
      collections: readyCollections,
    } satisfies MunicipalityFilterWorkerRequest);

    return () => {
      worker.terminate();
      if (filterWorkerRef.current === worker) filterWorkerRef.current = null;
    };
  }, [layerStates, layersLoaded]);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((leaflet) => {
        if (cancelled || !mapElementRef.current || mapRef.current) return;

        leafletRef.current = leaflet;

        const map = leaflet.map(mapElementRef.current, {
          center: CAMPOS_GERAIS_CENTER,
          zoom: 8,
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: true,
          maxBounds: CAMPOS_GERAIS_BOUNDS,
          maxBoundsViscosity: 1.0,
        });

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);

        map.setMinZoom(map.getBoundsZoom(CAMPOS_GERAIS_BOUNDS));
        map.fitBounds(CAMPOS_GERAIS_BOUNDS);

        mapRef.current = map;
        setMapReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLeafletError(
            error instanceof Error ? error.message : "Falha ao iniciar mapa.",
          );
        }
      });

    return () => {
      cancelled = true;
      for (const layer of renderedLayersRef.current.values()) {
        if (mapRef.current) mapRef.current.removeLayer(layer);
      }
      renderedLayersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !mapReady) return;

    for (const mapLayer of renderedLayersRef.current.values()) {
      map.removeLayer(mapLayer);
    }
    renderedLayersRef.current.clear();

    for (const layer of DASHBOARD_LAYERS) {
      const layerState = displayLayerStates[layer.id];
      if (
        !isLayerVisible(layer.id, visibleLayerIds) ||
        layerState?.status !== "ready"
      )
        continue;

      const mapLayer = leaflet.geoJSON(layerState.data, {
        style: (feature) => {
          const isBoundary = layer.id === ALWAYS_VISIBLE_LAYER_ID;
          const isSelectedMunicipality =
            isBoundary &&
            appliedMunicipalityCode !== ALL_MUNICIPALITIES &&
            String(feature?.properties?.CD_MUN) === appliedMunicipalityCode;

          if (
            isBoundary &&
            appliedMunicipalityCode !== ALL_MUNICIPALITIES
          ) {
            return {
              color: layer.color,
              weight: isSelectedMunicipality ? 4 : 1.2,
              opacity: isSelectedMunicipality ? 1 : 0.45,
              fillColor: layer.fillColor,
              fillOpacity: isSelectedMunicipality ? 0.18 : 0.02,
            };
          }

          return {
            color: layer.color,
            weight: isBoundary ? 2 : 1.2,
            opacity: layer.opacity,
            fillColor: layer.fillColor,
            fillOpacity: layer.fillOpacity,
          };
        },
        onEachFeature: (feature, featureLayer) => {
          featureLayer.bindPopup(
            buildPopupContent(feature as unknown as Feature, layer),
          );
        },
      });

      mapLayer.addTo(map);
      renderedLayersRef.current.set(layer.id, mapLayer);
    }

    renderedLayersRef.current.get(ALWAYS_VISIBLE_LAYER_ID)?.bringToFront();

    if (lastFittedMunicipalityRef.current !== appliedMunicipalityCode) {
      const boundaryData =
        analysisLayerStates[ALWAYS_VISIBLE_LAYER_ID]?.data ??
        emptyFeatureCollection();
      const bounds = leaflet.geoJSON(boundaryData).getBounds();
      if (bounds?.isValid()) {
        map.fitBounds(bounds, {
          padding: [28, 28],
          maxZoom:
            appliedMunicipalityCode === ALL_MUNICIPALITIES ? 10 : 11,
        });
        lastFittedMunicipalityRef.current = appliedMunicipalityCode;
      }
    }
  }, [
    analysisLayerStates,
    appliedMunicipalityCode,
    displayLayerStates,
    mapReady,
    visibleLayerIds,
  ]);

  const activeLayers = useMemo(
    () =>
      DASHBOARD_LAYERS.filter((layer) =>
        isLayerVisible(layer.id, visibleLayerIds),
      ),
    [visibleLayerIds],
  );

  const areaByLayer = useMemo(
    () =>
      activeLayers.map((layer) => {
        const state = analysisLayerStates[layer.id];
        const squareMeters = state
          ? featureCollectionAreaInSquareMeters(state.data)
          : 0;
        return {
          layer,
          squareMeters,
          formatted: formatArea(squareMeters),
        };
      }),
    [activeLayers, analysisLayerStates],
  );

  function toggleLayer(layerId: string) {
    if (layerId === ALWAYS_VISIBLE_LAYER_ID) return;

    setVisibleLayerIds((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }

  function selectMunicipality(municipalityCode: string) {
    setFilterError(null);
    setSelectedMunicipalityCode(municipalityCode);
    filterRequestIdRef.current += 1;

    if (municipalityCode === ALL_MUNICIPALITIES) {
      setFilteredCollections(null);
      setAppliedMunicipalityCode(ALL_MUNICIPALITIES);
      setFilterStatus("idle");
      return;
    }

    const worker = filterWorkerRef.current;
    if (!worker) {
      setSelectedMunicipalityCode(ALL_MUNICIPALITIES);
      setFilterError("O filtro municipal ainda não está disponível.");
      return;
    }

    setFilterStatus("processing");
    worker.postMessage({
      type: "filter",
      requestId: filterRequestIdRef.current,
      municipalityCode,
    } satisfies MunicipalityFilterWorkerRequest);
  }

  const filterMessage = (() => {
    if (filterError) return filterError;
    if (filterStatus === "processing") return "Aplicando filtro…";
    if (filterStatus === "initializing" || !layersLoaded) {
      return "Preparando filtro municipal…";
    }
    return null;
  })();

  const isMunicipalityFilterDisabled =
    layerStates[ALWAYS_VISIBLE_LAYER_ID]?.status !== "ready" ||
    filterStatus !== "idle" ||
    filterWorkerRef.current === null;

  const groupedLayers = useMemo(
    () =>
      DASHBOARD_LAYERS.filter(
        (layer) => layer.id !== ALWAYS_VISIBLE_LAYER_ID,
      ).reduce<Record<string, DashboardLayer[]>>(
        (groups, layer) => {
          groups[layer.group] ??= [];
          groups[layer.group].push(layer);
          return groups;
        },
        {},
      ),
    [],
  );

  return (
    <main className="dashboard-shell">
      <header className="page-heading">
        <div className="page-title-icon-wrap" aria-hidden="true">
          <Image
            className="page-title-icon"
            src="/icon.svg"
            alt=""
            width={30}
            height={30}
          />
        </div>
        <h1>
          Dashboard geoespacial interativo para análise de vegetação e áreas de
          preservação na região dos Campos Gerais
        </h1>
        <a
          className="repository-link"
          href="https://github.com/LucasSachs/TCC-2026"
          target="_blank"
          rel="noreferrer"
          aria-label="Abrir repositório do projeto no GitHub"
          title="Abrir repositório no GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 7.08c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.71 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.49A10.27 10.27 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
          </svg>
          <span className="sr-only">Abrir repositório do projeto no GitHub</span>
        </a>
      </header>

      <section className="map-panel" aria-label="Mapa geoespacial interativo">
        <div className="map-wrapper">
          <div ref={mapElementRef} className="map-canvas" />

          {leafletError || filterError ? (
            <div className="map-error">{leafletError ?? filterError}</div>
          ) : null}

          <div
            className={`map-legend${isLegendOpen ? "" : " map-legend-collapsed"}`}
          >
            <button
              type="button"
              className="map-legend-toggle"
              aria-expanded={isLegendOpen}
              onClick={() => setIsLegendOpen((isOpen) => !isOpen)}
            >
              <strong>Legenda ativa</strong>
              <b aria-hidden="true">{isLegendOpen ? "−" : "+"}</b>
            </button>

            {isLegendOpen
              ? activeLayers.map((layer) => (
                  <span key={layer.id}>
                    <i
                      style={{
                        background: layer.fillColor,
                        borderColor: layer.color,
                      }}
                    />
                    {layer.name}
                  </span>
                ))
              : null}
          </div>
        </div>
      </section>

      <aside className="sidebar" aria-label="Controles do mapa">
        <section className="card control-card">
          <label htmlFor="municipality-filter">Filtro por município</label>

          <div
            className={`municipality-select${selectedMunicipalityCode !== ALL_MUNICIPALITIES ? " municipality-select-active" : ""}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <select
              id="municipality-filter"
              value={selectedMunicipalityCode}
              disabled={isMunicipalityFilterDisabled}
              aria-busy={filterStatus === "processing"}
              onChange={(event) => selectMunicipality(event.target.value)}
            >
              <option value={ALL_MUNICIPALITIES}>Todos os municípios</option>
              {municipalities.map((municipality) => (
                <option key={municipality.code} value={municipality.code}>
                  {municipality.name}
                </option>
              ))}
            </select>
          </div>

          {filterMessage ? (
            <p
              className="filter-status"
              aria-live="polite"
              aria-busy={filterStatus !== "idle"}
            >
              {filterStatus !== "idle" ? (
                <span className="filter-spinner" aria-hidden="true" />
              ) : null}
              <span>{filterMessage}</span>
            </p>
          ) : null}
        </section>

        <section className="card layers-card">
          <div className="section-title">
            <h2>Camadas</h2>
            <div className="section-title-actions">
              <button
                type="button"
                onClick={() =>
                  setVisibleLayerIds(
                    new Set(DASHBOARD_LAYERS.map((layer) => layer.id)),
                  )
                }
              >
                Exibir todas
              </button>
              <button
                type="button"
                onClick={() =>
                  setVisibleLayerIds(new Set([ALWAYS_VISIBLE_LAYER_ID]))
                }
              >
                Limpar seleção
              </button>
            </div>
          </div>

          {Object.entries(groupedLayers).map(([group, layers]) => (
            <div className="layer-group" key={group}>
              <h3>{GROUP_LABELS[group as keyof typeof GROUP_LABELS]}</h3>
              {layers.map((layer) => {
                return (
                  <div
                    className={`layer-toggle${visibleLayerIds.has(layer.id) ? " layer-toggle-selected" : ""}`}
                    key={layer.id}
                  >
                    <label className="layer-toggle-control">
                      <input
                        type="checkbox"
                        checked={visibleLayerIds.has(layer.id)}
                        onChange={() => toggleLayer(layer.id)}
                      />
                      <span
                        className="layer-swatch"
                        style={{
                          background: layer.fillColor,
                          borderColor: layer.color,
                        }}
                      />
                      <span className="layer-copy">
                        <strong>{layer.name}</strong>
                        {layer.id === "unidades-conservacao" ? (
                          <small>{layer.description}</small>
                        ) : null}
                      </span>
                    </label>
                    {layer.helpText ? (
                      <span className="layer-help">
                        <button
                          type="button"
                          aria-describedby={`layer-help-${layer.id}`}
                          aria-label={`Saiba mais sobre ${layer.name}`}
                        >
                          ?
                        </button>
                        <span
                          className="layer-help-tooltip"
                          id={`layer-help-${layer.id}`}
                          role="tooltip"
                        >
                          <strong>Informações</strong>
                          <span>{layer.helpText}</span>
                        </span>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        <section className="card table-card">
          <h2>Área por camada</h2>
          <div className="area-list">
            {areaByLayer.map((item) => (
              <div className="area-row" key={item.layer.id}>
                <span>
                  <i
                    style={{
                      background: item.layer.fillColor,
                      borderColor: item.layer.color,
                    }}
                  />
                  {item.layer.name}
                </span>
                <strong>{item.formatted.hectares} ha</strong>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <footer className="page-footer">
        Desenvolvido por <strong>Lucas Sachs</strong> e{" "}
        <strong>Amanda Yohana</strong>
      </footer>
    </main>
  );
}
