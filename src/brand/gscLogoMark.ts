import { editTokens } from "../theme/tokens";

/** Dark mark on white — chosen brand treatment. */
export const GSC_LOGO_COLOR = "#1a1a1a";

export const GSC_LOGO_MARK = {
  viewBox: 48,
  block: 18,
  gap: 2,
  rowGap: 2,
  xSquare: 5,
  y: 15,
} as const;

export function gscLogoRowHeight(block: number, rowGap: number): number {
  return (block - rowGap * 3) / 4;
}

export function gscLogoRowYs(y: number, rowH: number, rowGap: number): number[] {
  return [0, 1, 2, 3].map((i) => y + i * (rowH + rowGap));
}

/** Second-to-last cue stripe and square use muted gray; last cue is full white. */
export function gscLogoStripeFill(
  index: number,
  stripeColor: string,
  mutedStripeColor: string,
): string {
  return index === 2 ? mutedStripeColor : stripeColor;
}

type GscLogoMarkSvgOptions = {
  background?: string;
  stripeColor?: string;
  mutedStripeColor?: string;
};

/** Static SVG for favicon / PWA icons — matches `GscLogo` geometry and default colors. */
export function renderGscLogoMarkSvg({
  background = editTokens.bgElevated,
  stripeColor = editTokens.text,
  mutedStripeColor = editTokens.textMuted,
}: GscLogoMarkSvgOptions = {}): string {
  const { block, gap, rowGap, xSquare, y, viewBox } = GSC_LOGO_MARK;
  const rowH = gscLogoRowHeight(block, rowGap);
  const xRows = xSquare + block + gap;
  const rowYs = gscLogoRowYs(y, rowH, rowGap);

  const stripes = rowYs
    .map(
      (rowY, i) =>
        `  <rect x="${xRows}" y="${rowY}" width="${block}" height="${rowH}" fill="${gscLogoStripeFill(i, stripeColor, mutedStripeColor)}"/>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}" fill="none">
  <rect width="${viewBox}" height="${viewBox}" fill="${background}"/>
  <rect x="${xSquare}" y="${y}" width="${block}" height="${block}" fill="${mutedStripeColor}"/>
${stripes}
</svg>
`;
}
