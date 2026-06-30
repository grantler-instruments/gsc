import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  closeAudioInputStream,
  DEFAULT_AUDIO_INPUT_ID,
  ensureAudioInputAccess,
  isAudioInputSupported,
  isDefaultAudioInputId,
  listAudioInputDevices,
  openAudioInputStream,
} from "../lib/audio-input";
import {
  AudioRecorder,
  AudioRecorderStopError,
  recordingFilenameForCue,
} from "../lib/audio-recorder";
import { inspectorHintSx } from "./inspectorSx";

interface AudioRecorderDialogProps {
  open: boolean;
  cueName: string;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}

export function AudioRecorderDialog({ open, cueName, onClose, onSave }: AudioRecorderDialogProps) {
  const { t } = useTranslation();
  const recorderRef = useRef<AudioRecorder | null>(null);
  const inputStreamRef = useRef<MediaStream | null>(null);
  const activeInputIdRef = useRef(DEFAULT_AUDIO_INPUT_ID);
  const rafRef = useRef<number | null>(null);

  const [devices, setDevices] = useState<{ id: string; label: string }[]>([]);
  const [deviceId, setDeviceId] = useState(DEFAULT_AUDIO_INPUT_ID);
  const [inputsLoading, setInputsLoading] = useState(false);
  const [inputsReady, setInputsReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const supported = isAudioInputSupported();

  const clearPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewBlob(null);
    setHasRecording(false);
  }, []);

  const releaseInputStream = useCallback(() => {
    closeAudioInputStream(inputStreamRef.current);
    inputStreamRef.current = null;
    activeInputIdRef.current = DEFAULT_AUDIO_INPUT_ID;
  }, []);

  const disposeRecorder = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    recorderRef.current?.dispose();
    recorderRef.current = null;
    setRecording(false);
    setLevel(0);
  }, []);

  const ensureInputStream = useCallback(async (nextDeviceId: string) => {
    const normalized = isDefaultAudioInputId(nextDeviceId) ? DEFAULT_AUDIO_INPUT_ID : nextDeviceId;
    if (inputStreamRef.current && activeInputIdRef.current === normalized) {
      return inputStreamRef.current;
    }
    closeAudioInputStream(inputStreamRef.current);
    const stream = await openAudioInputStream(
      isDefaultAudioInputId(normalized) ? undefined : normalized,
    );
    inputStreamRef.current = stream;
    activeInputIdRef.current = normalized;
    return stream;
  }, []);

  useEffect(() => {
    if (!open) {
      disposeRecorder();
      clearPreview();
      releaseInputStream();
      setError(null);
      setSaving(false);
      setDevices([]);
      setDeviceId(DEFAULT_AUDIO_INPUT_ID);
      setInputsLoading(false);
      setInputsReady(false);
      return;
    }

    recorderRef.current = new AudioRecorder();
    let cancelled = false;

    const prepareInputs = async () => {
      setInputsLoading(true);
      setError(null);
      setDevices([]);
      setDeviceId(DEFAULT_AUDIO_INPUT_ID);
      setInputsReady(false);
      releaseInputStream();

      const stream = await ensureAudioInputAccess();
      if (cancelled) return;

      if (!stream) {
        setError(t("assets.recordMicDenied"));
        setInputsLoading(false);
        return;
      }

      inputStreamRef.current = stream;
      activeInputIdRef.current = DEFAULT_AUDIO_INPUT_ID;

      const list = await listAudioInputDevices();
      if (cancelled) return;

      setDevices(list);
      setInputsLoading(false);
      setInputsReady(true);
    };

    void prepareInputs();

    return () => {
      cancelled = true;
      disposeRecorder();
      clearPreview();
      releaseInputStream();
    };
  }, [open, disposeRecorder, clearPreview, releaseInputStream, t]);

  const pollLevel = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      setLevel(0);
      return;
    }
    setLevel(recorder.getLevel());
    rafRef.current = requestAnimationFrame(pollLevel);
  }, []);

  const handleStart = async () => {
    setError(null);
    clearPreview();
    try {
      const stream = await ensureInputStream(deviceId);
      const recorder = recorderRef.current ?? new AudioRecorder();
      recorderRef.current = recorder;
      await recorder.start({ stream });
      setRecording(true);
      rafRef.current = requestAnimationFrame(pollLevel);
    } catch (err) {
      setError(t("assets.recordMicDenied"));
      console.warn("[record] Could not start microphone", err);
    }
  };

  const handleStop = async () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setRecording(false);
    setLevel(0);

    const recorder = recorderRef.current;
    if (!recorder) return;

    try {
      const blob = await recorder.stop();
      setError(null);
      setPreviewBlob(blob);
      setHasRecording(true);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      if (err instanceof AudioRecorderStopError) {
        setError(t("assets.recordSilent"));
      } else {
        setError(t("assets.recordFailed"));
      }
      console.warn("[record] Stop failed", err);
    }
  };

  const handleSave = async () => {
    if (!previewBlob) return;
    setSaving(true);
    setError(null);
    try {
      const filename = recordingFilenameForCue(cueName);
      const file = new File([previewBlob], filename, { type: "audio/wav" });
      await onSave(file);
      onClose();
    } catch (err) {
      setError(t("assets.recordSaveFailed"));
      console.warn("[record] Save failed", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRecordAgain = () => {
    clearPreview();
    setError(null);
    disposeRecorder();
    recorderRef.current = new AudioRecorder();
  };

  const handleDeviceChange = (nextDeviceId: string) => {
    setDeviceId(nextDeviceId);
    if (recording || hasRecording) return;
    void ensureInputStream(nextDeviceId).catch((err) => {
      console.warn("[record] Could not switch input device", err);
      setError(t("assets.recordMicDenied"));
    });
  };

  const handleClose = () => {
    if (recording) return;
    onClose();
  };

  const canRecord = supported && inputsReady;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t("assets.recordTitle")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {!supported ? (
          <Typography sx={inspectorHintSx}>{t("assets.recordUnsupported")}</Typography>
        ) : inputsLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
            <CircularProgress size={20} />
            <Typography sx={inspectorHintSx}>{t("assets.recordLoadingInputs")}</Typography>
          </Box>
        ) : (
          <>
            <FormControl size="small" fullWidth disabled={recording || hasRecording}>
              <InputLabel id="record-input-label">{t("assets.recordInput")}</InputLabel>
              <Select
                labelId="record-input-label"
                label={t("assets.recordInput")}
                value={deviceId || DEFAULT_AUDIO_INPUT_ID}
                renderValue={(value) =>
                  isDefaultAudioInputId(value)
                    ? t("assets.recordInputDefault")
                    : (devices.find((device) => device.id === value)?.label ??
                      t("assets.recordInputDefault"))
                }
                onChange={(e) => handleDeviceChange(e.target.value)}
              >
                <MenuItem value={DEFAULT_AUDIO_INPUT_ID}>{t("assets.recordInputDefault")}</MenuItem>
                {devices.map((device) => (
                  <MenuItem key={device.id} value={device.id}>
                    {device.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, level * 100)}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Typography sx={{ ...inspectorHintSx, mt: 0.5 }}>
                {recording
                  ? t("assets.recordInProgress")
                  : hasRecording
                    ? t("assets.recordReady")
                    : t("assets.recordHint")}
              </Typography>
            </Box>

            {hasRecording && previewUrl ? (
              <audio key={previewUrl} src={previewUrl} controls style={{ width: "100%" }}>
                <track kind="captions" label={t("assets.recordPreviewCaptions")} />
              </audio>
            ) : null}
          </>
        )}

        {error ? (
          <Typography sx={{ ...inspectorHintSx, color: "error.main", m: 0 }}>{error}</Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={recording || saving}>
          {t("common.action.cancel")}
        </Button>
        {canRecord && !hasRecording ? (
          recording ? (
            <Button variant="contained" color="error" onClick={() => void handleStop()}>
              {t("assets.recordStop")}
            </Button>
          ) : (
            <Button variant="contained" onClick={() => void handleStart()}>
              {t("assets.recordStart")}
            </Button>
          )
        ) : null}
        {hasRecording ? (
          <>
            <Button onClick={handleRecordAgain} disabled={saving}>
              {t("assets.recordAgain")}
            </Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
              {t("assets.recordSave")}
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
