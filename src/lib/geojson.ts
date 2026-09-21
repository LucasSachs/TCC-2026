export type Position = [number, number] | [number, number, number];

export type Geometry =
  | { type: "Point"; coordinates: Position }
  | { type: "MultiPoint"; coordinates: Position[] }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "MultiLineString"; coordinates: Position[][] }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] }
  | { type: "GeometryCollection"; geometries: Geometry[] };

export type Feature = {
  type: "Feature";
  geometry: Geometry | null;
  properties: Record<string, unknown> | null;
};

export type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

const EARTH_RADIUS_IN_METERS = 6_378_137;

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function ringAreaInSquareMeters(ring: Position[]) {
  if (ring.length < 3) return 0;

  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const lower = ring[index];
    const middle = ring[(index + 1) % ring.length];
    const upper = ring[(index + 2) % ring.length];

    area +=
      (radians(upper[0]) - radians(lower[0])) * Math.sin(radians(middle[1]));
  }

  return (area * EARTH_RADIUS_IN_METERS * EARTH_RADIUS_IN_METERS) / 2;
}

function polygonAreaInSquareMeters(coordinates: Position[][]) {
  if (coordinates.length === 0) return 0;

  const [outerRing, ...holes] = coordinates;
  const outerArea = Math.abs(ringAreaInSquareMeters(outerRing));
  const holesArea = holes.reduce(
    (total, ring) => total + Math.abs(ringAreaInSquareMeters(ring)),
    0,
  );

  return Math.max(outerArea - holesArea, 0);
}

export function geometryAreaInSquareMeters(geometry: Geometry | null): number {
  if (!geometry) return 0;

  if (geometry.type === "Polygon") {
    return polygonAreaInSquareMeters(geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.reduce(
      (total, polygon) => total + polygonAreaInSquareMeters(polygon),
      0,
    );
  }

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.reduce(
      (total, childGeometry) =>
        total + geometryAreaInSquareMeters(childGeometry),
      0,
    );
  }

  return 0;
}

export function featureCollectionAreaInSquareMeters(
  collection: FeatureCollection,
) {
  return collection.features.reduce(
    (total, feature) => total + geometryAreaInSquareMeters(feature.geometry),
    0,
  );
}

export function emptyFeatureCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

export function getPropertyAsString(
  properties: Record<string, unknown> | null,
  keys: string[],
) {
  if (!properties) return null;

  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number") {
      return String(value);
    }
  }

  return null;
}
