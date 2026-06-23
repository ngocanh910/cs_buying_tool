import type { ProductionPreflightDecision, ProductionPreflightIssue } from "./production-preflight.js";

export type EvidenceCheck = {
  readonly name: string;
  readonly passed: boolean;
};

export type EvidenceSummary = {
  readonly passed: number;
  readonly failed: number;
};

export type ReleaseEvidenceBlocker =
  | ProductionPreflightIssue
  | "EXTERNAL_CONTRACTS_NOT_VERIFIED"
  | "QUALITY_GATES_MISSING"
  | "SAFETY_SCANS_MISSING"
  | `QUALITY_GATE_FAILED:${string}`
  | `SAFETY_SCAN_FAILED:${string}`;

export type ReleaseEvidenceInput = {
  readonly generatedAt: Date;
  readonly preflight: ProductionPreflightDecision;
  readonly qualityGates: readonly EvidenceCheck[];
  readonly safetyScans: readonly EvidenceCheck[];
  readonly externalContractsVerified: boolean;
};

export type ReleaseEvidenceReport = {
  readonly generatedAt: string;
  readonly status: "ready" | "blocked";
  readonly blockers: readonly ReleaseEvidenceBlocker[];
  readonly qualityGateSummary: EvidenceSummary;
  readonly safetyScanSummary: EvidenceSummary;
};

export function buildReleaseEvidenceReport(input: ReleaseEvidenceInput): ReleaseEvidenceReport {
  const blockers: ReleaseEvidenceBlocker[] = [];

  if (input.preflight.kind === "blocked") {
    blockers.push(...input.preflight.issues);
  }
  if (!input.externalContractsVerified) {
    blockers.push("EXTERNAL_CONTRACTS_NOT_VERIFIED");
  }
  if (input.qualityGates.length === 0) {
    blockers.push("QUALITY_GATES_MISSING");
  }
  for (const gate of input.qualityGates) {
    if (!gate.passed) {
      blockers.push(`QUALITY_GATE_FAILED:${gate.name}`);
    }
  }
  if (input.safetyScans.length === 0) {
    blockers.push("SAFETY_SCANS_MISSING");
  }
  for (const scan of input.safetyScans) {
    if (!scan.passed) {
      blockers.push(`SAFETY_SCAN_FAILED:${scan.name}`);
    }
  }

  return {
    generatedAt: input.generatedAt.toISOString(),
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
    qualityGateSummary: summarizeChecks(input.qualityGates),
    safetyScanSummary: summarizeChecks(input.safetyScans)
  };
}

function summarizeChecks(checks: readonly EvidenceCheck[]): EvidenceSummary {
  const failed = checks.filter((check) => !check.passed).length;
  return {
    passed: checks.length - failed,
    failed
  };
}
