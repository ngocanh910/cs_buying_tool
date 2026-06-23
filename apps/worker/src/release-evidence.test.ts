import { describe, expect, it } from "vitest";
import { buildReleaseEvidenceReport } from "./release-evidence.js";
import type { ReleaseEvidenceInput } from "./release-evidence.js";

const generatedAt = new Date("2026-06-11T00:00:00.000Z");

function readyInput(): ReleaseEvidenceInput {
  return {
    generatedAt,
    preflight: { kind: "ready" },
    qualityGates: [
      { name: "pnpm lint", passed: true },
      { name: "pnpm typecheck", passed: true },
      { name: "pnpm test", passed: true },
      { name: "pnpm build", passed: true },
      { name: "pnpm simulator", passed: true }
    ],
    safetyScans: [
      { name: "conflict marker scan", passed: true },
      { name: "live URL scan", passed: true },
      { name: "secret pattern scan", passed: true }
    ],
    externalContractsVerified: true
  };
}

describe("buildReleaseEvidenceReport", () => {
  it("blocks release when production preflight is blocked", () => {
    expect(
      buildReleaseEvidenceReport({
        ...readyInput(),
        preflight: { kind: "blocked", issues: ["UNVERIFIED_TRANSACTION_CONTRACT"] },
        externalContractsVerified: false
      })
    ).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "blocked",
      blockers: ["UNVERIFIED_TRANSACTION_CONTRACT", "EXTERNAL_CONTRACTS_NOT_VERIFIED"],
      qualityGateSummary: { passed: 5, failed: 0 },
      safetyScanSummary: { passed: 3, failed: 0 }
    });
  });

  it("blocks release when any quality gate fails", () => {
    expect(
      buildReleaseEvidenceReport({
        ...readyInput(),
        qualityGates: [
          { name: "pnpm lint", passed: true },
          { name: "pnpm test", passed: false }
        ]
      })
    ).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "blocked",
      blockers: ["QUALITY_GATE_FAILED:pnpm test"],
      qualityGateSummary: { passed: 1, failed: 1 },
      safetyScanSummary: { passed: 3, failed: 0 }
    });
  });

  it("blocks release when any safety scan fails", () => {
    expect(
      buildReleaseEvidenceReport({
        ...readyInput(),
        safetyScans: [
          { name: "conflict marker scan", passed: true },
          { name: "live URL scan", passed: false }
        ]
      })
    ).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "blocked",
      blockers: ["SAFETY_SCAN_FAILED:live URL scan"],
      qualityGateSummary: { passed: 5, failed: 0 },
      safetyScanSummary: { passed: 1, failed: 1 }
    });
  });

  it("blocks release when no quality gate evidence is provided", () => {
    expect(buildReleaseEvidenceReport({ ...readyInput(), qualityGates: [] })).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "blocked",
      blockers: ["QUALITY_GATES_MISSING"],
      qualityGateSummary: { passed: 0, failed: 0 },
      safetyScanSummary: { passed: 3, failed: 0 }
    });
  });

  it("blocks release when no safety scan evidence is provided", () => {
    expect(buildReleaseEvidenceReport({ ...readyInput(), safetyScans: [] })).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "blocked",
      blockers: ["SAFETY_SCANS_MISSING"],
      qualityGateSummary: { passed: 5, failed: 0 },
      safetyScanSummary: { passed: 0, failed: 0 }
    });
  });

  it("reports ready only when every evidence gate passes", () => {
    expect(buildReleaseEvidenceReport(readyInput())).toEqual({
      generatedAt: "2026-06-11T00:00:00.000Z",
      status: "ready",
      blockers: [],
      qualityGateSummary: { passed: 5, failed: 0 },
      safetyScanSummary: { passed: 3, failed: 0 }
    });
  });
});
