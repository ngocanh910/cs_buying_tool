import { describe, expect, it } from "vitest";
import {
  assertExternalContractVerified,
  evaluateContractIntake,
  evaluateExternalContract,
  type ContractIntakeCandidate
} from "./external-contracts.js";

describe("external contract verification", () => {
  it("keeps incomplete contracts unverified", () => {
    const result = evaluateExternalContract({
      id: "empire.identity",
      status: "UNVERIFIED_EXTERNAL_CONTRACT",
      evidence: undefined,
      fixtures: [],
      runtimeSchemaName: undefined,
      contractTestName: undefined,
      behavior: {
        auth: undefined,
        rateLimit: undefined,
        timeout: undefined,
        idempotency: undefined,
        errors: undefined
      }
    });

    expect(result.status).toBe("UNVERIFIED_EXTERNAL_CONTRACT");
    expect(result.issues).toEqual([
      "REGISTRY_STATUS_NOT_VERIFIED",
      "MISSING_EVIDENCE",
      "MISSING_FIXTURE",
      "MISSING_RUNTIME_SCHEMA",
      "MISSING_CONTRACT_TEST",
      "MISSING_AUTH_BEHAVIOR",
      "MISSING_RATE_LIMIT_BEHAVIOR",
      "MISSING_TIMEOUT_BEHAVIOR",
      "MISSING_IDEMPOTENCY_BEHAVIOR",
      "MISSING_ERROR_BEHAVIOR"
    ]);
  });

  it("keeps complete contracts unverified until the registry marks them verified", () => {
    const result = evaluateExternalContract({
      id: "steam.offer_discovery",
      status: "UNVERIFIED_EXTERNAL_CONTRACT",
      evidence: {
        source: "authorized_redacted_capture",
        reference: "docs/fixtures/steam-offer-discovery-v1.md"
      },
      fixtures: [
        {
          name: "steam-offer-discovery-v1",
          redacted: true,
          containsSecrets: false
        }
      ],
      runtimeSchemaName: "steamOfferDiscoverySchema",
      contractTestName: "steam-offer-discovery.contract.test.ts",
      behavior: {
        auth: "documented",
        rateLimit: "documented",
        timeout: "documented",
        idempotency: "documented",
        errors: "documented"
      }
    });

    expect(result.status).toBe("UNVERIFIED_EXTERNAL_CONTRACT");
    expect(result.issues).toEqual(["REGISTRY_STATUS_NOT_VERIFIED"]);
  });

  it("marks contracts verified only when registry status and all required evidence are present", () => {
    const result = evaluateExternalContract({
      id: "steam.offer_discovery",
      status: "VERIFIED",
      evidence: {
        source: "authorized_redacted_capture",
        reference: "docs/fixtures/steam-offer-discovery-v1.md"
      },
      fixtures: [
        {
          name: "steam-offer-discovery-v1",
          redacted: true,
          containsSecrets: false
        }
      ],
      runtimeSchemaName: "steamOfferDiscoverySchema",
      contractTestName: "steam-offer-discovery.contract.test.ts",
      behavior: {
        auth: "documented",
        rateLimit: "documented",
        timeout: "documented",
        idempotency: "documented",
        errors: "documented"
      }
    });

    expect(result).toEqual({
      status: "VERIFIED",
      issues: []
    });
  });

  it("rejects fixtures that are not redacted or may contain secrets", () => {
    const result = evaluateExternalContract({
      id: "empire.balance",
      status: "UNVERIFIED_EXTERNAL_CONTRACT",
      evidence: {
        source: "official_documentation",
        reference: "docs/fixtures/empire-balance-v1.md"
      },
      fixtures: [
        {
          name: "balance-with-cookie",
          redacted: false,
          containsSecrets: true
        }
      ],
      runtimeSchemaName: "empireBalanceSchema",
      contractTestName: "empire-balance.contract.test.ts",
      behavior: {
        auth: "documented",
        rateLimit: "documented",
        timeout: "documented",
        idempotency: "documented",
        errors: "documented"
      }
    });

    expect(result.status).toBe("UNVERIFIED_EXTERNAL_CONTRACT");
    expect(result.issues).toEqual(["REGISTRY_STATUS_NOT_VERIFIED", "FIXTURE_NOT_REDACTED", "FIXTURE_CONTAINS_SECRETS"]);
  });

  it("throws before executable adapters use an unverified contract", () => {
    const result = evaluateExternalContract({
      id: "empire.auction_updates",
      status: "UNVERIFIED_EXTERNAL_CONTRACT",
      evidence: undefined,
      fixtures: [],
      runtimeSchemaName: undefined,
      contractTestName: undefined,
      behavior: {
        auth: undefined,
        rateLimit: undefined,
        timeout: undefined,
        idempotency: undefined,
        errors: undefined
      }
    });

    expect(() => {
      assertExternalContractVerified(result, "Empire auction updates");
    }).toThrow("MISSING_EVIDENCE");
  });
});

describe("contract intake", () => {
  const validReadOnlyIntake: ContractIntakeCandidate = {
    contractId: "empire.balance",
    intendedScope: "read_only",
    evidence: {
      source: "authorized_redacted_capture",
      capturedAt: "2026-06-13",
      reference: "docs/contracts/intake/empire.balance.md",
      approvedForUse: true
    },
    fixture: {
      path: "docs/contracts/fixtures/empire.balance/v1/redacted-response.json",
      redacted: true,
      containsSecrets: false
    },
    runtimeSchemaName: "empireBalanceReadOnlySchema",
    contractTestName: "empire-balance-read-only.contract.test.ts"
  };

  it("accepts read-only intake candidates with authorized provenance and redacted fixture policy", () => {
    const result = evaluateContractIntake(validReadOnlyIntake);

    expect(result).toEqual({ accepted: true, issues: [] });
  });

  it("rejects transaction-scope intake during the read-only milestone", () => {
    const result = evaluateContractIntake({
      ...validReadOnlyIntake,
      intendedScope: "transaction"
    });

    expect(result.accepted).toBe(false);
    expect(result.issues).toContain("INTAKE_SCOPE_NOT_READ_ONLY");
  });

  it("rejects unapproved evidence and fixture paths outside the contract fixture directory", () => {
    const result = evaluateContractIntake({
      ...validReadOnlyIntake,
      evidence: {
        ...validReadOnlyIntake.evidence,
        approvedForUse: false,
        reference: "research/private-capture.md"
      },
      fixture: {
        ...validReadOnlyIntake.fixture,
        path: "tmp/raw-response.json",
        containsSecrets: true
      }
    });

    expect(result.accepted).toBe(false);
    expect(result.issues).toEqual([
      "INTAKE_EVIDENCE_NOT_APPROVED",
      "INTAKE_EVIDENCE_REFERENCE_NOT_DOCS_LOCAL",
      "INTAKE_FIXTURE_PATH_INVALID",
      "INTAKE_FIXTURE_CONTAINS_SECRETS"
    ]);
  });
});
