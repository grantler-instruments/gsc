export type FixtureRenderKind = "dimmer" | "rgb" | "abstract";

export interface FixturePlotChannelMap {
  intensity?: number;
  red?: number;
  green?: number;
  blue?: number;
}

export interface FixturePlotEntry {
  fixtureId: string;
  /** 0–1 normalized x on the plot canvas. */
  x: number;
  /** 0–1 normalized y on the plot canvas. */
  y: number;
  /** Normalized diameter on the plot canvas. */
  size: number;
  render: FixtureRenderKind;
  channelMap?: FixturePlotChannelMap;
}

export interface FixturePlot {
  /** Optional background image for venue layout. */
  backgroundAssetPath?: string;
  entries: FixturePlotEntry[];
}
