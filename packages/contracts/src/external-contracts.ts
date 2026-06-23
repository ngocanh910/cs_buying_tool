export type ExternalContractStatus = "UNVERIFIED_EXTERNAL_CONTRACT" | "VERIFIED";

export type ExternalContractEvidence = {
  readonly source: "official_documentation" | "authorized_redacted_capture";
  readonly reference: string;
};

export type ExternalContractFixture = {
  readonly name: string;
  readonly redacted: boolean;
  readonly containsSecrets: boolean;
};

export type ExternalContractBehavior = {
  readonly auth: "documented" | undefined;
  readonly rateLimit: "documented" | undefined;
  readonly timeout: "documented" | undefined;
  readonly idempotency: "documented" | undefined;
  readonly errors: "documented" | undefined;
};

export type ExternalContractEntry = {
  readonly id: string;
  readonly status: ExternalContractStatus;
  readonly evidence: ExternalContractEvidence | undefined;
  readonly fixtures: readonly ExternalContractFixture[];
  readonly runtimeSchemaName: string | undefined;
  readonly contractTestName: string | undefined;
  readonly behavior: ExternalContractBehavior;
};

export type ExternalContractIssue =
  | "REGISTRY_STATUS_NOT_VERIFIED"
  | "MISSING_EVIDENCE"
  | "MISSING_FIXTURE"
  | "MISSING_RUNTIME_SCHEMA"
  | "MISSING_CONTRACT_TEST"
  | "MISSING_AUTH_BEHAVIOR"
  | "MISSING_RATE_LIMIT_BEHAVIOR"
  | "MISSING_TIMEOUT_BEHAVIOR"
  | "MISSING_IDEMPOTENCY_BEHAVIOR"
  | "MISSING_ERROR_BEHAVIOR"
  | "FIXTURE_NOT_REDACTED"
  | "FIXTURE_CONTAINS_SECRETS";

export type ExternalContractEvaluation = {
  readonly status: ExternalContractStatus;
  readonly issues: readonly ExternalContractIssue[];
};

export type ContractIntakeScope = "read_only" | "transaction";

export type ContractIntakeEvidence = {
  readonly source: ExternalContractEvidence["source"];
  readonly capturedAt: string;
  readonly reference: string;
  readonly approvedForUse: boolean;
};

export type ContractIntakeFixture = {
  readonly path: string;
  readonly redacted: boolean;
  readonly containsSecrets: boolean;
};

export type ContractIntakeCandidate = {
  readonly contractId: string;
  readonly intendedScope: ContractIntakeScope;
  readonly evidence: ContractIntakeEvidence;
  readonly fixture: ContractIntakeFixture;
  readonly runtimeSchemaName: string;
  readonly contractTestName: string;
};

export type ContractIntakeIssue =
  | "INTAKE_SCOPE_NOT_READ_ONLY"
  | "INTAKE_EVIDENCE_NOT_APPROVED"
  | "INTAKE_EVIDENCE_DATE_INVALID"
  | "INTAKE_EVIDENCE_REFERENCE_NOT_DOCS_LOCAL"
  | "INTAKE_FIXTURE_PATH_INVALID"
  | "INTAKE_FIXTURE_NOT_REDACTED"
  | "INTAKE_FIXTURE_CONTAINS_SECRETS"
  | "INTAKE_RUNTIME_SCHEMA_MISSING"
  | "INTAKE_CONTRACT_TEST_MISSING";

export type ContractIntakeEvaluation = {
  readonly accepted: boolean;
  readonly issues: readonly ContractIntakeIssue[];
};

export function evaluateExternalContract(entry: ExternalContractEntry): ExternalContractEvaluation {
  const issues: ExternalContractIssue[] = [];

  if (entry.status !== "VERIFIED") {
    issues.push("REGISTRY_STATUS_NOT_VERIFIED");
  }
  if (entry.evidence === undefined) {
    issues.push("MISSING_EVIDENCE");
  }
  if (entry.fixtures.length === 0) {
    issues.push("MISSING_FIXTURE");
  }
  if (entry.runtimeSchemaName === undefined) {
    issues.push("MISSING_RUNTIME_SCHEMA");
  }
  if (entry.contractTestName === undefined) {
    issues.push("MISSING_CONTRACT_TEST");
  }
  if (entry.behavior.auth === undefined) {
    issues.push("MISSING_AUTH_BEHAVIOR");
  }
  if (entry.behavior.rateLimit === undefined) {
    issues.push("MISSING_RATE_LIMIT_BEHAVIOR");
  }
  if (entry.behavior.timeout === undefined) {
    issues.push("MISSING_TIMEOUT_BEHAVIOR");
  }
  if (entry.behavior.idempotency === undefined) {
    issues.push("MISSING_IDEMPOTENCY_BEHAVIOR");
  }
  if (entry.behavior.errors === undefined) {
    issues.push("MISSING_ERROR_BEHAVIOR");
  }
  if (entry.fixtures.some((fixture) => !fixture.redacted)) {
    issues.push("FIXTURE_NOT_REDACTED");
  }
  if (entry.fixtures.some((fixture) => fixture.containsSecrets)) {
    issues.push("FIXTURE_CONTAINS_SECRETS");
  }

  return {
    status: issues.length === 0 ? "VERIFIED" : "UNVERIFIED_EXTERNAL_CONTRACT",
    issues
  };
}

export function assertExternalContractVerified(evaluation: ExternalContractEvaluation, contractName: string): void {
  if (evaluation.status !== "VERIFIED") {
    throw new Error(`${contractName} is UNVERIFIED_EXTERNAL_CONTRACT: ${evaluation.issues.join(", ")}`);
  }
}

export function evaluateContractIntake(candidate: ContractIntakeCandidate): ContractIntakeEvaluation {
  const issues: ContractIntakeIssue[] = [];

  if (candidate.intendedScope !== "read_only") {
    issues.push("INTAKE_SCOPE_NOT_READ_ONLY");
  }
  if (!candidate.evidence.approvedForUse) {
    issues.push("INTAKE_EVIDENCE_NOT_APPROVED");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.evidence.capturedAt)) {
    issues.push("INTAKE_EVIDENCE_DATE_INVALID");
  }
  if (!candidate.evidence.reference.startsWith("docs/contracts/intake/")) {
    issues.push("INTAKE_EVIDENCE_REFERENCE_NOT_DOCS_LOCAL");
  }
  if (!isFixturePathForContract(candidate.fixture.path, candidate.contractId)) {
    issues.push("INTAKE_FIXTURE_PATH_INVALID");
  }
  if (!candidate.fixture.redacted) {
    issues.push("INTAKE_FIXTURE_NOT_REDACTED");
  }
  if (candidate.fixture.containsSecrets) {
    issues.push("INTAKE_FIXTURE_CONTAINS_SECRETS");
  }
  if (candidate.runtimeSchemaName.trim().length === 0) {
    issues.push("INTAKE_RUNTIME_SCHEMA_MISSING");
  }
  if (candidate.contractTestName.trim().length === 0) {
    issues.push("INTAKE_CONTRACT_TEST_MISSING");
  }

  return {
    accepted: issues.length === 0,
    issues
  };
}

function isFixturePathForContract(path: string, contractId: string): boolean {
  const escapedContractId = contractId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^docs/contracts/fixtures/${escapedContractId}/v\\d+/redacted-[a-z0-9-]+\\.json$`, "u").test(path);
}
