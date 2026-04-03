export const LOCAL_SIM_CODE_CACHE = "intercept_simulator_api_key";

function randomChunk(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  }

  // Fallback for environments without Web Crypto.
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function generateSimulatorCode(): string {
  return `SIM-${randomChunk(6)}-${randomChunk(6)}-${randomChunk(6)}`;
}

export function isValidSimulatorCode(code: string): boolean {
  return /^SIM-[A-Z2-9]{6}-[A-Z2-9]{6}-[A-Z2-9]{6}$/.test(code.trim());
}
