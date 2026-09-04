import { useCallback, useEffect, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const hasAccess = !!vip;

  const updateStats = useCallback(() => {
    const text = editorRef.current?.innerText || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setStats({ words, chars: text.length });
  }, []);

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

  const handleImport = async (file: File) => {
    const name = file.name.replace(/\.[^.]+$/, "");
    try {
      if (file.name.toLowerCase().endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (editorRef.current) editorRef.current.innerHTML = result.value;
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
      } else if (file.name.toLowerCase().endsWith(".doc")) {
        toast.error("Старий формат .doc не підтримується. Збережіть файл як .docx");
        return;
      } else {
        toast.error("Непідтримуваний формат файлу");
        return;
      }
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
    `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Arial, sans-serif;font-size:12pt;">${
      editorRef.current?.innerHTML || ""
    }</body></html>`;

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
  const exportHtml = () => {
    downloadBlob(new Blob([buildWordHtml()], { type: "text/html;charset=utf-8" }), "html");
  };
  const exportTxt = () => {
    downloadBlob(
      new Blob([editorRef.current?.innerText || ""], { type: "text/plain;charset=utf-8" }),
      "txt"
    );
  };
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
        <div ref={shellRef} className={cn("bg-background", isFullscreen && "h-screen overflow-auto p-2 sm:p-4")}>
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

          <Card className="overflow-hidden">
            {/* Файлова панель */}
            <div className="flex items-center gap-2 p-2 border-b flex-wrap">
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                placeholder="Назва документа"
                className="h-9 w-full sm:w-64"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Зберегти
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" /> Завантажити
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={exportWord}>Word (.doc)</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportHtml}>HTML (.html)</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportTxt}>Текст (.txt)</DropdownMenuItem>
                    <DropdownMenuItem onClick={printPdf}>Друк / PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

            {/* Панель форматування */}
            <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
              <Select onValueChange={(v) => exec("fontName", v)}>
                <SelectTrigger className="h-9 w-[130px] shrink-0">
                  <SelectValue placeholder="Шрифт" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => exec("fontSize", v)}>
                <SelectTrigger className="h-9 w-[76px] shrink-0">
                  <SelectValue placeholder="Розмір" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select onValueChange={(v) => exec("formatBlock", v)}>
                <SelectTrigger className="h-9 w-[140px] shrink-0">
                  <SelectValue placeholder="Стиль" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {BLOCKS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

            {/* Полотно документа */}
            <div className="bg-muted/40 p-2 sm:p-6 overflow-x-auto">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  setDirty(true);
                  updateStats();
                }}
                className={cn(
                  "bnc-editor prose prose-sm sm:prose-base dark:prose-invert max-w-none",
                  "bg-card text-card-foreground mx-auto rounded-md shadow-sm",
                  "p-4 sm:p-10 outline-none",
                  "w-full sm:max-w-[794px] min-h-[50vh] sm:min-h-[900px]"
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-3 px-3 py-2 border-t text-xs text-muted-foreground flex-wrap">
              <span>
                Слів: {stats.words} · Символів: {stats.chars}
              </span>
              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="sm:hidden h-7">
                {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
                {isFullscreen ? "Вийти" : "Повний екран"}
              </Button>
            </div>
          </Card>
        </div>
      </main>

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
