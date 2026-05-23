import { useMemo } from "react";
import {
  groupDmxOutputChannelsByFixture,
  listDmxOutputChannels,
} from "../lib/dmx-output";
import { useDmxOutputStore } from "../stores/dmx-output";
import { useFadeStore } from "../stores/fade";
import { useProjectStore } from "../stores/project";

/** Live DMX levels keyed by fixture id. */
export function useFixturePlotValues(): Map<string, number[]> {
  const fixtures = useProjectStore((s) => s.fixtures);
  const revision = useDmxOutputStore((s) => s.revision);
  const fadeFrameMs = useFadeStore((s) => s.frameMs);

  return useMemo(() => {
    void revision;
    void fadeFrameMs;
    const groups = groupDmxOutputChannelsByFixture(
      listDmxOutputChannels(fixtures),
    );
    return new Map(
      groups.map((group) => [
        group.fixtureId,
        group.channels.map((channel) => channel.value),
      ]),
    );
  }, [fixtures, revision, fadeFrameMs]);
}
