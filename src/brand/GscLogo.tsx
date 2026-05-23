import type { SVGProps } from "react";

/** Dark mark on white — chosen brand treatment. */
export const GSC_LOGO_COLOR = "#1a1a1a";

type GscLogoProps = SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
};

export function GscLogo({ size = 32, color = GSC_LOGO_COLOR, ...rest }: GscLogoProps) {
  const block = 18;
  const gap = 2;
  const rowGap = 2;
  const rowH = (block - rowGap * 3) / 4;
  const xSquare = 8;
  const y = 15;
  const xRows = xSquare + block + gap;
  const rowYs = [0, 1, 2, 3].map((i) => y + i * (rowH + rowGap));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      width={size}
      height={size}
      aria-hidden={rest["aria-label"] ? undefined : true}
      {...rest}
    >
      <title>GSC</title>
      <rect x={xSquare} y={y} width={block} height={block} fill={color} />
      {rowYs.map((rowY, i) => (
        <rect
          key={rowY}
          x={xRows}
          y={rowY}
          width={block}
          height={rowH}
          fill={color}
          opacity={i === 3 ? 0.45 : 1}
        />
      ))}
    </svg>
  );
}
