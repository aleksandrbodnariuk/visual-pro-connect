import { useMemo, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { BookOpen, Plus, Search, Crown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserVip } from "@/hooks/vip/useUserVip";
import { useVipNotes, type VipNote } from "@/hooks/vip/useVipNotes";
import { NoteCard } from "@/components/vip/notebook/NoteCard";
import { NoteEditorDialog } from "@/components/vip/notebook/NoteEditorDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Notebook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { vip, loading: vipLoading } = useUserVip(user?.id);
  const { notes, loading, reload } = useVipNotes(user?.id);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<VipNote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (selectedTag && !n.tags.includes(selectedTag)) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [notes, search, selectedTag]);

  const openCreate = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };
  const openEdit = (note: VipNote) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("vip_notes" as any).delete().eq("id", deleteId);
    if (error) toast.error("Не вдалося видалити: " + error.message);
    else {
      toast.success("Нотатку видалено");
      reload();
    }
    setDeleteId(null);
  };

  const togglePin = async (note: VipNote) => {
    const { error } = await supabase
      .from("vip_notes" as any)
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id);
    if (error) toast.error("Не вдалося оновити");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="mb-4">Увійдіть, щоб користуватися нотатником</p>
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

  if (!vip) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <Card className="p-8 text-center max-w-lg mx-auto border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
            <Crown className="h-12 w-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-2xl font-bold mb-2">Нотатник доступний лише VIP</h2>
            <p className="text-muted-foreground mb-4">
              Оформіть VIP-членство, щоб отримати приватний нотатник з тегами, кольорами та закріпленням.
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button onClick={() => navigate("/vip")}>Переглянути тарифи</Button>
              <Button variant="outline" onClick={() => navigate("/vip/moi")}>Мій VIP</Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        <aside className="hidden lg:block col-span-3">
          <Sidebar className="sticky top-20" />
        </aside>

        <section className="col-span-12 lg:col-span-9 space-y-5 pb-20 md:pb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-amber-500" /> Мій нотатник
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/vip/tools")}>VIP-інструменти</Button>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" /> Нова нотатка
              </Button>
            </div>
          </div>

          <Card className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Пошук за заголовком, текстом або тегом..."
                className="pl-9"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={selectedTag === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedTag(null)}
                >
                  Усі
                </Badge>
                {allTags.map((t) => (
                  <Badge
                    key={t}
                    variant={selectedTag === t ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                  >
                    #{t}
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-lg font-semibold mb-1">
                {notes.length === 0 ? "У вас ще немає нотаток" : "Нічого не знайдено"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {notes.length === 0
                  ? "Створіть першу нотатку, щоб тримати важливе під рукою."
                  : "Спробуйте змінити запит або скиньте фільтр."}
              </p>
              {notes.length === 0 && (
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Створити нотатку
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => openEdit(note)}
                  onDelete={() => setDeleteId(note.id)}
                  onTogglePin={() => togglePin(note)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editingNote}
        userId={user.id}
        onSaved={reload}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити нотатку?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Нотатка буде видалена назавжди.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}