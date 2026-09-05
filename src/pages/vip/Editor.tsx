import { useCallback, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Upload,
  Download,
  Maximize2,
  Minimize2,
  FileText,
  Trash2,
  Plus,
  Loader2,
  Crown,
  Baseline,
  Highlighter,
  RemoveFormatting,
  Indent,
  Outdent,
  Table as TableIcon,
  Rows3,
  Columns3,
  GripHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import {
  useVipDocuments,
  saveVipDocument,
  deleteVipDocument,
  type VipDocument,
} from "@/hooks/vip/useVipDocuments";
import { toast } from "sonner";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { cn } from "@/lib/utils";

const FONTS = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
];

const SIZES = [
  { label: "10", value: "1" },
  { label: "12", value: "2" },
  { label: "14", value: "3" },
  { label: "18", value: "4" },
  { label: "24", value: "5" },
  { label: "32", value: "6" },
  { label: "48", value: "7" },
];

const BLOCKS = [
  { label: "Звичайний текст", value: "P" },
  { label: "Заголовок 1", value: "H1" },
  { label: "Заголовок 2", value: "H2" },
  { label: "Заголовок 3", value: "H3" },
  { label: "Цитата", value: "BLOCKQUOTE" },
  { label: "Код", value: "PRE" },
];

// Page geometry in CSS px at 96dpi (A4)
const A4_W = 794;
const A4_H = 1123;

const selectCls =
  "h-9 shrink-0 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

