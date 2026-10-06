import { test } from "node:test";
import assert from "node:assert/strict";
import { sortHqsByOkrug } from "./hqSort.ts";

test("штаби впорядковуються за номером округу, а не за абеткою", () => {
  const r = sortHqsByOkrug([{ name: "Округ 10" }, { name: "Центральний" }, { name: "Округ 2" }, { name: "Округ № 1" }]);
  assert.deepEqual(r.map((x) => x.name), ["Округ № 1", "Округ 2", "Округ 10", "Центральний"]);
});
