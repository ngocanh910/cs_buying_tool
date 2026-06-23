import { describe, expect, it } from "vitest";
import { createLocalEnvelopeEncryption, redactSecrets } from "./index.js";

describe("secret redaction", () => {
  it("redacts nested secret-like keys without mutating the original value", () => {
    const input = {
      authorization: "Bearer secret-token",
      nested: { apiKey: "secret-api-key", safe: "visible", sessionId: "real-session-id" },
      list: [{ cookie: "session-cookie" }]
    };

    const redacted = redactSecrets(input);

    expect(JSON.stringify(redacted)).not.toContain("secret-token");
    expect(JSON.stringify(redacted)).not.toContain("secret-api-key");
    expect(JSON.stringify(redacted)).not.toContain("session-cookie");
    expect(JSON.stringify(redacted)).not.toContain("real-session-id");
    expect(redacted).toEqual({
      authorization: "[REDACTED]",
      nested: { apiKey: "[REDACTED]", safe: "visible", sessionId: "[REDACTED]" },
      list: [{ cookie: "[REDACTED]" }]
    });
    expect(input.nested.apiKey).toBe("secret-api-key");
  });
});

describe("local envelope encryption", () => {
  it("seals and opens plaintext with a local development key", () => {
    const envelope = createLocalEnvelopeEncryption("0123456789abcdef0123456789abcdef");

    const sealed = envelope.seal("plain-secret");

    expect(sealed.ciphertext).not.toContain("plain-secret");
    expect(envelope.open(sealed)).toBe("plain-secret");
  });

  it("rejects local encryption keys that are not 32 bytes", () => {
    expect(() => createLocalEnvelopeEncryption("short")).toThrow("32-byte");
  });

  it("rejects sealed values with unexpected metadata", () => {
    const envelope = createLocalEnvelopeEncryption("0123456789abcdef0123456789abcdef");
    const sealed = envelope.seal("plain-secret");

    expect(() => envelope.open({ ...sealed, keyId: "rotated-key" })).toThrow("Unsupported sealed secret metadata");
  });
});
