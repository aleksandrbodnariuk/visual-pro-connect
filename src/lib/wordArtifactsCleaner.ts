/**
 * Cleans Word field codes and Office HTML junk so documents from any Word
 * version (97–365) are stored as clean HTML.
 */

const FIELD_RE =
  /\b(?:HYPERLINK|MERGEFIELD|PAGEREF|TOC|REF|PAGE|NUMPAGES|INCLUDEPICTURE|SHAPE|EMBED|FORMTEXT|FORMCHECKBOX|SEQ|DATE|TIME)\b\s+(?:\\[a-z*]\s*)*(?:"[^"]*"\s*)?(?:\\[a-z*]\s*(?:"[^"]*"\s*)?)*/g;

/** Remove field codes like `HYPERLINK "mailto:a@b.c"` from plain text. */
export function cleanWordText(text: string): string {
  return text
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(FIELD_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function textToHtml(text: string): string {
  return cleanWordText(text)
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const DROP_TAGS = "script,style,meta,link,title,xml,head,object,embed,iframe,o\\:p";

/** Sanitize HTML (Word/Office/paste) and strip field-code artifacts. */
export function cleanWordHtml(html: string): string {
  if (!html) return "";
  let src = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?(?:o|w|v|m|st1):[^>]*>/gi, "");
  const bodyMatch = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) src = bodyMatch[1];

  const doc = new DOMParser().parseFromString(`<div id="r">${src}</div>`, "text/html");
  const root = doc.getElementById("r")!;
  root.querySelectorAll(DROP_TAGS).forEach((n) => n.remove());

  root.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on") || n === "lang" || n.includes(":")) el.removeAttribute(attr.name);
      else if (n === "class" && /^Mso/i.test(attr.value)) el.removeAttribute(attr.name);
      else if ((n === "href" || n === "src") && /^\s*javascript:/i.test(attr.value))
        el.removeAttribute(attr.name);
    }
    const style = el.getAttribute("style");
    if (style) {
      const kept = style
        .split(";")
        .filter((d) => d.trim() && !/^\s*mso-/i.test(d))
        .join(";");
      if (kept) el.setAttribute("style", kept);
      else el.removeAttribute("style");
    }
  });

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  texts.forEach((t) => {
    const cleaned = cleanWordText(t.data);
    if (cleaned !== t.data) t.data = cleaned;
  });

  return root.innerHTML;
}
