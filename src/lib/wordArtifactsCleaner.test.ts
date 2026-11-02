// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { cleanWordText, cleanWordHtml } from "./wordArtifactsCleaner";

describe("wordArtifactsCleaner", () => {
  it("removes HYPERLINK mailto field codes from text", () => {
    expect(cleanWordText('Пишіть HYPERLINK "mailto:a@b.ua" a@b.ua')).toBe("Пишіть a@b.ua");
  });
  it("strips Office junk from HTML but keeps content", () => {
    const out = cleanWordHtml('<p class="MsoNormal" style="mso-x:1;color:red">Привіт<o:p></o:p></p><script>x</script>');
    expect(out).toBe('<p style="color:red">Привіт</p>');
  });
});

import { cleanWordText as c2 } from "./wordArtifactsCleaner";
describe("split mailto stitching", () => {
  it("joins e-mail fragmented by Word fields", () => {
    const s = 'BMBG aleksandrbodnariuk HYPERLINK "mailto:aleksandrbodnariuk@gmail.com"@ HYPERLINK "mailto:aleksandrbodnariuk@gmail.com"gmail HYPERLINK "mailto:aleksandrbodnariuk@gmail.com". HYPERLINK "mailto:aleksandrbodnariuk@gmail.com"com ютуб';
    expect(c2(s)).toBe("BMBG aleksandrbodnariuk@gmail.com ютуб");
  });
});
