import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Loader2, Trash2, Highlighter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Переклад Івана Огієнка (UBIO) через відкритий API bolls.life
const API = "https://bolls.life";
const TR = "UBIO";

type Book = { bookid: number; name: string; chapters: number };
type Verse = { verse: number; text: string };
type Mark = { book: number; chapter: number; verse: number; label: string; at: number };
type Store = {
  progress?: { book: number; chapter: number; verse: number };
  bookmarks: Mark[];
  highlights: Record<string, string>; // "b:c:v" -> colour class
};

const COLORS = [
  { id: "yellow", cls: "bg-yellow-400/30", dot: "bg-yellow-400" },
  { id: "green", cls: "bg-green-400/30", dot: "bg-green-400" },
  { id: "blue", cls: "bg-sky-400/30", dot: "bg-sky-400" },
  { id: "pink", cls: "bg-pink-400/30", dot: "bg-pink-400" },
];

const clean = (t: string) => t.replace(/<S>.*?<\/S>/g, "").replace(/<[^>]+>/g, "").trim();

export default function VipBible() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const key = `vip_bible_${user?.id ?? "anon"}`;
  const [store, setStore] = useState<Store>({ bookmarks: [], highlights: {} });
  const [loadedStore, setLoadedStore] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState(1);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const scrollTarget = useRef<number | null>(null);
  const verseRefs = useRef<Record<number, HTMLElement | null>>({});

  const syncTimer = useRef<ReturnType<typeof setTimeout>>();
  const save = useCallback((next: Store) => {
    setStore(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* quota */ }
    if (!user?.id) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("vip_bible_state").upsert({ user_id: user.id, data: next }).then(() => {});
    }, 1500);
  }, [key, user?.id]);

  // load saved state & resume position
  useEffect(() => {
    let alive = true;
    (async () => {
    let remote: Store | null = null;
    if (user?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("vip_bible_state").select("data").eq("user_id", user.id).maybeSingle();
      if (data?.data && Object.keys(data.data).length) remote = data.data as Store;
    }
    if (!alive) return;
    try {
      const s: Store = remote || JSON.parse(localStorage.getItem(key) || "null") || { bookmarks: [], highlights: {} };
      setStore({ bookmarks: s.bookmarks || [], highlights: s.highlights || {}, progress: s.progress });
      if (s.progress) {
        setBook(s.progress.book);
        setChapter(s.progress.chapter);
        scrollTarget.current = s.progress.verse;
      }
    } catch { /* ignore */ }
    setLoadedStore(true);
    })();
    return () => { alive = false; };
  }, [key, user?.id]);

  useEffect(() => {
    fetch(`${API}/get-books/${TR}/`).then((r) => r.json()).then(setBooks).catch(() => setError("Не вдалося завантажити перелік книг"));
  }, []);

  useEffect(() => {
    if (!loadedStore) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelected(null);
    const cacheKey = `bible_${TR}_${book}_${chapter}`;
    const cached = sessionStorage.getItem(cacheKey);
    const p = cached
      ? Promise.resolve(JSON.parse(cached))
      : fetch(`${API}/get-text/${TR}/${book}/${chapter}/`).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
    p.then((data: Verse[]) => {
      if (cancelled) return;
      const v = data.map((d) => ({ verse: d.verse, text: clean(d.text) }));
      try { sessionStorage.setItem(cacheKey, JSON.stringify(v)); } catch { /* ignore */ }
      setVerses(v);
    })
      .catch(() => !cancelled && setError("Не вдалося завантажити розділ. Перевірте з'єднання та спробуйте ще раз."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [book, chapter, loadedStore, reload]);

  // restore scroll after verses render
  useEffect(() => {
    if (loading || scrollTarget.current == null) return;
    const el = verseRefs.current[scrollTarget.current];
    scrollTarget.current = null;
    if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 50);
    else window.scrollTo({ top: 0 });
  }, [loading, verses]);

  // track reading position (topmost visible verse)
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    if (loading || !verses.length) return;
    const obs = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.verse));
      if (!vis.length) return;
      const v = Math.min(...vis);
      save({ ...storeRef.current, progress: { book, chapter, verse: v } });
    }, { rootMargin: "-80px 0px -60% 0px" });
    Object.values(verseRefs.current).forEach((el) => el && obs.observe(el));
    save({ ...storeRef.current, progress: { book, chapter, verse: storeRef.current.progress?.book === book && storeRef.current.progress?.chapter === chapter ? storeRef.current.progress.verse : 1 } });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, verses]);

  const currentBook = books.find((b) => b.bookid === book);
  const bookName = (id: number) => books.find((b) => b.bookid === id)?.name ?? `Книга ${id}`;

  const go = (b: number, c: number, v?: number) => {
    scrollTarget.current = v ?? null;
    setBook(b);
    setChapter(c);
    if (!v) window.scrollTo({ top: 0 });
  };

  const prev = () => {
    if (chapter > 1) go(book, chapter - 1);
    else if (book > 1) go(book - 1, books.find((b) => b.bookid === book - 1)?.chapters ?? 1);
  };
  const next = () => {
    if (currentBook && chapter < currentBook.chapters) go(book, chapter + 1);
    else if (book < 66) go(book + 1, 1);
  };

  const hKey = (v: number) => `${book}:${chapter}:${v}`;
  const setHighlight = (v: number, color: string | null) => {
    const h = { ...store.highlights };
    if (color) h[hKey(v)] = color; else delete h[hKey(v)];
    save({ ...store, highlights: h });
  };
  const isBookmarked = (v: number) => store.bookmarks.some((m) => m.book === book && m.chapter === chapter && m.verse === v);
  const toggleBookmark = (v: number) => {
    const exists = isBookmarked(v);
    const bookmarks = exists
      ? store.bookmarks.filter((m) => !(m.book === book && m.chapter === chapter && m.verse === v))
      : [{ book, chapter, verse: v, label: `${currentBook?.name ?? ""} ${chapter}:${v}`, at: Date.now() }, ...store.bookmarks];
    save({ ...store, bookmarks });
  };

  const highlightList = useMemo(
    () => Object.entries(store.highlights).map(([k, c]) => { const [b, ch, v] = k.split(":").map(Number); return { b, ch, v, c }; }),
    [store.highlights],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-20 sm:pt-24 pb-32 max-w-3xl">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <Button variant="ghost" onClick={() => navigate("/vip/tools")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> VIP-інструменти
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline"><Bookmark className="h-4 w-4 mr-1" /> Закладки ({store.bookmarks.length})</Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader><SheetTitle>Закладки та виділення</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-2">
                {store.bookmarks.length === 0 && <p className="text-sm text-muted-foreground">Закладок ще немає. Натисніть на вірш, щоб додати.</p>}
                {store.bookmarks.map((m) => (
                  <div key={`${m.book}-${m.chapter}-${m.verse}`} className="flex items-center gap-2">
                    <Button variant="ghost" className="flex-1 justify-start min-h-11" onClick={() => go(m.book, m.chapter, m.verse)}>
                      <BookmarkCheck className="h-4 w-4 mr-2 text-primary" /> {bookName(m.book)} {m.chapter}:{m.verse}
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Видалити закладку"
                      onClick={() => save({ ...store, bookmarks: store.bookmarks.filter((x) => x !== m) })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {highlightList.length > 0 && <h4 className="pt-4 font-semibold text-sm">Виділені вірші</h4>}
                {highlightList.map((h) => (
                  <Button key={`${h.b}:${h.ch}:${h.v}`} variant="ghost" className="w-full justify-start min-h-11" onClick={() => go(h.b, h.ch, h.v)}>
                    <span className={`h-3 w-3 rounded-full mr-2 ${COLORS.find((c) => c.id === h.c)?.dot}`} /> {bookName(h.b)} {h.ch}:{h.v}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Card className="p-3 mb-4 flex gap-2 flex-wrap items-center sticky top-16 sm:top-20 z-10">
          <Select value={String(book)} onValueChange={(v) => go(Number(v), 1)}>
            <SelectTrigger className="flex-1 min-w-[160px]"><SelectValue placeholder="Книга" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {books.map((b) => <SelectItem key={b.bookid} value={String(b.bookid)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(chapter)} onValueChange={(v) => go(book, Number(v))}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Розділ" /></SelectTrigger>
            <SelectContent className="max-h-80">
              {Array.from({ length: currentBook?.chapters ?? 1 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>Розділ {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button size="icon" variant="outline" onClick={prev} aria-label="Попередній розділ"><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="icon" variant="outline" onClick={next} aria-label="Наступний розділ"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </Card>

        <h1 className="text-2xl font-bold mb-1">{currentBook?.name ?? "Біблія"} {chapter}</h1>
        <p className="text-xs text-muted-foreground mb-4">Переклад Івана Огієнка. Місце читання, закладки й виділення зберігаються у вашому акаунті та доступні на всіх пристроях. Натисніть на вірш, щоб виділити або додати закладку.</p>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <Card className="p-6 text-center space-y-3">
            <p>{error}</p>
            <Button onClick={() => setReload((r) => r + 1)}>Спробувати ще раз</Button>
          </Card>
        ) : (
          <div className="space-y-1 text-lg leading-relaxed font-serif">
            {verses.map((v) => {
              const color = COLORS.find((c) => c.id === store.highlights[hKey(v.verse)]);
              return (
                <div key={v.verse} data-verse={v.verse} ref={(el) => (verseRefs.current[v.verse] = el)} className="scroll-mt-36">
                  <p
                    onClick={() => setSelected(selected === v.verse ? null : v.verse)}
                    className={`cursor-pointer rounded px-1 py-0.5 ${color?.cls ?? ""} ${color ? "underline decoration-2 underline-offset-4" : ""} ${selected === v.verse ? "ring-2 ring-primary" : ""}`}
                  >
                    <sup className="text-xs text-muted-foreground mr-1 font-sans">{v.verse}</sup>
                    {v.text}
                    {isBookmarked(v.verse) && <BookmarkCheck className="inline h-4 w-4 ml-1 text-primary" />}
                  </p>
                  {selected === v.verse && (
                    <div className="flex items-center gap-2 flex-wrap py-2 font-sans">
                      <Highlighter className="h-4 w-4 text-muted-foreground" />
                      {COLORS.map((c) => (
                        <button key={c.id} aria-label={`Виділити ${c.id}`} onClick={() => setHighlight(v.verse, c.id)}
                          className={`h-8 w-8 rounded-full ${c.dot} ${store.highlights[hKey(v.verse)] === c.id ? "ring-2 ring-offset-2 ring-primary ring-offset-background" : ""}`} />
                      ))}
                      {color && <Button size="sm" variant="ghost" onClick={() => setHighlight(v.verse, null)}>Зняти</Button>}
                      <Button size="sm" variant={isBookmarked(v.verse) ? "default" : "outline"} onClick={() => toggleBookmark(v.verse)}>
                        <Bookmark className="h-4 w-4 mr-1" /> {isBookmarked(v.verse) ? "У закладках" : "Закладка"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="flex justify-between pt-6 font-sans">
              <Button variant="outline" onClick={prev}><ChevronLeft className="h-4 w-4 mr-1" /> Назад</Button>
              <Button onClick={next}>Далі <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
