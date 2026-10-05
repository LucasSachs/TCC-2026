import { intersect } from "@turf/intersect";

import type {
  Feature,
  FeatureCollection,
  Geometry,
  Position,
} from "@/lib/geojson";

export const MUNICIPALITY_CODE_PROPERTY = "CD_MUN";
export const MUNICIPALITY_NAME_PROPERTY = "NM_MUN";

type PolygonFeatureCollection = Parameters<typeof intersect>[0];
type PolygonFeature = PolygonFeatureCollection["features"][number];
type PolygonGeometry = PolygonFeature["geometry"];
type BoundingBox = [number, number, number, number];

export type MunicipalityOption = {
  code: string;
  name: string;
};

export type LayerCollections = Record<string, FeatureCollection>;

export type MunicipalityFilterResult = {
  collections: LayerCollections;
  municipality: Feature;
};

export type MunicipalityFilterWorkerRequest =
  | {
      type: "initialize";
      boundaryLayerId: string;
      collections: LayerCollections;
    }
  | {
      type: "filter";
      requestId: number;
      municipalityCode: string;
    };

export type MunicipalityFilterWorkerResponse =
  | { type: "ready" }
  | {
      type: "result";
      requestId: number;
      municipalityCode: string;
      result: MunicipalityFilterResult;
    }
  | {
      type: "error";
      requestId: number;
      municipalityCode: string;
      message: string;
    };

function propertyAsString(feature: Feature, property: string) {
  const value = feature.properties?.[property];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

export function getMunicipalityOptions(
  boundaries: FeatureCollection,
): MunicipalityOption[] {
  return boundaries.features
    .map((feature) => ({
      code: propertyAsString(feature, MUNICIPALITY_CODE_PROPERTY),
      name: propertyAsString(feature, MUNICIPALITY_NAME_PROPERTY),
    }))
    .filter(
      (municipality): municipality is MunicipalityOption =>
        municipality.code !== null && municipality.name !== null,
    )
    .sort((first, second) =>
      first.name.localeCompare(second.name, "pt-BR"),
    );
}

export function findMunicipalityFeature(
  boundaries: FeatureCollection,
  municipalityCode: string,
) {
  return boundaries.features.find(
    (feature) =>
      propertyAsString(feature, MUNICIPALITY_CODE_PROPERTY) ===
      municipalityCode,
  );
}

function isPolygonGeometry(
  geometry: Geometry | null,
): geometry is Extract<Geometry, { type: "Polygon" | "MultiPolygon" }> {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
}

function visitPositions(
  value: Position | Position[] | Position[][] | Position[][][],
  callback: (position: Position) => void,
) {
  if (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    callback(value as Position);
    return;
  }

  for (const child of value as Position[] | Position[][] | Position[][][]) {
    visitPositions(child, callback);
  }
}

function geometryBoundingBox(geometry: PolygonGeometry): BoundingBox {
  const boundingBox: BoundingBox = [Infinity, Infinity, -Infinity, -Infinity];

  visitPositions(geometry.coordinates as Position[][][], (position) => {
    boundingBox[0] = Math.min(boundingBox[0], position[0]);
    boundingBox[1] = Math.min(boundingBox[1], position[1]);
    boundingBox[2] = Math.max(boundingBox[2], position[0]);
    boundingBox[3] = Math.max(boundingBox[3], position[1]);
  });

  return boundingBox;
}

function boundingBoxesOverlap(first: BoundingBox, second: BoundingBox) {
  return !(
    first[2] < second[0] ||
    first[0] > second[2] ||
    first[3] < second[1] ||
    first[1] > second[3]
  );
}

function asPolygonFeature(feature: Feature): PolygonFeature {
  return feature as unknown as PolygonFeature;
}

export function clipFeatureCollectionToMunicipality(
  collection: FeatureCollection,
  municipality: Feature,
): FeatureCollection {
  if (!isPolygonGeometry(municipality.geometry)) {
    throw new Error("O limite municipal não possui uma geometria poligonal.");
  }

  const municipalityFeature = asPolygonFeature(municipality);
  const municipalityBoundingBox = geometryBoundingBox(municipalityFeature.geometry);
  const clippedFeatures: Feature[] = [];

  for (const feature of collection.features) {
    if (!isPolygonGeometry(feature.geometry)) continue;

    const polygonFeature = asPolygonFeature(feature);
    if (
      !boundingBoxesOverlap(
        geometryBoundingBox(polygonFeature.geometry),
        municipalityBoundingBox,
      )
    ) {
      continue;
    }

    const intersection = intersect(
      {
        type: "FeatureCollection",
        features: [polygonFeature, municipalityFeature],
      } satisfies PolygonFeatureCollection,
      { properties: feature.properties ?? {} },
    );

    if (!intersection) continue;

    clippedFeatures.push({
      type: "Feature",
      geometry: intersection.geometry as Geometry,
      properties: feature.properties,
    });
  }

  return { type: "FeatureCollection", features: clippedFeatures };
}

export function filterCollectionsByMunicipality(
  collections: LayerCollections,
  boundaryLayerId: string,
  municipalityCode: string,
): MunicipalityFilterResult {
  const boundaries = collections[boundaryLayerId];
  if (!boundaries) {
    throw new Error("A camada de limites municipais não está disponível.");
  }

  const municipality = findMunicipalityFeature(boundaries, municipalityCode);
  if (!municipality) {
    throw new Error("Município não encontrado na camada de limites.");
  }

  const filteredCollections: LayerCollections = {};
  for (const [layerId, collection] of Object.entries(collections)) {
    filteredCollections[layerId] =
      layerId === boundaryLayerId
        ? { type: "FeatureCollection", features: [municipality] }
        : clipFeatureCollectionToMunicipality(collection, municipality);
  }

  return {
    collections: filteredCollections,
    municipality,
  };
}
