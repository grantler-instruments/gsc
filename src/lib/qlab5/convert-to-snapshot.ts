import type {
  Cue,
  CueListSnapshot,
  CueType,
  FadeCueType,
  MidiMessageKind,
  OscArg,
  ProjectSnapshot,
} from "../../types/cue";
import { renumberCueList } from "../cues";
import { randomId } from "../random-id";
import { createImportReport, type ImportReport, skipCue, warnImport } from "./import-report";
import type { QLabCue, QLabCueList, QLabWorkspace } from "./types";

const SKIPPED_TYPES = new Set([
  "Script",
  "Text",
  "Timecode",
  "Mic",
  "Start",
  "Pause",
  "Load",
  "Reset",
  "Target",
  "Arm",
  "Disarm",
  "Devamp",
  "Cart",
  "CueList",
  "Camera",
  "Light",
]);

interface ConvertContext {
  idMap: Map<string, string>;
  report: ImportReport;
  listName: string;
  pendingMemo: string | null;
}

function mapMidiKind(messageType: string): MidiMessageKind {
  const normalized = messageType.toLowerCase().replace(/[\s_]+/g, "-");
  if (normalized.includes("note-off")) return "note-off";
  if (normalized.includes("control")) return "control-change";
  if (normalized.includes("program")) return "program-change";
  if (normalized.includes("pitch")) return "pitch-bend";
  if (normalized === "start") return "start";
  if (normalized === "stop") return "stop";
  if (normalized === "continue") return "continue";
  return "note-on";
}

function mapOscArgs(args: Array<{ type: string; value: string | number | boolean }>): OscArg[] {
  const out: OscArg[] = [];
  for (const arg of args) {
    const type = arg.type.toLowerCase();
    if (type === "i" || type === "int" || type === "integer") {
      out.push({ type: "int", value: Number(arg.value) });
    } else if (type === "f" || type === "float") {
      out.push({ type: "float", value: Number(arg.value) });
    } else if (type === "b" || type === "bool" || type === "boolean") {
      out.push({ type: "bool", value: Boolean(arg.value) });
    } else {
      out.push({ type: "string", value: String(arg.value) });
    }
  }
  return out;
}

function gscIdFor(ctx: ConvertContext, qlabId: string): string {
  const existing = ctx.idMap.get(qlabId);
  if (existing) return existing;
  const id = randomId();
  ctx.idMap.set(qlabId, id);
  return id;
}

function containerType(cue: QLabCue): CueType {
  if (cue.groupMode === "timeline") return "sequence";
  if (cue.type === "Sequence") return "sequence";
  return "group";
}

/** QLab often stores every cue-list tab inside a single root "Main Cue List" group. */
function isQlabListRootWrapper(cue: QLabCue): boolean {
  if (cue.type !== "Group" && cue.type !== "Sequence") return false;
  if (cue.children.length === 0) return false;
  if (cue.name === "Main Cue List") return true;
  return !cue.number.trim() && cue.groupMode === "start_all";
}

function effectiveListCues(list: QLabCueList): QLabCue[] {
  if (list.cues.length === 1) {
    const only = list.cues[0];
    if (only && isQlabListRootWrapper(only)) {
      return only.children;
    }
  }
  return list.cues;
}

function convertMemo(ctx: ConvertContext, cue: QLabCue): void {
  const text = cue.notes || cue.name;
  if (ctx.pendingMemo) {
    warnImport(ctx.report, `Multiple Memos before next cue; keeping latest (${cue.number})`);
  }
  ctx.pendingMemo = text;
  skipCue(ctx.report, {
    number: cue.number,
    name: cue.name,
    type: cue.type,
    reason: "Memo imported as notes on the following cue",
    listName: ctx.listName,
  });
}

function cueBase(
  cue: QLabCue,
  ctx: ConvertContext,
  parentId?: string,
): Pick<Cue, "id" | "number" | "name" | "parentId" | "notes"> {
  return {
    id: gscIdFor(ctx, cue.uniqueId || `${ctx.listName}:${cue.number}:${cue.name}`),
    number: "",
    name: cue.name,
    parentId,
    notes: cue.notes || undefined,
  };
}

