export const DEFAULT_AUDIO_MIXER_HEIGHT = 300;
export const MIN_AUDIO_MIXER_HEIGHT = 160;
export const MAX_AUDIO_MIXER_HEIGHT = 560;

/** Space reserved for toolbar, transport bar, and minimum cue list area. */
const MIXER_HEIGHT_VIEWPORT_MARGIN = 160;

export function clampAudioMixerHeight(height: number): number {
  const maxHeight =
    typeof window === "undefined"
      ? MAX_AUDIO_MIXER_HEIGHT
      : Math.max(
          MIN_AUDIO_MIXER_HEIGHT,
          Math.min(MAX_AUDIO_MIXER_HEIGHT, window.innerHeight - MIXER_HEIGHT_VIEWPORT_MARGIN),
        );

  return Math.round(Math.max(MIN_AUDIO_MIXER_HEIGHT, Math.min(maxHeight, height)));
}
