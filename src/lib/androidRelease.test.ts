import { describe, expect, it } from "vitest";
import { needsAndroidUpdate, releasePath, validateApk } from "./androidRelease";

const apk = (name: string, bytes: number[]) => ({ name, size: bytes.length, slice: () => ({ arrayBuffer: async () => new Uint8Array(bytes).buffer }) }) as File;
describe("Android release rules", () => {
  it("uses the owner's folder and unique files for safe replacement", () => {
    expect(releasePath("owner", "new")).toBe("owner/android/new-spilnota-bc.apk");
    expect(releasePath("owner", "old")).not.toBe(releasePath("owner", "new"));
  });
  it("offers a higher build and never downgrades an installed app", () => {
    expect(needsAndroidUpdate("9", "10")).toBe(true);
    expect(needsAndroidUpdate("10", "10")).toBe(false);
    expect(needsAndroidUpdate("11", "10")).toBe(false);
  });
  it("rejects HTML saved as APK", async () => {
    await expect(validateApk(apk("app.apk", [60, 104, 116, 109]))).rejects.toThrow();
    await expect(validateApk(apk("app.apk", [80, 75, 3, 4]))).resolves.toBeUndefined();
  });
});