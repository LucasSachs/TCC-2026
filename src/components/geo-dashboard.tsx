"use client";

import {
  DASHBOARD_LAYERS,
  GROUP_LABELS,
  MUNICIPALITIES,
  type DashboardLayer,
} from "@/lib/layers";
import {
  emptyFeatureCollection,
  featureCollectionAreaInSquareMeters,
  getPropertyAsString,
  type Feature,
  type FeatureCollection,
} from "@/lib/geojson";
import { useEffect, useMemo, useRef, useState } from "react";

type LayerStatus = "idle" | "loading" | "ready" | "missing" | "error";

type LayerState = {
  data: FeatureCollection;
  status: LayerStatus;
  message?: string;
};

type LeafletModule = {
  map: (element: HTMLElement, options: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options: Record<string, unknown>) => LeafletLayer;
  geoJSON: (
    data: FeatureCollection,
    options: Record<string, unknown>,
  ) => LeafletLayer;
  latLngBounds: (coordinates: Array<[number, number]>) => LeafletBounds;
};

type LeafletMap = {
  addLayer: (layer: LeafletLayer) => void;
  removeLayer: (layer: LeafletLayer) => void;
  fitBounds: (bounds: LeafletBounds, options?: Record<string, unknown>) => void;
  setView: (center: [number, number], zoom: number) => void;
  remove: () => void;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  bindPopup?: (content: string) => LeafletLayer;
  getBounds?: () => LeafletBounds;
};

type LeafletBounds = {
  isValid?: () => boolean;
};

declare global {
  interface Window {
    L?: LeafletModule;
  }
}

const CAMPOS_GERAIS_CENTER: [number, number] = [-24.75, -50.05];
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

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
        `<tr><th>${key}</th><td>${String(value).replaceAll("<", "&lt;")}</td></tr>`,
    )
    .join("");

  return `<strong>${title}</strong><br/><span>${layer.name}</span>${
    rows ? `<table>${rows}</table>` : ""
  }`;
}

