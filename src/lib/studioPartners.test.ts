import { describe, it, expect } from "vitest";
import { safeUrl } from "./studioPartners";

describe("safeUrl", () => {
  it("adds https to bare domains", () => expect(safeUrl("bc.studio")).toBe("https://bc.studio/"));
  it("rejects javascript links", () => expect(safeUrl("javascript:alert(1)")).toBeNull());
  it("empty is null", () => expect(safeUrl("  ")).toBeNull());
});
