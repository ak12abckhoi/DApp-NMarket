// Palette of gradient pairs — deterministic pick by token ID
const GRADIENTS = [
  ["#7c3aed", "#db2777"],
  ["#2563eb", "#7c3aed"],
  ["#0891b2", "#2563eb"],
  ["#059669", "#0891b2"],
  ["#d97706", "#dc2626"],
  ["#7c3aed", "#2563eb"],
  ["#db2777", "#f97316"],
  ["#6d28d9", "#0891b2"],
];

/**
 * Returns a data-URI SVG placeholder unique to each tokenId.
 * Used when an NFT has no real image (e.g. deployment-seeded tokens).
 */
export function generatePlaceholder(tokenId: number): string {
  const [from, to] = GRADIENTS[tokenId % GRADIENTS.length];
  const id = `g${tokenId}`;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${from};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${to};stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#${id})"/>
  <text x="200" y="185" font-family="monospace" font-size="72" font-weight="bold"
        fill="rgba(255,255,255,0.25)" text-anchor="middle" dominant-baseline="middle">NFT</text>
  <text x="200" y="255" font-family="monospace" font-size="48" font-weight="bold"
        fill="rgba(255,255,255,0.6)" text-anchor="middle" dominant-baseline="middle">#${tokenId}</text>
</svg>`.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