function ensureLeafletAssets() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Leaflet só pode ser carregado no navegador."),
    );
  }

  if (window.L) return Promise.resolve(window.L);

  const existingCss = document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`);
  if (!existingCss) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }

  return new Promise<LeafletModule>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS_URL}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.L) resolve(window.L);
        else reject(new Error("Leaflet não foi inicializado."));
      });
      existingScript.addEventListener("error", () =>
        reject(new Error("Falha ao carregar Leaflet.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.integrity = "sha256-p4NxAoJBhIINfQm8PWg6JdA8V6x/eb1Eu4FJ8cORpGk=";
    script.crossOrigin = "";
    script.addEventListener("load", () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet não foi inicializado."));
    });
    script.addEventListener("error", () =>
      reject(new Error("Falha ao carregar Leaflet.")),
    );
    document.body.appendChild(script);
  });
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

function statusLabel(status: LayerStatus) {
  const labels: Record<LayerStatus, string> = {
    idle: "aguardando",
    loading: "carregando",
    ready: "pronta",
    missing: "sem arquivo",
    error: "erro",
  };

  return labels[status];
}

export function GeoDashboard() {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const renderedLayersRef = useRef<Map<string, LeafletLayer>>(new Map());
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
    () =>
      new Set(
        DASHBOARD_LAYERS.filter((layer) => layer.defaultVisible).map(
          (l) => l.id,
        ),
      ),
  );
  const [selectedMunicipality, setSelectedMunicipality] = useState("todos");
  const [leafletError, setLeafletError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    ensureLeafletAssets()
      .then((leaflet) => {
        if (cancelled || !mapElementRef.current || mapRef.current) return;

        const map = leaflet.map(mapElementRef.current, {
          center: CAMPOS_GERAIS_CENTER,
          zoom: 8,
          zoomControl: true,
          scrollWheelZoom: true,
        });

        leaflet
          .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          })
          .addTo(map);

        mapRef.current = map;
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
    const leaflet = window.L;
    if (!map || !leaflet) return;

    for (const [layerId, mapLayer] of renderedLayersRef.current.entries()) {
      if (!visibleLayerIds.has(layerId)) {
        map.removeLayer(mapLayer);
        renderedLayersRef.current.delete(layerId);
      }
    }

    for (const layer of DASHBOARD_LAYERS) {
      const layerState = layerStates[layer.id];
      if (!visibleLayerIds.has(layer.id) || layerState?.status !== "ready")
        continue;
      if (renderedLayersRef.current.has(layer.id)) continue;

      const mapLayer = leaflet.geoJSON(layerState.data, {
        style: {
          color: layer.color,
          weight: layer.group === "limite" ? 2 : 1.2,
          opacity: layer.opacity,
          fillColor: layer.fillColor,
          fillOpacity: layer.fillOpacity,
        },
        onEachFeature: (feature: Feature, featureLayer: LeafletLayer) => {
          featureLayer.bindPopup?.(buildPopupContent(feature, layer));
        },
      });

      mapLayer.addTo(map);
      renderedLayersRef.current.set(layer.id, mapLayer);
    }

    const boundaryLayer = renderedLayersRef.current.get("campos-gerais");
    const bounds = boundaryLayer?.getBounds?.();
    if (bounds?.isValid?.()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 10 });
    } else if (renderedLayersRef.current.size === 0) {
      map.setView(CAMPOS_GERAIS_CENTER, 8);
    }
  }, [layerStates, visibleLayerIds]);

  const activeLayers = useMemo(
    () => DASHBOARD_LAYERS.filter((layer) => visibleLayerIds.has(layer.id)),
    [visibleLayerIds],
  );

  const areaByLayer = useMemo(
    () =>
      activeLayers.map((layer) => {
        const state = layerStates[layer.id];
        const squareMeters = state
          ? featureCollectionAreaInSquareMeters(state.data)
          : 0;
        return {
          layer,
          squareMeters,
          formatted: formatArea(squareMeters),
          featureCount: state?.data.features.length ?? 0,
          status: state?.status ?? "idle",
        };
      }),
    [activeLayers, layerStates],
  );

  const totalArea = useMemo(
    () => areaByLayer.reduce((total, item) => total + item.squareMeters, 0),
    [areaByLayer],
  );
  const totalAreaFormatted = formatArea(totalArea);
  const missingLayers = Object.values(layerStates).filter(
    (state) => state.status === "missing",
  ).length;

  function toggleLayer(layerId: string) {
    setVisibleLayerIds((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }

  const groupedLayers = useMemo(
    () =>
      DASHBOARD_LAYERS.reduce<Record<string, DashboardLayer[]>>(
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
      <section className="map-panel" aria-label="Mapa geoespacial interativo">
        <div className="map-header">
          <div>
            <span className="eyebrow">WebGIS Campos Gerais</span>
            <h1>Dashboard de vegetação e áreas de preservação</h1>
          </div>
          <span className="map-status">
            {missingLayers > 0
              ? `${missingLayers} camada(s) aguardando GeoJSON`
              : "Camadas carregadas"}
          </span>
        </div>

        <div className="map-wrapper">
          <div ref={mapElementRef} className="map-canvas" />
          {leafletError ? (
            <div className="map-error">{leafletError}</div>
          ) : null}
          <div className="map-legend">
            <strong>Legenda ativa</strong>
            {activeLayers.map((layer) => (
              <span key={layer.id}>
                <i
                  style={{
                    background: layer.fillColor,
                    borderColor: layer.color,
                  }}
                />
                {layer.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <aside className="sidebar" aria-label="Controles e indicadores">
        <section className="card intro-card">
          <span className="eyebrow">Análise ambiental</span>
          <h2>Campos Gerais - PR</h2>
          <p>
            Controle a visibilidade das camadas GeoJSON, navegue pelo mapa e
            acompanhe a área total calculada no navegador.
          </p>
        </section>

        <section
          className="card stats-grid"
          aria-label="Indicadores principais"
        >
          <div>
            <span>Área ativa</span>
            <strong>{totalAreaFormatted.hectares} ha</strong>
            <small>{totalAreaFormatted.squareKilometers} km²</small>
          </div>
          <div>
            <span>Camadas visíveis</span>
            <strong>{activeLayers.length}</strong>
            <small>{DASHBOARD_LAYERS.length} configuradas</small>
          </div>
        </section>

        <section className="card control-card">
          <label htmlFor="municipality-filter">Filtro por município</label>
          <select
            id="municipality-filter"
            value={selectedMunicipality}
            onChange={(event) => setSelectedMunicipality(event.target.value)}
          >
            <option value="todos">Todos os municípios</option>
            {MUNICIPALITIES.map((municipality) => (
              <option key={municipality} value={municipality}>
                {municipality}
              </option>
            ))}
          </select>
          <p>
            O filtro está preparado na interface. Quando os GeoJSON tiverem
            atributo municipal ou interseção espacial validada, o recorte será
            aplicado ao cálculo.
          </p>
        </section>

        <section className="card layers-card">
          <div className="section-title">
            <h2>Camadas</h2>
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
          </div>

          {Object.entries(groupedLayers).map(([group, layers]) => (
            <div className="layer-group" key={group}>
              <h3>{GROUP_LABELS[group as keyof typeof GROUP_LABELS]}</h3>
              {layers.map((layer) => {
                const state = layerStates[layer.id];
                return (
                  <label className="layer-toggle" key={layer.id}>
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
                      <small>{layer.description}</small>
                      <em>{statusLabel(state?.status ?? "idle")}</em>
                    </span>
                  </label>
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
                <small>
                  {item.featureCount} feição(ões) · {statusLabel(item.status)}
                </small>
              </div>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
