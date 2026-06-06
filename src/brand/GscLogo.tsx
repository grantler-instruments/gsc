import type { SVGProps } from "react";
import { editTokens } from "../theme/tokens";
import {
  GSC_LOGO_COLOR,
  GSC_LOGO_MARK,
  gscLogoRowHeight,
  gscLogoRowYs,
  gscLogoStripeFill,
} from "./gscLogoMark";

type GscLogoProps = SVGProps<SVGSVGElement> & {
  size?: number;
  /** Bright cue stripes (top two and last). */
  color?: string;
  /** Gray second-to-last stripe and square. */
  mutedColor?: string;
};

export { GSC_LOGO_COLOR } from "./gscLogoMark";

export function GscLogo({
  size = 32,
  color = GSC_LOGO_COLOR,
  mutedColor = editTokens.textMuted,
  ...rest
}: GscLogoProps) {
  const { block, gap, rowGap, xSquare, y, viewBox } = GSC_LOGO_MARK;
  const rowH = gscLogoRowHeight(block, rowGap);
  const xRows = xSquare + block + gap;
  const rowYs = gscLogoRowYs(y, rowH, rowGap);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      fill="none"
      width={size}
      height={size}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    >
      <title>GSC</title>
      <rect x={xSquare} y={y} width={block} height={block} fill={mutedColor} />
      {rowYs.map((rowY, i) => (
        <rect
          key={rowY}
          x={xRows}
          y={rowY}
          width={block}
          height={rowH}
          fill={gscLogoStripeFill(i, color, mutedColor)}
        />
      ))}
    </svg>
  );
}
