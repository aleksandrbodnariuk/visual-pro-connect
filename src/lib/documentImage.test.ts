import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PROFILES, targetSize } from "./documentImage.ts";

describe("профілі стиснення", () => {
  test("протокол зберігає довгу сторону А4 при 300 DPI (3508px)", () => {
    assert.equal(PROFILES.document.maxSide, 3508);
    assert.deepEqual(targetSize(4000, 3000, PROFILES.document.maxSide), { width: 3508, height: 2631 });
  });
  test("символіка обмежується 2560px", () => {
    assert.deepEqual(targetSize(5000, 2500, PROFILES.symbol.maxSide), { width: 2560, height: 1280 });
  });
  test("малі зображення не збільшуються", () => {
    assert.deepEqual(targetSize(1200, 800, 3508), { width: 1200, height: 800 });
  });
});
