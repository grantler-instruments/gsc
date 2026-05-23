import type { CueType } from "../types/cue";

export type Feature = {
  title: string;
  description: string;
  /** When set, the card shows the app cue-type icon and colors. */
  cueType?: CueType;
};

export type FeatureCategory = {
  name: string;
  features: Feature[];
};

export const featureCategories: FeatureCategory[] = [
  {
    name: "Cue types",
    features: [
      {
        cueType: "audio",
        title: "Audio",
        description:
          "Play sound files from your project — WAV, MP3, and more — with trim and fade in/out.",
      },
      {
        cueType: "video",
        title: "Video",
        description:
          "Roll video cues with in/out points and send them to the operator preview or audience output.",
      },
      {
        cueType: "image",
        title: "Image",
        description:
          "Show stills on the visual stage and output window for titles, backdrops, or interstitials.",
      },
      {
        cueType: "midi",
        title: "MIDI",
        description:
          "Send note, control change, and program change messages on GO to your MIDI gear.",
      },
      {
        cueType: "osc",
        title: "OSC",
        description:
          "Send Open Sound Control messages on GO — each cue carries its own destination, address, and arguments. Available in the desktop app only; not available in the web.",
      },
      {
        cueType: "wait",
        title: "Wait",
        description:
          "Timed pauses between steps inside a sequence — hold the show without manual timing.",
      },
      {
        cueType: "stop",
        title: "Stop",
        description:
          "Stop specific playback or layers when you need a clean cut, not a full panic.",
      },
      {
        cueType: "volumeFade",
        title: "Volume fade",
        description: "Automate audio level changes over time with a dedicated fade cue.",
      },
      {
        cueType: "opacityFade",
        title: "Opacity fade",
        description: "Automate visual opacity over time for video and image cues.",
      },
      {
        cueType: "group",
        title: "Parallel",
        description:
          "A container for parallel cues — one GO fires every child in the group at the same time.",
      },
      {
        cueType: "sequence",
        title: "Sequence",
        description:
          "A container that runs steps in order — each step can hold one or more parallel cues, with waits between steps.",
      },
    ],
  },
  {
    name: "Show building",
    features: [
      {
        title: "Organize with cue lists",
        description: "Split long productions into multiple tabbed lists within a single project.",
      },
      {
        title: "Import media by drag-and-drop",
        description:
          "Drop WAV, MP3, MP4, PNG, and more into the asset library and wire them to cues.",
      },
      {
        title: "Trim with waveforms",
        description: "Set precise in and out points on audio and video with a visual editor.",
      },
    ],
  },
  {
    name: "Playback & control",
    features: [
      {
        title: "GO when you’re ready",
        description:
          "Large GO and panic controls, keyboard shortcuts, and master volume for the booth.",
      },
      {
        title: "See what’s playing",
        description:
          "Active-cue panel, progress, and a live preview so you always know show state.",
      },
      {
        title: "Lock in show mode",
        description: "Hide editing chrome and focus on firing cues during the performance.",
      },
    ],
  },
  {
    name: "Output, MIDI, OSC & projects",
    features: [
      {
        title: "Drive a second screen",
        description:
          "Open a dedicated output window for audience video and images on another display.",
      },
      {
        title: "Control with MIDI & OSC",
        description:
          "Send MIDI and OSC from cues and map hardware to GO, cue select, and panic. OSC requires the desktop app — it is not available in the web.",
      },
      {
        title: "Take shows anywhere",
        description: "Export portable .gsc.zip bundles with media included for web or desktop.",
      },
    ],
  },
];
