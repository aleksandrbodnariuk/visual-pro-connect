import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Pencil, Search } from "lucide-react";

interface Specialist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  categories: string[] | null;
  city: string | null;
  country: string | null;
  created_at: string;
}
interface Category { id: string; name: string }

const initials = (name: string | null) =>
  name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

export function SpecialistsTab() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState<Specialist | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data, error }, { data: cats }] = await Promise.all([
        supabase.rpc("get_specialists"),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (error) toast.error("Помилка при завантаженні фахівців");
      setSpecialists((data as Specialist[]) || []);
      setCategories((cats as Category[]) || []);
      setLoading(false);
    })();
  }, []);

  const label = (c: string) => categories.find((x) => x.id === c || x.name === c)?.name ?? c;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return specialists.filter((s) => {
      if (cat !== "all" && !(s.categories ?? []).some((c) => c === cat || label(c) === label(cat))) return false;
      if (!q) return true;
      return [s.full_name, s.city, s.title].some((v) => v?.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialists, query, cat, categories]);

  const openEdit = (s: Specialist) => {
    setEditing(s);
    setPicked((s.categories ?? []).map((c) => categories.find((x) => x.name === c)?.id ?? c));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({ categories: picked }).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error("Не вдалося зберегти спеціальності");
    setSpecialists((l) => l.map((s) => (s.id === editing.id ? { ...s, categories: picked } : s)));
    toast.success("Спеціальності оновлено");
    setEditing(null);
  };

  const Chips = ({ s }: { s: Specialist }) => (
    <div className="flex flex-wrap gap-1">
      {s.categories?.length ? s.categories.map((c) => <Badge key={c} variant="secondary" className="text-xs">{label(c)}</Badge>)
        : <span className="text-sm text-muted-foreground">—</span>}
    </div>
  );
  const Actions = ({ s }: { s: Specialist }) => (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" className="min-h-11" onClick={() => openEdit(s)}><Pencil className="mr-1 h-4 w-4" />Спеціальності</Button>
      <Button asChild size="sm" variant="ghost" className="min-h-11">
        <a href={`/profile/${s.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Профіль і портфоліо</a>
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Команда B&C studio</CardTitle>
        <CardDescription>
          Користувачі з роллю «Фахівець» ({specialists.length}). Роль призначається у вкладці «Користувачі».
        </CardDescription>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="min-h-11 pl-9" placeholder="Пошук за ім'ям або містом" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="min-h-11 sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі спеціальності</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Фахівців не знайдено.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead><tr className="border-b">
                  <th className="p-2 text-left">Фахівець</th><th className="p-2 text-left">Спеціальності</th>
                  <th className="p-2 text-left">Місто</th><th className="p-2 text-left">Дії</th>
                </tr></thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-muted/50">
                      <td className="p-2"><div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src={s.avatar_url || undefined} /><AvatarFallback className="text-xs">{initials(s.full_name)}</AvatarFallback></Avatar>
                        <span className="font-medium">{s.full_name || "Без імені"}</span>
                      </div></td>
                      <td className="p-2"><Chips s={s} /></td>
                      <td className="p-2 text-sm">{[s.city, s.country].filter(Boolean).join(", ") || "—"}</td>
                      <td className="p-2"><Actions s={s} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {filtered.map((s) => (
                <Card key={s.id} className="space-y-2 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10"><AvatarImage src={s.avatar_url || undefined} /><AvatarFallback>{initials(s.full_name)}</AvatarFallback></Avatar>
                    <div><p className="font-medium">{s.full_name || "Без імені"}</p>
                      <p className="text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(", ")}</p></div>
                  </div>
                  <Chips s={s} />
                  <Actions s={s} />
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Спеціальності: {editing?.full_name}</DialogTitle></DialogHeader>
          <div className="grid max-h-[50vh] gap-2 overflow-y-auto sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border px-3">
                <Checkbox checked={picked.includes(c.id)}
                  onCheckedChange={(v) => setPicked((p) => (v ? [...p, c.id] : p.filter((x) => x !== c.id)))} />
                {c.name}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Скасувати</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Збереження…" : "Зберегти"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
