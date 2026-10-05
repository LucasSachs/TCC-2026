/// <reference lib="webworker" />

import {
  filterCollectionsByMunicipality,
  type LayerCollections,
  type MunicipalityFilterResult,
  type MunicipalityFilterWorkerRequest,
  type MunicipalityFilterWorkerResponse,
} from "@/lib/municipality-filter";

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

let boundaryLayerId: string | null = null;
let collections: LayerCollections = {};
const resultCache = new Map<string, MunicipalityFilterResult>();

function respond(message: MunicipalityFilterWorkerResponse) {
  workerScope.postMessage(message);
}

workerScope.onmessage = (
  event: MessageEvent<MunicipalityFilterWorkerRequest>,
) => {
  const message = event.data;

  if (message.type === "initialize") {
    boundaryLayerId = message.boundaryLayerId;
    collections = message.collections;
    resultCache.clear();
    respond({ type: "ready" });
    return;
  }

  if (!boundaryLayerId) {
    respond({
      type: "error",
      requestId: message.requestId,
      municipalityCode: message.municipalityCode,
      message: "O filtro municipal ainda não foi inicializado.",
    });
    return;
  }

  try {
    const cachedResult = resultCache.get(message.municipalityCode);
    const result =
      cachedResult ??
      filterCollectionsByMunicipality(
        collections,
        boundaryLayerId,
        message.municipalityCode,
      );

    if (!cachedResult) resultCache.set(message.municipalityCode, result);

    respond({
      type: "result",
      requestId: message.requestId,
      municipalityCode: message.municipalityCode,
      result,
    });
  } catch (error) {
    respond({
      type: "error",
      requestId: message.requestId,
      municipalityCode: message.municipalityCode,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível aplicar o filtro municipal.",
    });
  }
};