/** Best-effort text extraction from legacy binary .doc (Word 97-2003) files. */
function extractLegacyDocText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const head = new TextDecoder("latin1").decode(bytes.slice(0, 512));
  // Some ".doc" files are actually RTF or HTML
  if (head.trimStart().startsWith("{\\rtf")) {
    const rtf = new TextDecoder("windows-1251").decode(bytes);
    return rtf
      .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\par[d]?/g, "\n")
      .replace(/\{\\[^{}]*\}/g, "")
      .replace(/\\[a-z]+-?\d* ?/gi, "")
      .replace(/[{}]/g, "");
  }
  if (/<html|<body|<w:worddocument/i.test(head)) {
    return "";
  }

  const pieces: string[] = [];
  // UTF-16LE runs
  const u16 = new TextDecoder("utf-16le", { fatal: false }).decode(bytes);
  for (const m of u16.matchAll(/[\p{L}\p{N}\p{P}\s]{25,}/gu)) pieces.push(m[0]);
  // Single-byte (cp1251) runs
  const cp = new TextDecoder("windows-1251", { fatal: false }).decode(bytes);
  for (const m of cp.matchAll(/[\p{L}\p{N}\p{P} ]{40,}/gu)) pieces.push(m[0]);

  const best = pieces
    .map((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " "))
    .filter((s) => {
      const letters = (s.match(/\p{L}/gu) || []).length;
      return letters / s.length > 0.5;
    })
    .sort((a, b) => b.length - a.length)
    .slice(0, 40);

  // Keep document order roughly: re-sort by first appearance
  const ordered = best.sort(
    (a, b) => (u16.indexOf(a) + cp.indexOf(a)) - (u16.indexOf(b) + cp.indexOf(b))
  );
  return ordered
    .join("\n\n")
    .replace(/\r/g, "\n")
    .replace(/\u0007|\u0013|\u0014|\u0015/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function VipEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading: vipLoading } = useUserVip(user?.id);
  const { documents, loading: docsLoading, reload } = useVipDocuments(user?.id);

  const editorRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState("Без назви");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VipDocument | null>(null);
  const [stats, setStats] = useState({ words: 0, chars: 0, pages: 1 });
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [statusHeight, setStatusHeight] = useState(34);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const hasAccess = !!vip;
  const pageW = orientation === "portrait" ? A4_W : A4_H;
  const pageH = orientation === "portrait" ? A4_H : A4_W;

  const updateStats = useCallback(() => {
    const el = editorRef.current;
    const text = el?.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const pages = el ? Math.max(1, Math.ceil(el.scrollHeight / pageH)) : 1;
    setStats({ words, chars: text.length, pages });
  }, [pageH]);

  useEffect(() => {
    updateStats();
  }, [orientation, updateStats]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDirty(true);
    updateStats();
  };

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    setDirty(true);
    updateStats();
  };

  // ---- Tables -------------------------------------------------------------
  const currentCell = (): HTMLTableCellElement | null => {
    const sel = window.getSelection();
    let node = sel?.anchorNode as HTMLElement | null;
    while (node && node !== editorRef.current) {
      if ((node as HTMLElement).tagName === "TD" || (node as HTMLElement).tagName === "TH")
        return node as HTMLTableCellElement;
      node = node.parentElement;
    }
    return null;
  };

  const insertTable = () => {
    const rows = Math.min(50, Math.max(1, tableRows));
    const cols = Math.min(20, Math.max(1, tableCols));
    const cell = `<td style="border:1px solid #999;padding:6px;min-width:40px;">&nbsp;</td>`;
    const head = `<tr>${`<th style="border:1px solid #999;padding:6px;background:rgba(128,128,128,.15);">&nbsp;</th>`.repeat(cols)}</tr>`;
    const body = `<tr>${cell.repeat(cols)}</tr>`.repeat(Math.max(0, rows - 1));
    insertHtml(
      `<table class="bnc-table" style="border-collapse:collapse;width:100%;margin:8px 0;">${head}${body}</table><p><br></p>`
    );
    setShowTableDialog(false);
  };

  const addRow = () => {
    const cell = currentCell();
    const row = cell?.parentElement as HTMLTableRowElement | undefined;
    if (!row) return toast.error("Поставте курсор у таблицю");
    const clone = row.cloneNode(true) as HTMLTableRowElement;
    Array.from(clone.cells).forEach((c) => (c.innerHTML = "&nbsp;"));
    row.after(clone);
    setDirty(true);
    updateStats();
  };

  const addColumn = () => {
    const cell = currentCell();
    const table = cell?.closest("table");
    if (!cell || !table) return toast.error("Поставте курсор у таблицю");
    const index = cell.cellIndex;
    Array.from(table.rows).forEach((r) => {
      const ref = r.cells[index];
      const c = document.createElement(ref?.tagName === "TH" ? "th" : "td");
      c.style.cssText = "border:1px solid #999;padding:6px;min-width:40px;";
      c.innerHTML = "&nbsp;";
      ref ? ref.after(c) : r.appendChild(c);
    });
    setDirty(true);
  };

  const deleteRow = () => {
    const row = currentCell()?.parentElement as HTMLTableRowElement | undefined;
    if (!row) return toast.error("Поставте курсор у таблицю");
    const table = row.closest("table");
    row.remove();
    if (table && table.rows.length === 0) table.remove();
    setDirty(true);
    updateStats();
  };

  const deleteColumn = () => {
    const cell = currentCell();
    const table = cell?.closest("table");
    if (!cell || !table) return toast.error("Поставте курсор у таблицю");
    const index = cell.cellIndex;
    Array.from(table.rows).forEach((r) => r.cells[index]?.remove());
    if (table.rows[0] && table.rows[0].cells.length === 0) table.remove();
    setDirty(true);
  };

  const deleteTable = () => {
    const table = currentCell()?.closest("table");
    if (!table) return toast.error("Поставте курсор у таблицю");
    table.remove();
    setDirty(true);
    updateStats();
  };

  // ---- Documents ----------------------------------------------------------
  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const id = await saveVipDocument({
        id: docId,
        userId: user.id,
        title: title.trim() || "Без назви",
        content: editorRef.current?.innerHTML || "",
      });
      setDocId(id);
      setDirty(false);
      reload();
      toast.success("Документ збережено на сайті");
    } catch (e: any) {
      console.error(e);
      toast.error("Не вдалося зберегти документ");
    } finally {
      setSaving(false);
    }
  };

  const openDocument = (doc: VipDocument) => {
    setDocId(doc.id);
    setTitle(doc.title);
    if (editorRef.current) editorRef.current.innerHTML = doc.content;
    setDirty(false);
    setShowLibrary(false);
    updateStats();
  };

  const newDocument = () => {
    setDocId(null);
    setTitle("Без назви");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setDirty(false);
    updateStats();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVipDocument(deleteTarget.id);
      if (docId === deleteTarget.id) newDocument();
      toast.success("Документ видалено");
      reload();
    } catch {
      toast.error("Не вдалося видалити документ");
    } finally {
      setDeleteTarget(null);
    }
  };

  const styleImportedTables = () => {
    editorRef.current?.querySelectorAll("table").forEach((t) => {
      (t as HTMLTableElement).style.borderCollapse = "collapse";
      (t as HTMLTableElement).style.width = "100%";
      t.querySelectorAll("td,th").forEach((c) => {
        const el = c as HTMLTableCellElement;
        if (!el.style.border) el.style.border = "1px solid #999";
        if (!el.style.padding) el.style.padding = "6px";
      });
    });
  };

  const handleImport = async (file: File) => {
    const name = file.name.replace(/\.[^.]+$/, "");
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (editorRef.current) editorRef.current.innerHTML = result.value;
      } else if (lower.endsWith(".doc")) {
        const arrayBuffer = await file.arrayBuffer();
        // ZIP signature -> actually a .docx renamed
        const sig = new Uint8Array(arrayBuffer.slice(0, 2));
        if (sig[0] === 0x50 && sig[1] === 0x4b) {
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (editorRef.current) editorRef.current.innerHTML = result.value;
        } else {
          const head = new TextDecoder("latin1").decode(new Uint8Array(arrayBuffer.slice(0, 512)));
          if (/<html|<body|<w:worddocument/i.test(head)) {
            const html = new TextDecoder("windows-1251").decode(new Uint8Array(arrayBuffer));
            if (editorRef.current) editorRef.current.innerHTML = html;
          } else {
            const text = extractLegacyDocText(arrayBuffer);
            if (!text.trim()) {
              toast.error("Не вдалося прочитати цей .doc. Збережіть його як .docx");
              return;
            }
            if (editorRef.current)
              editorRef.current.innerHTML = text
                .split(/\n{2,}/)
                .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                .join("");
            toast.message("Старий формат .doc відкрито як текст (форматування спрощено)");
          }
        }
      } else if (/\.(html?|htm)$/i.test(file.name)) {
        const text = await file.text();
        if (editorRef.current) editorRef.current.innerHTML = text;
      } else if (/\.(txt|md|rtf)$/i.test(file.name)) {
        const text = await file.text();
        if (editorRef.current)
          editorRef.current.innerHTML = text
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
            .join("");
      } else {
        toast.error("Непідтримуваний формат файлу");
        return;
      }
      styleImportedTables();
      setDocId(null);
      setTitle(name || "Без назви");
      setDirty(true);
      updateStats();
      toast.success("Файл відкрито");
    } catch (e) {
      console.error(e);
      toast.error("Не вдалося відкрити файл");
    }
  };

  const buildWordHtml = () =>
    `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${title}</title>` +
    `<style>@page{size:${orientation === "portrait" ? "A4 portrait" : "A4 landscape"};margin:2cm}` +
    `body{font-family:Arial, sans-serif;font-size:12pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}</style>` +
    `</head><body>${editorRef.current?.innerHTML || ""}</body></html>`;

  const downloadBlob = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "document").replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWord = () => {
    downloadBlob(new Blob([buildWordHtml()], { type: "application/msword" }), "doc");
    toast.success("Файл Word завантажено");
  };
  const exportHtml = () =>
    downloadBlob(new Blob([buildWordHtml()], { type: "text/html;charset=utf-8" }), "html");
  const exportTxt = () =>
    downloadBlob(
      new Blob([editorRef.current?.innerText || ""], { type: "text/plain;charset=utf-8" }),
      "txt"
    );
  const printPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(buildWordHtml());
    w.document.close();
    w.focus();
    w.print();
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await shellRef.current?.requestFullscreen?.();
    } else {
      await document.exitFullscreen();
    }
  };

  // Drag to resize the bottom status strip
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = statusHeight;
    const move = (ev: PointerEvent) =>
      setStatusHeight(Math.min(160, Math.max(0, startH + (startY - ev.clientY))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб користуватися редактором</p>
          <Button onClick={() => navigate("/auth")}>Увійти</Button>
        </main>
      </div>
    );
  }

  if (vipLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <Card className="p-8 text-center max-w-lg mx-auto">
            <Crown className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2">Текстовий редактор B&amp;C</h1>
            <p className="text-muted-foreground mb-4">
              Інструмент доступний лише користувачам з активним VIP-статусом.
            </p>
            <Button onClick={() => navigate("/vip")}>Переглянути тарифи VIP</Button>
          </Card>
        </main>
      </div>
    );
  }

  const toolBtn = "h-9 w-9 shrink-0";

  return (
    <div className="min-h-screen bg-background">
      {!isFullscreen && <Navbar />}
      <main className={cn("container mx-auto px-2 sm:px-4 py-4", isFullscreen && "max-w-none px-0 py-0")}>
        <div
          ref={shellRef}
          className={cn("bg-background", isFullscreen && "h-screen flex flex-col overflow-hidden")}
        >
          {!isFullscreen && (
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-amber-500" /> Текстовий редактор B&amp;C
              </h1>
              <Button variant="outline" size="sm" onClick={() => navigate("/vip/tools")}>
                VIP-інструменти
              </Button>
            </div>
          )}

          <Card className={cn("overflow-hidden", isFullscreen && "flex-1 min-h-0 flex flex-col rounded-none border-0")}>
            {/* Файлова панель */}
            <div className="flex items-center gap-2 p-2 border-b flex-wrap">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                placeholder="Назва документа"
                className="h-9 w-full sm:w-56"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Зберегти
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSaveAs(true)}>
                  <Download className="h-4 w-4 mr-1" /> Зберегти як
                </Button>
                <Button size="sm" variant="outline" onClick={newDocument}>
                  <Plus className="h-4 w-4 mr-1" /> Новий
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowLibrary((v) => !v)}>
                  <FolderOpen className="h-4 w-4 mr-1" /> Мої документи
                </Button>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Відкрити файл
                </Button>
                <Button size="sm" variant="outline" onClick={toggleFullscreen} className="hidden sm:inline-flex">
                  {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
                  {isFullscreen ? "Вийти" : "На весь екран"}
                </Button>
                {dirty && <Badge variant="secondary">Незбережено</Badge>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.txt,.md,.rtf,.html,.htm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Панель форматування (нативні списки — працюють і в повноекранному режимі) */}
            <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
              <select
                className={cn(selectCls, "w-[130px]")}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) exec("fontName", e.target.value);
                  e.target.selectedIndex = 0;
                }}
              >
                <option value="">Шрифт</option>
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>

              <select
                className={cn(selectCls, "w-[84px]")}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) exec("fontSize", e.target.value);
                  e.target.selectedIndex = 0;
                }}
              >
                <option value="">Розмір</option>
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                className={cn(selectCls, "w-[150px]")}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) exec("formatBlock", e.target.value);
                  e.target.selectedIndex = 0;
                }}
              >
                <option value="">Стиль</option>
                {BLOCKS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>

              <select
                className={cn(selectCls, "w-[120px]")}
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as "portrait" | "landscape")}
                title="Орієнтація сторінки"
              >
                <option value="portrait">Книжний</option>
                <option value="landscape">Альбомний</option>
              </select>

              <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("bold")} title="Жирний">
                <Bold className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("italic")} title="Курсив">
                <Italic className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("underline")} title="Підкреслений">
                <Underline className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("strikeThrough")} title="Закреслений">
                <Strikethrough className="h-4 w-4" />
              </Button>

              <label className={cn(toolBtn, "relative inline-flex items-center justify-center rounded-md hover:bg-accent cursor-pointer")} title="Колір тексту">
                <Baseline className="h-4 w-4" />
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => exec("foreColor", e.target.value)}
                />
              </label>
              <label className={cn(toolBtn, "relative inline-flex items-center justify-center rounded-md hover:bg-accent cursor-pointer")} title="Колір фону">
                <Highlighter className="h-4 w-4" />
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => exec("hiliteColor", e.target.value)}
                />
              </label>

              <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("justifyLeft")} title="По лівому краю">
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("justifyCenter")} title="По центру">
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("justifyRight")} title="По правому краю">
                <AlignRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("justifyFull")} title="По ширині">
                <AlignJustify className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("insertUnorderedList")} title="Маркований список">
                <List className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("insertOrderedList")} title="Нумерований список">
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("outdent")} title="Зменшити відступ">
                <Outdent className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("indent")} title="Збільшити відступ">
                <Indent className="h-4 w-4" />
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => setShowTableDialog(true)} title="Вставити таблицю">
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={addRow} title="Додати рядок">
                <Rows3 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={addColumn} title="Додати стовпець">
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 text-xs" onClick={deleteRow} title="Видалити рядок">
                − рядок
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 text-xs" onClick={deleteColumn} title="Видалити стовпець">
                − стовпець
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-9 shrink-0 text-xs text-destructive" onClick={deleteTable} title="Видалити таблицю">
                Видалити таблицю
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("undo")} title="Скасувати">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("redo")} title="Повторити">
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={toolBtn} onClick={() => exec("removeFormat")} title="Очистити формат">
                <RemoveFormatting className="h-4 w-4" />
              </Button>
            </div>

            {/* Бібліотека документів */}
            {showLibrary && (
              <div className="border-b p-3 bg-muted/30 max-h-64 overflow-y-auto">
                {docsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Збережених документів ще немає.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((d) => (
                      <div
                        key={d.id}
                        className={cn(
                          "flex items-center justify-between gap-3 p-2 rounded-md border bg-background",
                          d.id === docId && "border-amber-500"
                        )}
                      >
                        <button className="text-left min-w-0 flex-1" onClick={() => openDocument(d)}>
                          <p className="font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(d.updated_at), "d MMM yyyy, HH:mm", { locale: uk })}
                          </p>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteTarget(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Полотно документа з розділенням на сторінки */}
            <div className={cn("bg-muted/40 p-2 sm:p-6 overflow-auto", isFullscreen && "flex-1 min-h-0")}>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  setDirty(true);
                  updateStats();
                }}
                style={{
                  width: "100%",
                  maxWidth: pageW,
                  minHeight: pageH,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${pageH - 2}px, hsl(var(--border)) ${pageH - 2}px, hsl(var(--border)) ${pageH}px)`,
                }}
                className={cn(
                  "bnc-editor prose prose-sm sm:prose-base dark:prose-invert max-w-none",
                  "bg-card text-card-foreground mx-auto rounded-md shadow-sm",
                  "p-4 sm:p-10 outline-none"
                )}
              />
            </div>

            {/* Розділювач: тягніть, щоб зменшити нижню смугу */}
            <div
              onPointerDown={startResize}
              title="Потягніть, щоб змінити висоту нижньої смуги"
              className="h-2 shrink-0 cursor-row-resize bg-muted/60 hover:bg-muted flex items-center justify-center border-t"
            >
              <GripHorizontal className="h-3 w-3 text-muted-foreground" />
            </div>

            <div
              style={{ height: statusHeight }}
              className="flex items-center justify-between gap-3 px-3 overflow-hidden border-t text-xs text-muted-foreground"
            >
              <span>
                Слів: {stats.words} · Символів: {stats.chars} · Сторінок: {stats.pages} ·{" "}
                {orientation === "portrait" ? "Книжний" : "Альбомний"}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="sm:hidden h-7">
                {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
                {isFullscreen ? "Вийти" : "Повний екран"}
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Зберегти як */}
      <AlertDialog open={showSaveAs} onOpenChange={setShowSaveAs}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Зберегти на комп'ютері</AlertDialogTitle>
            <AlertDialogDescription>Оберіть формат файлу для завантаження.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Button variant="outline" onClick={() => { exportWord(); setShowSaveAs(false); }}>
              Word (.doc)
            </Button>
            <Button variant="outline" onClick={() => { exportHtml(); setShowSaveAs(false); }}>
              HTML (.html)
            </Button>
            <Button variant="outline" onClick={() => { exportTxt(); setShowSaveAs(false); }}>
              Текст (.txt)
            </Button>
            <Button variant="outline" onClick={() => { printPdf(); setShowSaveAs(false); }}>
              PDF (через друк)
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Вставити таблицю */}
      <AlertDialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вставити таблицю</AlertDialogTitle>
            <AlertDialogDescription>Вкажіть кількість рядків і стовпців.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Рядків</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={tableRows}
                onChange={(e) => setTableRows(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Стовпців</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={tableCols}
                onChange={(e) => setTableCols(Number(e.target.value))}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={insertTable}>Вставити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Документ «{deleteTarget?.title}» буде видалено назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
