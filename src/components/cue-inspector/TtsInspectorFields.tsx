import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { clearCachedAudioBuffer } from "../../audio/buffer-cache";
import { formatAppError, notifyError } from "../../lib/notifications";
import {
  DEFAULT_TTS_SPEED,
  getTtsEngine,
  getTtsGeneratedKey,
  getTtsVoiceOptions,
  isTtsCue,
  isTtsGenerationStale,
  resolveTtsLang,
  resolveTtsVoice,
  SUPERTONIC_LANG_OPTIONS,
  TTS_AUTO_GENERATE_DEBOUNCE_MS,
  ttsAssetPath,
} from "../../lib/tts";
import { importGeneratedAudioAsset } from "../../lib/tts-asset";
import {
  generateSpeechWav,
  getActiveSpeechBackendLabel,
  type SpeechGeneratePhase,
} from "../../lib/tts-engine";
import { useSpeechModelStore } from "../../stores/speech-model";
import type { Cue } from "../../types/cue";
import { SliderNumberField } from "../SliderNumberField";
import { AudioBusSelect } from "./AudioBusSelect";

interface TtsInspectorFieldsProps {
  cue: Cue;
  readOnly: boolean;
  onChange: (patch: Partial<Cue>) => void;
}

export function TtsInspectorFields({ cue, readOnly, onChange }: TtsInspectorFieldsProps) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);
  const [generatingSeconds, setGeneratingSeconds] = useState(0);
  const [generatePhase, setGeneratePhase] = useState<SpeechGeneratePhase | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [lastGenerateMs, setLastGenerateMs] = useState<number | null>(null);

  const engine = getTtsEngine();
  const voiceOptions = useMemo(() => getTtsVoiceOptions(engine), [engine]);
  const voice = resolveTtsVoice(cue.ttsVoice, engine);
  const lang = resolveTtsLang(cue.ttsLang, engine);

  const isTts = isTtsCue(cue);
  const stale = isTts && isTtsGenerationStale(cue);

  const backend = getActiveSpeechBackendLabel();
  const speechModelLoading = useSpeechModelStore(
    (s) => s.status === "loading" && !s.userDownloadActive,
  );

  useEffect(() => {
    if (!generating) {
      setGeneratingSeconds(0);
      setGeneratePhase(null);
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
    setGeneratePhase(null);
    const started = performance.now();
    try {
      const resolvedVoice = resolveTtsVoice(cue.ttsVoice, engine);
      const resolvedLang = resolveTtsLang(cue.ttsLang, engine);
      const speed = cue.ttsSpeed ?? DEFAULT_TTS_SPEED;
      const blob = await generateSpeechWav({
        text,
        voice: resolvedVoice,
        lang: resolvedLang,
        speed,
        onPhase: setGeneratePhase,
      });
      const path = ttsAssetPath(cue.id);
      if (cue.assetPath && cue.assetPath !== path) {
        clearCachedAudioBuffer(cue.assetPath);
      }
      await importGeneratedAudioAsset(path, blob);
      clearCachedAudioBuffer(path);
      onChange({
        assetPath: path,
        ttsVoice: resolvedVoice,
        ttsLang: resolvedLang,
        ttsGeneratedKey: getTtsGeneratedKey({
          ...cue,
          ttsText: text,
          ttsVoice: resolvedVoice,
          ttsLang: resolvedLang,
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
  }, [cue, readOnly, onChange, t, engine]);

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

      {engine === "supertonic" ? (
        <TextField
          select
          label={t("tts.language")}
          size="small"
          fullWidth
          value={lang}
          disabled={readOnly}
          onChange={(e) => onChange({ ttsLang: e.target.value })}
          sx={{ mb: 1 }}
        >
          {SUPERTONIC_LANG_OPTIONS.map((code) => (
            <MenuItem key={code} value={code}>
              {code === "na"
                ? t("tts.languageAgnostic")
                : t(`tts.lang.${code}`, { defaultValue: code })}
            </MenuItem>
          ))}
        </TextField>
      ) : null}

      <TextField
        select
        label={t("tts.voice")}
        size="small"
        fullWidth
        value={voice}
        disabled={readOnly}
        onChange={(e) => onChange({ ttsVoice: e.target.value })}
        sx={{ mb: 1 }}
      >
        {voiceOptions.map((voiceId) => (
          <MenuItem key={voiceId} value={voiceId}>
            {voiceId}
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
          ? speechModelLoading || generatePhase === "loading-model" || !backend
            ? t("tts.generatingLoadingModel", { seconds: generatingSeconds || 1 })
            : generatePhase === "fallback-wasm"
              ? t("tts.generatingFallbackWasm", { seconds: generatingSeconds || 1 })
              : t("tts.generatingElapsed", { seconds: generatingSeconds || 1 })
          : t("tts.generate")}
      </Button>

      {backend === "supertonic" ? (
        <Typography variant="caption" color="text.secondary">
          {t("tts.inferenceBackendSupertonic")}
        </Typography>
      ) : backend ? (
        <Typography variant="caption" color="text.secondary">
          {backend === "webgpu" ? t("tts.inferenceBackendWebGpu") : t("tts.inferenceBackendWasm")}
        </Typography>
      ) : null}

      {generating && backend === "wasm" && generatePhase === "synthesizing" ? (
        <Typography variant="caption" color="text.secondary">
          {t("tts.generatingWasmHint")}
        </Typography>
      ) : null}

      {engine === "kokoro" ? (
        <Typography variant="caption" color="text.secondary">
          {t("tts.webEnglishOnlyHint")}
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

      <AudioBusSelect
        value={cue.audioBusId}
        readOnly={readOnly}
        onChange={(audioBusId) => onChange({ audioBusId })}
      />
    </>
  );
}
