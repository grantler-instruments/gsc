import type { DmxCueData } from "../types/cue";
import type { Fixture } from "../types/fixture";
import { updateDmxFixtureChannelValues } from "./dmx";
import {
  detectFixturePositionAxesFromFixture,
  isMovingHeadFixture,
  resolveFixtureHomePosition,
  writeFixturePositionDegrees,
} from "./fixture-position";

export function homePositionUpdatesForFixture(fixture: Fixture) {
  const axes = detectFixturePositionAxesFromFixture(fixture);
  if (!axes) return null;
  const home = resolveFixtureHomePosition(fixture, axes);
  return writeFixturePositionDegrees(axes, home);
}

/** Apply saved (or default) home pan/tilt to every moving head in a DMX cue. */
export function applyHomeToAllMovingHeadsInCue(data: DmxCueData, fixtures: Fixture[]): DmxCueData {
  let next = data;
  for (const entry of data.fixtures) {
    const fixture = fixtures.find((item) => item.id === entry.fixtureId);
    if (!fixture || !isMovingHeadFixture(fixture)) continue;
    const updates = homePositionUpdatesForFixture(fixture);
    if (!updates?.length) continue;
    next = updateDmxFixtureChannelValues(next, entry.fixtureId, updates);
  }
  return next;
}
