import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearCachedAudioBuffer } from "../../audio/buffer-cache";
import { generateSpeechWav, getLoadedKokoroDevice } from "../../lib/kokoro-engine";
import { formatAppError, notifyError } from "../../lib/notifications";
import {
  DEFAULT_TTS_SPEED,
  DEFAULT_TTS_VOICE,
  getTtsGeneratedKey,
  isTtsCue,
  isTtsGenerationStale,
  TTS_AUTO_GENERATE_DEBOUNCE_MS,
  TTS_VOICE_OPTIONS,
  ttsAssetPath,
} from "../../lib/tts";
import { importGeneratedAudioAsset } from "../../lib/tts-asset";
import { useSpeechModelStore } from "../../stores/speech-model";
import type { Cue } from "../../types/cue";
import { SliderNumberField } from "../SliderNumberField";

interface TtsInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function TtsInspectorFields({ cue, readOnly, onChange }: TtsInspectorFieldsProps) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [generatingSeconds, setGeneratingSeconds] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [lastGenerateMs, setLastGenerateMs] = useState<number | null>(null);

  const isTts = isTtsCue(cue);
  const stale = isTts && isTtsGenerationStale(cue);

  const inferenceDevice = getLoadedKokoroDevice();
  const speechModelLoading = useSpeechModelStore(
    (s) => s.status === "loading" && !s.userDownloadActive,
  );

  useEffect(() => {
    if (!generating) {
      setGeneratingSeconds(0);
      return;
    }
    const started = performance.now();
    const timer = window.setInterval(() => {
      setGeneratingSeconds(Math.max(1, Math.floor((performance.now() - started) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [generating]);

  const handleGenerate = useCallback(async () => {
    if (!isTtsCue(cue)) return;
    const text = cue.ttsText?.trim();
    if (!text || readOnly || !isTtsGenerationStale(cue)) return;

    setGenerating(true);
    setGenerateError(null);
    const started = performance.now();
    try {
      const voice = cue.ttsVoice ?? DEFAULT_TTS_VOICE;
      const speed = cue.ttsSpeed ?? DEFAULT_TTS_SPEED;
      const blob = await generateSpeechWav({ text, voice, speed });
      const path = ttsAssetPath(cue.id);
      if (cue.assetPath && cue.assetPath !== path) {
        clearCachedAudioBuffer(cue.assetPath);
      }
      await importGeneratedAudioAsset(path, blob);
      clearCachedAudioBuffer(path);
      onChange({
        assetPath: path,
        ttsGeneratedKey: getTtsGeneratedKey({
          ...cue,
          ttsText: text,
          ttsVoice: voice,
          ttsSpeed: speed,
        }),
      });
      setLastGenerateMs(Math.round(performance.now() - started));
    } catch (err) {
      const message = formatAppError(err);
      setGenerateError(message);
      notifyError(`${t("tts.generateFailed")}: ${message}`);
    } finally {
      setGenerating(false);
    }
  }, [cue, readOnly, onChange, t]);

  useEffect(() => {
    if (!isTts || readOnly || generating || !cue.ttsText?.trim() || !stale) return;

    const timer = window.setTimeout(() => {
      void handleGenerate();
    }, TTS_AUTO_GENERATE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [isTts, readOnly, generating, stale, cue.ttsText, handleGenerate]);

  if (!isTts) return null;

  return (
    <>
      <TextField
        label={t("tts.text")}
        multiline
        minRows={3}
        maxRows={8}
        fullWidth
        size="small"
        value={cue.ttsText ?? ""}
        disabled={readOnly}
        onChange={(e) => onChange({ ttsText: e.target.value })}
        placeholder={t("tts.textPlaceholder")}
        sx={{ mb: 1 }}
      />

      <TextField
        select
        label={t("tts.voice")}
        size="small"
        fullWidth
        value={cue.ttsVoice ?? DEFAULT_TTS_VOICE}
        disabled={readOnly}
        onChange={(e) => onChange({ ttsVoice: e.target.value })}
        sx={{ mb: 1 }}
      >
        {TTS_VOICE_OPTIONS.map((voice) => (
          <MenuItem key={voice} value={voice}>
            {voice}
          </MenuItem>
        ))}
      </TextField>

      <SliderNumberField
        label={t("tts.speed")}
        value={cue.ttsSpeed ?? DEFAULT_TTS_SPEED}
        min={0.5}
        max={2}
        step={0.05}
        readOnly={readOnly}
        onChange={(ttsSpeed) => onChange({ ttsSpeed })}
        inputWidth={48}
      />

      <Button
        variant="contained"
        disabled={readOnly || generating || !cue.ttsText?.trim() || !stale}
        onClick={() => void handleGenerate()}
        startIcon={generating ? <CircularProgress size={16} color="inherit" /> : undefined}
        sx={{ alignSelf: "flex-start" }}
      >
        {generating
          ? speechModelLoading || !inferenceDevice
            ? t("tts.generatingLoadingModel", { seconds: generatingSeconds || 1 })
            : t("tts.generatingElapsed", { seconds: generatingSeconds || 1 })
          : t("tts.generate")}
      </Button>

      {inferenceDevice ? (
        <Typography variant="caption" color="text.secondary">
          {inferenceDevice === "webgpu"
            ? t("tts.inferenceBackendWebGpu")
            : t("tts.inferenceBackendWasm")}
        </Typography>
      ) : null}

      {generating && inferenceDevice === "wasm" ? (
        <Typography variant="caption" color="text.secondary">
          {t("tts.generatingWasmHint")}
        </Typography>
      ) : null}

      {generateError ? (
        <Typography variant="body2" color="error" sx={{ whiteSpace: "pre-wrap" }}>
          {generateError}
        </Typography>
      ) : null}

      {stale && cue.ttsText?.trim() ? (
        <Typography variant="caption" color="warning.main">
          {t("tts.staleHint")}
        </Typography>
      ) : null}

      {lastGenerateMs !== null && !generating ? (
        <Typography variant="caption" color="text.secondary">
          {t("tts.generatedIn", { ms: lastGenerateMs })}
        </Typography>
      ) : null}

      <SliderNumberField
        label={t("inspector.volume")}
        value={cue.volume ?? 1}
        min={0}
        max={1}
        step={0.01}
        readOnly={readOnly}
        onChange={(volume) => onChange({ volume })}
        inputWidth={48}
      />

      <SliderNumberField
        label={t("inspector.pan")}
        value={cue.pan ?? 0}
        min={-1}
        max={1}
        step={0.01}
        readOnly={readOnly}
        onChange={(pan) => onChange({ pan })}
        inputWidth={48}
      />
    </>
  );
}
