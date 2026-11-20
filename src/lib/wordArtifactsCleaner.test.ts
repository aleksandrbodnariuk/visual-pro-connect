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


describe("split mailto stitching", () => {
  it("joins e-mail fragmented by Word fields", () => {
    const s = 'BMBG aleksandrbodnariuk HYPERLINK "mailto:aleksandrbodnariuk@gmail.com"@ HYPERLINK "mailto:aleksandrbodnariuk@gmail.com"gmail HYPERLINK "mailto:aleksandrbodnariuk@gmail.com". HYPERLINK "mailto:aleksandrbodnariuk@gmail.com"com ютуб';
    expect(cleanWordText(s)).toBe("BMBG aleksandrbodnariuk@gmail.com ютуб");
  });
});

describe("keeps ordinary text", () => {
  it("does not delete capitalised words like DATE or PAGE", () => {
    expect(cleanWordText("DATE OF BIRTH, PAGE TWO, TIME LINE")).toBe("DATE OF BIRTH, PAGE TWO, TIME LINE");
  });
  it("keeps intentional double spaces", () => {
    expect(cleanWordText("А  Б")).toBe("А  Б");
  });
  it("still removes a real PAGEREF field", () => {
    expect(cleanWordText('Див. HYPERLINK "https://x.ua" сайт')).toBe("Див. сайт");
  });
});