function applyPendingMemo(cue: Cue, ctx: ConvertContext): Cue {
  if (!ctx.pendingMemo) return cue;
  const merged = { ...cue, notes: ctx.pendingMemo };
  ctx.pendingMemo = null;
  return merged;
}

function convertLeafCue(cue: QLabCue, ctx: ConvertContext, parentId?: string): Cue | Cue[] | null {
  const typeKey = cue.type;

  if (typeKey === "Memo") {
    convertMemo(ctx, cue);
    return null;
  }

  if (SKIPPED_TYPES.has(typeKey)) {
    skipCue(ctx.report, {
      number: cue.number,
      name: cue.name,
      type: cue.type,
      reason: "Cue type not supported in GSC",
      listName: ctx.listName,
    });
    return null;
  }

  if (typeKey === "Audio") {
    return applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: "audio",
        assetPath: cue.fileTarget?.path,
        volume: cue.volume,
        pan: cue.pan,
        fadeIn: cue.fadeInSec || undefined,
        fadeOut: cue.fadeOutSec || undefined,
        inTime: cue.inTimeSec || undefined,
        outTime: cue.outTimeSec || undefined,
        loop: cue.loop || undefined,
      },
      ctx,
    );
  }

  if (typeKey === "Video" || typeKey === "Camera") {
    if (typeKey === "Camera") {
      warnImport(ctx.report, `Camera cue ${cue.number} imported as video`);
    }
    return applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: "video",
        assetPath: cue.fileTarget?.path,
        opacity: cue.opacity,
        fadeIn: cue.fadeInSec || undefined,
        fadeOut: cue.fadeOutSec || undefined,
        inTime: cue.inTimeSec || undefined,
        outTime: cue.outTimeSec || undefined,
        loop: cue.loop || undefined,
      },
      ctx,
    );
  }

  if (typeKey === "Wait") {
    return applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: "wait",
        waitDurationSec: cue.durationSec || cue.postWaitSec || 1,
        notes: cue.notes || undefined,
      },
      ctx,
    );
  }

  if (typeKey === "Stop") {
    const stopTargetId = cue.targetUniqueId ? ctx.idMap.get(cue.targetUniqueId) : undefined;
    if (cue.targetUniqueId && !stopTargetId) {
      warnImport(ctx.report, `Stop cue ${cue.number} target not yet mapped`);
    }
    return applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: "stop",
        stopTargetId,
        notes: cue.notes || undefined,
      },
      ctx,
    );
  }

  if (typeKey === "Fade") {
    const targetId = cue.targetUniqueId ? ctx.idMap.get(cue.targetUniqueId) : undefined;
    const fadeType: FadeCueType = cue.fadeOpacity ? "opacityFade" : "volumeFade";
    const fadeCue = applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: fadeType,
        fadeTargetId: targetId,
        fadeDuration: cue.durationSec || 1,
        fadeFrom: cue.fadeFrom ?? undefined,
        fadeTo: cue.fadeTo ?? 0,
        notes: cue.notes || undefined,
      },
      ctx,
    );

    if (cue.stopTargetWhenDone && targetId) {
      const fadeId = fadeCue.id;
      const sequenceId = randomId();
      return [
        {
          id: sequenceId,
          number: "",
          name: cue.name,
          type: "sequence",
          parentId,
          notes: cue.notes || undefined,
        },
        {
          ...fadeCue,
          id: fadeId,
          parentId: sequenceId,
          number: "",
          notes: undefined,
        },
        {
          id: randomId(),
          number: "",
          name: "Stop",
          type: "stop",
          parentId: sequenceId,
          stopTargetId: targetId,
        },
      ];
    }

    return fadeCue;
  }

  if (typeKey === "MIDI" && cue.midi) {
    return applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: "midi",
        midi: {
          channel: cue.midi.channel,
          kind: mapMidiKind(cue.midi.messageType),
          note: cue.midi.note,
          velocity: cue.midi.velocity,
          controller: cue.midi.controller,
          value: cue.midi.value,
          program: cue.midi.program,
        },
        notes: cue.notes || undefined,
      },
      ctx,
    );
  }

  if (typeKey === "Network" && cue.osc) {
    return applyPendingMemo(
      {
        ...cueBase(cue, ctx, parentId),
        type: "osc",
        osc: {
          host: cue.osc.host,
          port: cue.osc.port,
          address: cue.osc.address,
          args: mapOscArgs(cue.osc.args),
        },
        notes: cue.notes || undefined,
      },
      ctx,
    );
  }

  skipCue(ctx.report, {
    number: cue.number,
    name: cue.name,
    type: cue.type,
    reason: "Could not map cue data",
    listName: ctx.listName,
  });
  return null;
}

