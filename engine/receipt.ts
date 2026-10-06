import type { IntegrityFinding, IntegrityInput } from "./types";

export interface IntegrityReceipt {
  schemaVersion: "1.0";
  receiptId: string;
  createdAt: string;
  engineVersion: string;
  inputHash: string;
  findingHash: string;
  receiptHash: string;
}

/** Stable JSON serialization for provider-neutral cryptographic binding. */
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable in this runtime.");
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function receiptBody(receipt: Omit<IntegrityReceipt, "receiptHash">): string {
  return stable(receipt);
}

/**
 * Creates a portable receipt binding the exact supplied input and resulting finding.
 *
 * This proves what the engine evaluated and returned. It does NOT prove that the
 * underlying source or claim is true, and it does not replace external anchoring.
 */
export async function createIntegrityReceipt(
  input: IntegrityInput,
  finding: IntegrityFinding,
  options: { engineVersion: string; receiptId?: string; createdAt?: string },
): Promise<IntegrityReceipt> {
  const inputHash = await sha256Hex(stable(input));
  const findingHash = await sha256Hex(stable(finding));
  const body = {
    schemaVersion: "1.0" as const,
    receiptId: options.receiptId ?? crypto.randomUUID(),
    createdAt: options.createdAt ?? new Date().toISOString(),
    engineVersion: options.engineVersion,
    inputHash,
    findingHash,
  };
  return { ...body, receiptHash: await sha256Hex(receiptBody(body)) };
}

/**
 * Verifies that a receipt still binds to the supplied input/finding and that
 * the receipt itself has not been altered.
 */
export async function verifyIntegrityReceipt(
  receipt: IntegrityReceipt,
  input: IntegrityInput,
  finding: IntegrityFinding,
): Promise<{ valid: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  const inputHash = await sha256Hex(stable(input));
  const findingHash = await sha256Hex(stable(finding));
  if (receipt.schemaVersion !== "1.0") reasons.push("Unsupported receipt schema version.");
  if (receipt.inputHash !== inputHash) reasons.push("Receipt input hash does not match the supplied input.");
  if (receipt.findingHash !== findingHash) reasons.push("Receipt finding hash does not match the supplied finding.");
  const { receiptHash, ...body } = receipt;
  if (receiptHash !== await sha256Hex(receiptBody(body))) reasons.push("Receipt hash does not match its canonical contents.");
  return { valid: reasons.length === 0, reasons };
}
