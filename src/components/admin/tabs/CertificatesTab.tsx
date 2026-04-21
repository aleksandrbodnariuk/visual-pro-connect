import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Award, Search, Save, Loader2 } from "lucide-react";
import { CertificateBadge } from "@/components/certificates/CertificateBadge";
import { PurchaseRequestsList } from "@/components/admin/certificates/PurchaseRequestsList";
import { CertificateTiersEditor } from "@/components/admin/certificates/CertificateTiersEditor";

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
}

interface Cert {
  user_id: string;
  is_active: boolean;
  discount_type: "fixed" | "percent" | "uah";
  discount_value: number;
  note: string | null;
}

interface DraftState {
  is_active: boolean;
  discount_type: "fixed" | "percent" | "uah";
  discount_value: string;
  note: string;
  dirty: boolean;
  saving: boolean;
}

function emptyDraft(): DraftState {
  return { is_active: false, discount_type: "fixed", discount_value: "0", note: "", dirty: false, saving: false };
}

export function CertificatesTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [certs, setCerts] = useState<Record<string, Cert>>({});
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: usersData, error: usersErr }, { data: certsData, error: certsErr }] = await Promise.all([
        supabase.rpc("get_users_for_admin"),
        supabase.from("user_certificates").select("user_id,is_active,discount_type,discount_value,note"),
      ]);

      if (usersErr) throw usersErr;
      if (certsErr) throw certsErr;

      const userRows: UserRow[] = (usersData || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        phone_number: u.phone_number,
      }));
      setUsers(userRows);

      const certMap: Record<string, Cert> = {};
      (certsData || []).forEach((c: any) => {
        certMap[c.user_id] = c as Cert;
      });
      setCerts(certMap);

      // Build initial drafts
      const draftMap: Record<string, DraftState> = {};
      userRows.forEach((u) => {
        const c = certMap[u.id];
        draftMap[u.id] = c
          ? {
              is_active: c.is_active,
              discount_type: c.discount_type,
              discount_value: String(c.discount_value),
              note: c.note || "",
              dirty: false,
              saving: false,
            }
          : emptyDraft();
      });
      setDrafts(draftMap);
    } catch (e: any) {
      console.error(e);
      toast.error("Не вдалося завантажити дані сертифікатів");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateDraft = (userId: string, patch: Partial<DraftState>) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || emptyDraft()), ...patch, dirty: true },
    }));
  };

  const saveCertificate = async (userId: string) => {
    const draft = drafts[userId];
    if (!draft) return;

    const value = parseFloat(draft.discount_value);
    if (isNaN(value) || value < 0) {
      toast.error("Значення знижки має бути додатнім числом");
      return;
    }
    if (draft.discount_type === "percent" && value > 100) {
      toast.error("Відсоток знижки не може перевищувати 100");
      return;
    }

    setDrafts((p) => ({ ...p, [userId]: { ...p[userId], saving: true } }));

    const payload = {
      user_id: userId,
      is_active: draft.is_active,
      discount_type: draft.discount_type,
      discount_value: value,
      note: draft.note.trim() || null,
    };

    const { error } = await supabase
      .from("user_certificates")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error(error);
      toast.error("Не вдалося зберегти сертифікат: " + error.message);
      setDrafts((p) => ({ ...p, [userId]: { ...p[userId], saving: false } }));
      return;
    }

    toast.success("Сертифікат збережено");
    setCerts((p) => ({ ...p, [userId]: { ...payload, note: payload.note } as Cert }));
    setDrafts((p) => ({ ...p, [userId]: { ...p[userId], saving: false, dirty: false } }));
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      return (
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.phone_number || "").toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  const activeCount = Object.values(certs).filter((c) => c.is_active && c.discount_value > 0).length;

  return (
    <div className="space-y-6">
      <PurchaseRequestsList onApproved={() => load()} />
      <CertificateTiersEditor />
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Сертифікати знижок
              </CardTitle>
              <CardDescription>
                Видавайте сертифікати на знижку на послуги фото, відео та музика. Бейдж видно публічно біля аватара користувача.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Активних: {activeCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Пошук за іменем або телефоном..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => {
                const draft = drafts[u.id] || emptyDraft();
                const initials = (u.full_name || "U")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={u.id}
                    className={`flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:gap-4 transition-colors ${
                      draft.dirty ? "border-amber-500/60 bg-amber-500/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 md:w-64">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar_url || undefined} alt={u.full_name || ""} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.full_name || "Без імені"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.phone_number || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={draft.is_active}
                        onCheckedChange={(checked) => updateDraft(u.id, { is_active: checked })}
                        id={`active-${u.id}`}
                      />
                      <Label htmlFor={`active-${u.id}`} className="text-sm cursor-pointer">
                        {draft.is_active ? "Активний" : "Вимкнено"}
                      </Label>
                    </div>

                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Select
                        value={draft.discount_type}
                        onValueChange={(v) => updateDraft(u.id, { discount_type: v as "fixed" | "percent" | "uah" })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Сума ($)</SelectItem>
                          <SelectItem value="uah">Сума (₴)</SelectItem>
                          <SelectItem value="percent">Відсоток (%)</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.discount_value}
                        onChange={(e) => updateDraft(u.id, { discount_value: e.target.value })}
                        className="w-28"
                        placeholder="0"
                      />

                      <Input
                        value={draft.note}
                        onChange={(e) => updateDraft(u.id, { note: e.target.value })}
                        placeholder="Нотатка (опц.)"
                        className="flex-1 min-w-[150px]"
                        maxLength={120}
                      />

                      {draft.is_active && parseFloat(draft.discount_value) > 0 && (
                        <CertificateBadge
                          userId={u.id}
                          size="sm"
                          certificate={{
                            id: "preview",
                            user_id: u.id,
                            is_active: true,
                            discount_type: draft.discount_type,
                            discount_value: parseFloat(draft.discount_value) || 0,
                            note: draft.note || null,
                          }}
                        />
                      )}

                      <Button
                        size="sm"
                        onClick={() => saveCertificate(u.id)}
                        disabled={!draft.dirty || draft.saving}
                        className="ml-auto"
                      >
                        {draft.saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-1" />
                            Зберегти
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Користувачів не знайдено</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}