function insertPreWait(cues: Cue[], preWaitSec: number, parentId: string | undefined): void {
  if (preWaitSec <= 0) return;
  cues.push({
    id: randomId(),
    number: "",
    name: "Pre-wait",
    type: "wait",
    parentId,
    waitDurationSec: preWaitSec,
  });
}

function convertCueTree(cue: QLabCue, ctx: ConvertContext, parentId?: string): Cue[] {
  const out: Cue[] = [];
  const isContainer =
    cue.type === "Group" ||
    cue.type === "Sequence" ||
    (cue.children.length > 0 && (cue.groupMode !== null || cue.type === "Group"));

  if (isContainer && cue.children.length > 0) {
    const containerId = gscIdFor(ctx, cue.uniqueId || `${ctx.listName}:${cue.number}:container`);
    out.push({
      ...cueBase(cue, ctx, parentId),
      id: containerId,
      type: containerType(cue),
    });
    for (const child of cue.children) {
      insertPreWait(out, child.preWaitSec, containerId);
      out.push(...convertCueTree(child, ctx, containerId));
    }
    return out;
  }

  insertPreWait(out, cue.preWaitSec, parentId);
  const leaf = convertLeafCue(cue, ctx, parentId);
  if (leaf) {
    if (Array.isArray(leaf)) out.push(...leaf);
    else out.push(leaf);
  }
  return out;
}

function convertCueList(list: QLabCueList, ctx: ConvertContext): CueListSnapshot {
  ctx.listName = list.name;
  ctx.pendingMemo = null;
  const cues: Cue[] = [];

  if (list.isCart) {
    warnImport(ctx.report, `Cart "${list.name}" imported as a cue list`);
  }

  for (const cue of effectiveListCues(list)) {
    cues.push(...convertCueTree(cue, ctx));
  }

  ctx.report.importedCueCount += cues.length;
  return {
    id: randomId(),
    name: list.isCart ? `${list.name} (cart)` : list.name,
    cues: renumberCueList(cues),
  };
}

export interface ConvertResult {
  snapshot: ProjectSnapshot;
  report: ImportReport;
  qlabIdToGscId: Map<string, string>;
}

export function convertQlabWorkspaceToSnapshot(workspace: QLabWorkspace): ConvertResult {
  const report = createImportReport();
  const idMap = new Map<string, string>();
  const ctx: ConvertContext = {
    idMap,
    report,
    listName: "",
    pendingMemo: null,
  };

  const cueLists = workspace.cueLists.map((list) => convertCueList(list, ctx));
  report.importedListCount = cueLists.length;

  const activeListIndex = workspace.cueLists.findIndex(
    (list) => list.uniqueId === workspace.currentCueListId,
  );
  const activeList = cueLists[activeListIndex >= 0 ? activeListIndex : 0];

  const snapshot: ProjectSnapshot = {
    version: 2,
    id: randomId(),
    name: workspace.name,
    description: workspace.archiveVersion
      ? `Imported from QLab 5 (${workspace.archiveVersion})`
      : "Imported from QLab 5",
    cueLists,
    activeCueListId: activeList?.id ?? cueLists[0]?.id ?? randomId(),
  };

  return { snapshot, report, qlabIdToGscId: idMap };
}
