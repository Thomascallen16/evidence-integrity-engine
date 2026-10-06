import type { AuditEvent, IntegrityFinding, IntegrityInput } from "./types";
import type { IntegrityReceipt } from "./receipt";
import { verifyIntegrityReceipt } from "./receipt";
import { verifyAuditChain } from "./audit";
import { evaluateIntegrity } from "./integrity";

export interface EvidenceBundle {
  schemaVersion: "1.0";
  bundleId: string;
  createdAt: string;
  engineVersion: string;
  input: IntegrityInput;
  finding: IntegrityFinding;
  receipt: IntegrityReceipt;
  auditAnchorHash?: string;
  bundleHash: string;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

async function sha256Hex(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is unavailable in this runtime.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function unsignedBundle(bundle: Omit<EvidenceBundle, "bundleHash">): string {
  return stable(bundle);
}

export async function createEvidenceBundle(
  input: IntegrityInput,
  finding: IntegrityFinding,
  receipt: IntegrityReceipt,
  options: {
    engineVersion: string;
    bundleId?: string;
    createdAt?: string;
    auditAnchorHash?: string;
  },
): Promise<EvidenceBundle> {
  const body = {
    schemaVersion: "1.0" as const,
    bundleId: options.bundleId ?? crypto.randomUUID(),
    createdAt: options.createdAt ?? new Date().toISOString(),
    engineVersion: options.engineVersion,
    input,
    finding,
    receipt,
    ...(options.auditAnchorHash ? { auditAnchorHash: options.auditAnchorHash } : {}),
  };
  return { ...body, bundleHash: await sha256Hex(unsignedBundle(body)) };
}

export interface EvidenceBundleVerification {
  valid: boolean;
  receiptValid: boolean;
  auditChainValid: boolean | null;
  findingValid: boolean;
  reasons: string[];
}

/**
 * Verifies a bundle without trusting the bundle producer.
 * A valid bundle proves structural/evaluation integrity; it does not prove
 * that an external source is authentic or that a FACT is true in the world.
 */
export async function verifyEvidenceBundle(bundle: EvidenceBundle): Promise<EvidenceBundleVerification> {
  const reasons: string[] = [];
  const { bundleHash, ...body } = bundle;
  const computedBundleHash = await sha256Hex(unsignedBundle(body));
  if (bundleHash !== computedBundleHash) reasons.push("Bundle hash does not match its canonical contents.");

  const receipt = await verifyIntegrityReceipt(bundle.receipt, bundle.input, bundle.finding);
  reasons.push(...receipt.reasons);

  let findingValid = false;
  try {
    const evaluated = evaluateIntegrity(bundle.input);
    findingValid = stable(evaluated) === stable(bundle.finding);
    if (!findingValid) reasons.push("Bundle finding does not match a fresh deterministic evaluation of its input.");
  } catch (error) {
    reasons.push(`Bundle input cannot be evaluated: ${error instanceof Error ? error.message : String(error)}`);
  }

  let auditChainValid: boolean | null = null;
  if (bundle.input.auditEvents?.length || bundle.auditAnchorHash) {
    if (!bundle.auditAnchorHash) {
      auditChainValid = false;
      reasons.push("Audit events are present but the bundle has no external audit anchor hash.");
    } else {
      const audit = await verifyAuditChain(bundle.input.auditEvents ?? [], bundle.auditAnchorHash);
      auditChainValid = audit.valid;
      reasons.push(...audit.reasons);
    }
  }

  return {
    valid: reasons.length === 0,
    receiptValid: receipt.valid,
    auditChainValid,
    findingValid,
    reasons: [...new Set(reasons)],
  };
}
