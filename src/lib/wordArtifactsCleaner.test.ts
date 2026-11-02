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
