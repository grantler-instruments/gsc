import type { CueType } from "../types/cue";
import { NDI_ENABLED } from "../types/ndi";

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
      { key: "featureLightTitle", descKey: "featureLightDesc", cueType: "dmx" },
      { key: "featureWaitTitle", descKey: "featureWaitDesc", cueType: "wait" },
      { key: "featureStopTitle", descKey: "featureStopDesc", cueType: "stop" },
      { key: "featureVolumeFadeTitle", descKey: "featureVolumeFadeDesc", cueType: "volumeFade" },
      { key: "featureOpacityFadeTitle", descKey: "featureOpacityFadeDesc", cueType: "opacityFade" },
      { key: "featurePanFadeTitle", descKey: "featurePanFadeDesc", cueType: "panFade" },
      { key: "featureLightFadeTitle", descKey: "featureLightFadeDesc", cueType: "lightFade" },
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
      { key: "featureQlabImportTitle", descKey: "featureQlabImportDesc" },
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
      { key: "featureLightingTitle", descKey: "featureLightingDesc" },
      ...(NDI_ENABLED
        ? [{ key: "featureNdiTitle", descKey: "featureNdiDesc" } satisfies FeatureKey]
        : []),
      { key: "featureRemoteViewTitle", descKey: "featureRemoteViewDesc" },
      { key: "featureRemoteControlTitle", descKey: "featureRemoteControlDesc" },
      { key: "featureControlTitle", descKey: "featureControlDesc" },
      { key: "featurePortableTitle", descKey: "featurePortableDesc" },
    ],
  },
];
