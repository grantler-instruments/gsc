import { beforeEach, describe, expect, it } from "vitest";
import { normalizeAudioBuses } from "../../lib/audio-buses";
import type { AudioEffectType } from "../../types/audio-effect";
import { useProjectStore } from "../project";
import { useUiStore } from "../ui";

beforeEach(() => {
  useUiStore.setState({ showMode: false });
  useProjectStore.setState({
    audioBuses: [
      { id: "music", name: "Music", volume: 1 },
      { id: "voice", name: "Voice", volume: 1 },
    ],
  });
});

const effects = () => useProjectStore.getState().audioBuses[0].effects ?? [];

function addEffect(busId: string, type: AudioEffectType) {
  const effect = useProjectStore.getState().addBusEffect(busId, type);
  if (!effect) throw new Error(`Failed to add ${type}`);
  return effect;
}

describe("bus utilities", () => {
  it("adds, edits, bypasses, reorders, reloads and removes new effects", () => {
    const store = useProjectStore.getState();
    const limiter = addEffect("music", "limiter");
    const ducker = addEffect("music", "ducker");
    const stereo = addEffect("music", "stereo");
    expect(store.addBusEffect("music", "limiter")).toBeNull();
    store.updateBusEffect("music", limiter.id, { params: { ceilingDb: -3 } });
    store.updateBusEffect("music", ducker.id, {
      params: { sourceBusId: "voice", reductionDb: 18 },
    });
    store.updateBusEffect("music", stereo.id, {
      enabled: false,
      params: { mono: true, swap: true },
    });
    expect(effects()[0]).toMatchObject({ type: "limiter", params: { ceilingDb: -3 } });
    expect(effects()[1]).toMatchObject({
      type: "ducker",
      params: { sourceBusId: "voice", reductionDb: 18 },
    });
    expect(effects()[2]).toMatchObject({
      type: "stereo",
      enabled: false,
      params: { mono: true, swap: true },
    });
    store.reorderBusEffectRelative("music", stereo.id, limiter.id, "before");
    expect(effects().map((effect) => effect.type)).toEqual(["stereo", "limiter", "ducker"]);
    const buses = useProjectStore.getState().audioBuses;
    expect(normalizeAudioBuses(JSON.parse(JSON.stringify(buses)))).toEqual(buses);
    store.removeBusEffect("music", limiter.id);
    expect(effects().map((effect) => effect.type)).toEqual(["stereo", "ducker"]);
  });

  it("clears the trigger when its bus is removed", () => {
    const store = useProjectStore.getState();
    const ducker = addEffect("music", "ducker");
    store.updateBusEffect("music", ducker.id, { params: { sourceBusId: "voice" } });
    store.removeAudioBus("voice");
    expect(effects()[0]).toMatchObject({ type: "ducker", params: { sourceBusId: "" } });
  });

  it("rejects self, missing and downstream trigger buses", () => {
    const store = useProjectStore.getState();
    const ducker = addEffect("music", "ducker");
    for (const sourceBusId of ["music", "missing"]) {
      store.updateBusEffect("music", ducker.id, { params: { sourceBusId } });
      expect(effects()[0]).toMatchObject({ params: { sourceBusId: "" } });
    }
    store.updateAudioBus("music", { outputBusId: "voice" });
    store.updateBusEffect("music", ducker.id, { params: { sourceBusId: "voice" } });
    expect(effects()[0]).toMatchObject({ params: { sourceBusId: "" } });
  });

  it("breaks mutual trigger cycles deterministically", () => {
    const store = useProjectStore.getState();
    const music = addEffect("music", "ducker");
    const voice = addEffect("voice", "ducker");
    store.updateBusEffect("music", music.id, { params: { sourceBusId: "voice" } });
    store.updateBusEffect("voice", voice.id, { params: { sourceBusId: "music" } });
    expect(effects()[0]).toMatchObject({ params: { sourceBusId: "voice" } });
    expect(useProjectStore.getState().audioBuses[1].effects?.[0]).toMatchObject({
      params: { sourceBusId: "" },
    });
  });
});
