import { t } from "../i18n/t";
import type { VideoBus } from "../types/video-bus";
import {
  MASTER_VIDEO_OUTPUT_ID,
  type VideoOutput,
  type VideoOutputKind,
} from "../types/video-output";
import type { VideoOutputFrame } from "../types/video-output-frame";
import { randomId } from "./random-id";
import { normalizeMasterVideoOutputName, normalizeVideoBuses } from "./video-buses";
import { normalizeVideoOutputFrame, serializeVideoOutputFrame } from "./video-output-frame";

/** Legacy bus row that may still carry destination geometry. */
export type LegacyVideoBusRow = Partial<VideoBus> &
  Pick<VideoBus, "id"> & {
    outputFrame?: VideoOutputFrame;
  };

export function defaultVideoOutputName(outputs: VideoOutput[]): string {
  let index = outputs.length + 1;
  while (
    outputs.some((output) => output.name === t("videoOutput.defaultName", { number: index }))
  ) {
    index += 1;
  }
  return t("videoOutput.defaultName", { number: index });
}

function normalizeKind(kind: string | undefined): VideoOutputKind {
  return kind === "ndi" ? "ndi" : "window";
}

function normalizeVideoOutputFields(
  raw: Partial<VideoOutput> & Pick<VideoOutput, "id">,
  buses: VideoBus[],
): VideoOutput {
  const outputFrame = serializeVideoOutputFrame(normalizeVideoOutputFrame(raw.outputFrame));
  const busId = raw.busId && buses.some((bus) => bus.id === raw.busId) ? raw.busId : undefined;
  return {
    id: raw.id,
    name: raw.name?.trim() || "Untitled output",
    kind: normalizeKind(raw.kind),
    ...(busId ? { busId } : {}),
    ...(outputFrame ? { outputFrame } : {}),
  };
}

export function normalizeVideoOutput(
  raw: Partial<VideoOutput> & Pick<VideoOutput, "id">,
  buses: VideoBus[] = [],
): VideoOutput {
  return normalizeVideoOutputFields(raw, buses);
}

export function normalizeVideoOutputs(
  outputs: VideoOutput[] | undefined,
  buses: VideoBus[],
): VideoOutput[] {
  if (!outputs?.length) return [];
  return outputs.map((output) => normalizeVideoOutputFields(output, buses));
}

export function createVideoOutput(
  outputs: VideoOutput[],
  buses: VideoBus[],
  overrides: Partial<Omit<VideoOutput, "id">> = {},
): VideoOutput {
  return normalizeVideoOutput(
    {
      id: randomId(),
      name: overrides.name ?? defaultVideoOutputName(outputs),
      kind: overrides.kind ?? "window",
      busId: overrides.busId,
      outputFrame: overrides.outputFrame,
    },
    buses,
  );
}

export function findVideoOutput(
  outputs: VideoOutput[],
  id: string | undefined,
): VideoOutput | undefined {
  if (!id) return undefined;
  return outputs.find((output) => output.id === id);
}

/** Resolve which program bus an output shows; undefined = master program. */
export function resolveOutputBusId(
  output: Pick<VideoOutput, "busId">,
  buses: VideoBus[],
): string | undefined {
  if (!output.busId || buses.length === 0) return undefined;
  return buses.some((bus) => bus.id === output.busId) ? output.busId : undefined;
}

/**
 * Ensure at least one window output exists for the master program.
 * Used after load/migration and when the last window output is removed.
 */
export function ensureMasterWindowOutput(
  outputs: VideoOutput[],
  buses: VideoBus[],
  masterName: string,
  masterFrame?: VideoOutputFrame,
): VideoOutput[] {
  const hasWindow = outputs.some((output) => output.kind === "window");
  if (hasWindow) return normalizeVideoOutputs(outputs, buses);

  const frame = serializeVideoOutputFrame(normalizeVideoOutputFrame(masterFrame));
  return normalizeVideoOutputs(
    [
      {
        id: MASTER_VIDEO_OUTPUT_ID,
        name: normalizeMasterVideoOutputName(masterName),
        kind: "window",
        ...(frame ? { outputFrame: frame } : {}),
      },
      ...outputs,
    ],
    buses,
  );
}

/**
 * Migrate legacy projects where each VideoBus was also a destination
 * (and master frame lived on parallel master fields).
 */
export function migrateVideoOutputsFromBuses(
  rawBuses: LegacyVideoBusRow[] | undefined,
  masterName: string,
  masterFrame?: VideoOutputFrame,
  existingOutputs?: VideoOutput[],
): { buses: VideoBus[]; outputs: VideoOutput[] } {
  const buses = normalizeVideoBuses(rawBuses);

  if (existingOutputs && existingOutputs.length > 0) {
    return {
      buses,
      outputs: ensureMasterWindowOutput(
        normalizeVideoOutputs(existingOutputs, buses),
        buses,
        masterName,
      ),
    };
  }

  const masterFrameSerialized = serializeVideoOutputFrame(normalizeVideoOutputFrame(masterFrame));
  const outputs: VideoOutput[] = [
    {
      id: MASTER_VIDEO_OUTPUT_ID,
      name: normalizeMasterVideoOutputName(masterName),
      kind: "window",
      ...(masterFrameSerialized ? { outputFrame: masterFrameSerialized } : {}),
    },
  ];

  for (const raw of rawBuses ?? []) {
    const bus = buses.find((entry) => entry.id === raw.id);
    if (!bus) continue;
    const frame = serializeVideoOutputFrame(normalizeVideoOutputFrame(raw.outputFrame));
    outputs.push({
      // Reuse bus id so legacy ?bus=<id> / output-<id> windows keep working.
      id: bus.id,
      name: bus.name,
      kind: "window",
      busId: bus.id,
      ...(frame ? { outputFrame: frame } : {}),
    });
  }

  return { buses, outputs: normalizeVideoOutputs(outputs, buses) };
}

export function listPublishableVideoOutputIds(outputs: VideoOutput[]): string[] {
  return outputs.map((output) => output.id);
}
