import type { Fixture } from "../types/fixture";
import { fixtureChannelLabel, getDmxChannelLevel } from "./dmx";
import { fixtureChannelAddress } from "./fixtures";

export interface DmxOutputChannel {
  fixtureId: string;
  fixtureName: string;
  universe: number;
  address: number;
  channelIndex: number;
  label?: string;
  value: number;
}

export function listDmxOutputChannels(fixtures: Fixture[]): DmxOutputChannel[] {
  return fixtures
    .flatMap((fixture) =>
      Array.from({ length: fixture.channelCount }, (_, channelIndex) => {
        const address = fixtureChannelAddress(fixture, channelIndex);
        return {
          fixtureId: fixture.id,
          fixtureName: fixture.name,
          universe: fixture.universe,
          address,
          channelIndex,
          label: fixtureChannelLabel(fixture, channelIndex),
          value: getDmxChannelLevel(fixture.universe, address),
        };
      }),
    )
    .sort(
      (a, b) =>
        a.universe - b.universe ||
        a.address - b.address ||
        a.fixtureName.localeCompare(b.fixtureName),
    );
}

export function groupDmxOutputChannelsByFixture(
  channels: DmxOutputChannel[],
): Array<{ fixtureId: string; fixtureName: string; channels: DmxOutputChannel[] }> {
  const groups = new Map<
    string,
    { fixtureId: string; fixtureName: string; channels: DmxOutputChannel[] }
  >();

  for (const channel of channels) {
    let group = groups.get(channel.fixtureId);
    if (!group) {
      group = {
        fixtureId: channel.fixtureId,
        fixtureName: channel.fixtureName,
        channels: [],
      };
      groups.set(channel.fixtureId, group);
    }
    group.channels.push(channel);
  }

  return [...groups.values()];
}
