function formatUuidV4(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomIdFromMath(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const n = Math.floor(Math.random() * 16);
    if (char === "x") return n.toString(16);
    return ((n & 0x3) | 0x8).toString(16);
  });
}

/** UUID v4 for cue/project ids. Uses getRandomValues (works on HTTP LAN); never calls randomUUID. */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return formatUuidV4(bytes);
  }

  return randomIdFromMath();
}
