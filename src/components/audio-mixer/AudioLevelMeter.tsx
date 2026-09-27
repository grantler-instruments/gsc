import Box from "@mui/material/Box";
import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { audioMeters, SILENT_METER } from "../../audio/meters";

const percent = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
const formatDb = (db: number) => (db <= -60 ? "−∞" : db.toFixed(1));

/** Only this small component re-renders on meter frames, not its owning cue/strip. */
export function AudioLevelMeter({
  meterId,
  label,
  compact = false,
}: {
  meterId: string;
  label: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const subscribe = useCallback(
    (listener: () => void) => audioMeters.subscribe(meterId, listener),
    [meterId],
  );
  const getSnapshot = useCallback(() => audioMeters.getReading(meterId), [meterId]);
  const reading = useSyncExternalStore(subscribe, getSnapshot, () => SILENT_METER);
  const value = Math.max(...reading.db);
  const description = `${label}: L ${formatDb(reading.db[0])}, R ${formatDb(reading.db[1])} dBFS${reading.clipped ? ` · ${t("audioMixer.clip")}` : ""}`;
  return (
    <Box
      component="span"
      data-meter-id={meterId}
      data-level-db={value.toFixed(1)}
      role="meter"
      aria-label={label}
      aria-valuemin={-60}
      aria-valuemax={0}
      aria-valuenow={Math.min(0, value)}
      aria-valuetext={description}
      title={description}
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 0.5,
        flexShrink: 0,
        width: 64,
        height: compact ? 15 : "100%",
        minHeight: compact ? 15 : 100,
        color: "text.secondary",
        fontSize: 9,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Box
        component="span"
        sx={{
          display: "flex",
          flexDirection: compact ? "column" : "row",
          gap: "3px",
          flex: 1,
          minHeight: 0,
        }}
      >
        {!compact && (
          <Box
            component="span"
            aria-hidden
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 18,
              textAlign: "right",
            }}
          >
            {[0, -12, -24, -36, -48, -60].map((db) => (
              <span key={db}>{db}</span>
            ))}
          </Box>
        )}
        {reading.db.map((db, channel) => (
          <Box
            component="span"
            key={channel === 0 ? "left" : "right"}
            aria-hidden
            sx={{
              position: "relative",
              overflow: "hidden",
              flex: 1,
              bgcolor: "action.hover",
              borderRadius: "2px",
              minWidth: compact ? 0 : 8,
            }}
          >
            <Box
              component="span"
              sx={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(to ${compact ? "right" : "top"}, #39bf78 0%, #39bf78 78%, #e8bf45 80%, #e8bf45 94%, #ef5350 95%)`,
                clipPath: compact
                  ? `inset(0 ${100 - percent(db)}% 0 0)`
                  : `inset(${100 - percent(db)}% 0 0 0)`,
              }}
            />
            <Box
              component="span"
              sx={{
                position: "absolute",
                bgcolor: "text.primary",
                ...(compact
                  ? {
                      left: `${percent(reading.peakDb[channel])}%`,
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      transform: "translateX(-1px)",
                    }
                  : {
                      bottom: `${percent(reading.peakDb[channel])}%`,
                      left: 0,
                      right: 0,
                      height: "1px",
                      transform: "translateY(1px)",
                    }),
                opacity: reading.peakDb[channel] > -60 ? 0.8 : 0,
              }}
            />
          </Box>
        ))}
        <Box
          component="span"
          aria-hidden
          sx={{
            bgcolor: reading.clipped ? "error.main" : "action.disabledBackground",
            width: compact ? "100%" : 4,
            height: compact ? 2 : "100%",
            borderRadius: 1,
          }}
        />
      </Box>
      {!compact && (
        <Box
          component="span"
          aria-hidden
          sx={{ textAlign: "center", color: reading.clipped ? "error.main" : "text.secondary" }}
        >
          {reading.clipped ? t("audioMixer.clip") : `${formatDb(value)} dBFS`}
        </Box>
      )}
    </Box>
  );
}
