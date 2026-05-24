import type { CueType } from "../types/cue";

export type FeatureKey = {
  key: string;
  descKey: string;
  /** When set, the card shows the app cue-type icon and colors. */
  cueType?: CueType;
};

export type FeatureCategoryKey = {
  key: string;
  features: FeatureKey[];
};

export const featureCategoryKeys: FeatureCategoryKey[] = [
  {
    key: "categoryCueTypes",
    features: [
      { key: "featureAudioTitle", descKey: "featureAudioDesc", cueType: "audio" },
      { key: "featureVideoTitle", descKey: "featureVideoDesc", cueType: "video" },
      { key: "featureImageTitle", descKey: "featureImageDesc", cueType: "image" },
      { key: "featureMidiTitle", descKey: "featureMidiDesc", cueType: "midi" },
      { key: "featureOscTitle", descKey: "featureOscDesc", cueType: "osc" },
      { key: "featureWaitTitle", descKey: "featureWaitDesc", cueType: "wait" },
      { key: "featureStopTitle", descKey: "featureStopDesc", cueType: "stop" },
      { key: "featureVolumeFadeTitle", descKey: "featureVolumeFadeDesc", cueType: "volumeFade" },
      { key: "featureOpacityFadeTitle", descKey: "featureOpacityFadeDesc", cueType: "opacityFade" },
      { key: "featureParallelTitle", descKey: "featureParallelDesc", cueType: "group" },
      { key: "featureSequenceTitle", descKey: "featureSequenceDesc", cueType: "sequence" },
    ],
  },
  {
    key: "categoryShowBuilding",
    features: [
      { key: "featureOrganizeTitle", descKey: "featureOrganizeDesc" },
      { key: "featureImportTitle", descKey: "featureImportDesc" },
      { key: "featureTrimTitle", descKey: "featureTrimDesc" },
    ],
  },
  {
    key: "categoryPlaybackControl",
    features: [
      { key: "featureGoTitle", descKey: "featureGoDesc" },
      { key: "featureActiveTitle", descKey: "featureActiveDesc" },
      { key: "featureShowModeTitle", descKey: "featureShowModeDesc" },
    ],
  },
  {
    key: "categoryOutputProjects",
    features: [
      { key: "featureOutputTitle", descKey: "featureOutputDesc" },
      { key: "featureControlTitle", descKey: "featureControlDesc" },
      { key: "featurePortableTitle", descKey: "featurePortableDesc" },
    ],
  },
];
