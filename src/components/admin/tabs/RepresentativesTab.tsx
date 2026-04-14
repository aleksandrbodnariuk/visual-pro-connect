
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Save, Users, ShoppingCart, Settings2, ChevronDown, ChevronRight, UserX, Package, AlertCircle, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminServicesManager } from "@/components/admin/AdminServicesManager";

interface RepNode {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  parentId: string | null;
  children: RepNode[];
  isActive: boolean;
}

interface RepOrder {
  id: string;
  title: string;
  status: string;
  order_amount: number | null;
  order_date: string;
  representative_name: string;
}

const ROLE_LABELS: Record<string, string> = {
  representative: "Представник",
  manager: "Менеджер",
  director: "Директор",
};

const ROLE_COLORS: Record<string, string> = {
  representative: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  manager: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  director: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
};

// ── Settings keys in site_settings ──
const SETTING_INVITE_TEXT = "rep-invite-text";
const SETTING_TOTAL_MAX = "rep-total-max-percent";
const SETTING_PERSONAL = "rep-personal-percent";
const SETTING_MANAGER = "rep-manager-percent";
const SETTING_DIRECTOR = "rep-director-percent";

const ALL_SETTING_KEYS = [SETTING_INVITE_TEXT, SETTING_TOTAL_MAX, SETTING_PERSONAL, SETTING_MANAGER, SETTING_DIRECTOR];

export function RepresentativesTab() {
  const [tree, setTree] = useState<RepNode[]>([]);
  const [orders, setOrders] = useState<RepOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<RepOrder[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<RepOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"structure" | "orders" | "services" | "settings">("structure");
  const [archiveDialog, setArchiveDialog] = useState<RepOrder | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<RepOrder | null>(null);

  // Settings state
  const [totalMaxPercent, setTotalMaxPercent] = useState("10");
  const [personalPercent, setPersonalPercent] = useState("5");
  const [managerPercent, setManagerPercent] = useState("3");
  const [directorPercent, setDirectorPercent] = useState("2");
  const [inviteText, setInviteText] = useState("Приєднуйтесь до нашої спільноти!");
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Validation
  const sumPercent = parseFloat(personalPercent || "0") + parseFloat(managerPercent || "0") + parseFloat(directorPercent || "0");
  const maxPercent = parseFloat(totalMaxPercent || "0");
  const validationError = sumPercent > maxPercent
    ? `Сума відсотків (${sumPercent}%) перевищує загальний ліміт (${maxPercent}%)`
    : null;

  // ── Load representatives tree ──
  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      // Load representatives with user info
      const { data: reps, error } = await supabase
        .from("representatives")
        .select("id, user_id, role, parent_id, created_at");

      if (error) throw error;

      if (!reps || reps.length === 0) {
        setTree([]);
        setLoading(false);
        return;
      }

      const userIds = reps.map((r) => r.user_id);
      const { data: profiles } = await supabase.rpc("get_safe_public_profiles_by_ids", {
        _ids: userIds,
      });

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => {
        profileMap[p.id] = p;
      });

      // Check which users are blocked
      const { data: usersData } = await supabase.rpc("get_users_for_admin");
      const blockedMap: Record<string, boolean> = {};
      (usersData || []).forEach((u: any) => {
        blockedMap[u.id] = Boolean(u.is_blocked);
      });

      // Build tree
      const nodeMap: Record<string, RepNode> = {};
      reps.forEach((r) => {
        const profile = profileMap[r.user_id];
        nodeMap[r.id] = {
          id: r.id,
          userId: r.user_id,
          fullName: profile?.full_name || "Без імені",
          avatarUrl: profile?.avatar_url || null,
          role: r.role,
          parentId: r.parent_id,
          children: [],
          isActive: !blockedMap[r.user_id],
        };
      });

      const roots: RepNode[] = [];
      Object.values(nodeMap).forEach((node) => {
        if (node.parentId && nodeMap[node.parentId]) {
          nodeMap[node.parentId].children.push(node);
        } else {
          roots.push(node);
        }
      });

      setTree(roots);
    } catch (err) {
      console.error("Error loading representatives:", err);
      toast.error("Помилка завантаження представників");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load orders linked to representatives ──
  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("specialist_orders")
        .select("id, title, status, order_amount, order_date, representative_id")
        .not("representative_id", "is", null)
        .order("order_date", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Get representative user names
      const repIds = [...new Set((data || []).map((o) => o.representative_id!))];
      let repNameMap: Record<string, string> = {};

      if (repIds.length > 0) {
        const { data: reps } = await supabase
          .from("representatives")
          .select("id, user_id")
          .in("id", repIds);

        if (reps && reps.length > 0) {
          const userIds = reps.map((r) => r.user_id);
          const { data: profiles } = await supabase.rpc("get_safe_public_profiles_by_ids", {
            _ids: userIds,
          });

          const profileMap: Record<string, string> = {};
          (profiles || []).forEach((p: any) => {
            profileMap[p.id] = p.full_name || "Без імені";
          });

          reps.forEach((r) => {
            repNameMap[r.id] = profileMap[r.user_id] || "Без імені";
          });
        }
      }

      const mapped = (data || []).map((o) => ({
        id: o.id,
        title: o.title,
        status: o.status,
        order_amount: o.order_amount,
        order_date: o.order_date,
        representative_name: repNameMap[o.representative_id!] || "—",
      }));

      setOrders(mapped);
      setActiveOrders(mapped.filter((o) => o.status !== "archived"));
      setArchivedOrders(mapped.filter((o) => o.status === "archived"));
    } catch (err) {
      console.error("Error loading representative orders:", err);
    }
  }, []);

  // ── Load settings ──
  const loadSettings = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("id, value")
        .in("id", ALL_SETTING_KEYS);

      (data || []).forEach((s: any) => {
        if (s.id === SETTING_TOTAL_MAX) setTotalMaxPercent(s.value);
        if (s.id === SETTING_PERSONAL) setPersonalPercent(s.value);
        if (s.id === SETTING_MANAGER) setManagerPercent(s.value);
        if (s.id === SETTING_DIRECTOR) setDirectorPercent(s.value);
        if (s.id === SETTING_INVITE_TEXT) setInviteText(s.value);
      });
    } catch (err) {
      console.error("Error loading rep settings:", err);
    }
  }, []);

  useEffect(() => {
    loadTree();
    loadOrders();
    loadSettings();
  }, [loadTree, loadOrders, loadSettings]);

  // ── Save settings ──
  const saveSettings = async () => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSettingsLoading(true);
    try {
      const upserts = [
        { id: SETTING_TOTAL_MAX, value: totalMaxPercent, updated_at: new Date().toISOString() },
        { id: SETTING_PERSONAL, value: personalPercent, updated_at: new Date().toISOString() },
        { id: SETTING_MANAGER, value: managerPercent, updated_at: new Date().toISOString() },
        { id: SETTING_DIRECTOR, value: directorPercent, updated_at: new Date().toISOString() },
        { id: SETTING_INVITE_TEXT, value: inviteText, updated_at: new Date().toISOString() },
      ];

      for (const item of upserts) {
        const { error } = await supabase
          .from("site_settings")
          .upsert(item, { onConflict: "id" });
        if (error) throw error;
      }

      toast.success("Налаштування збережено");
    } catch (err) {
      console.error("Error saving rep settings:", err);
      toast.error("Помилка збереження налаштувань");
    } finally {
      setSettingsLoading(false);
    }
  };

  // ── Toggle user block status ──
  const toggleRepresentativeBlock = async (userId: string, currentlyActive: boolean) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_blocked: currentlyActive })
        .eq("id", userId);

      if (error) throw error;

      toast.success(currentlyActive ? "Користувача заблоковано" : "Користувача розблоковано");
      loadTree();
    } catch (err) {
      console.error("Error toggling block:", err);
      toast.error("Помилка зміни статусу");
    }
  };

  // ── Count all nodes ──
  const countNodes = (nodes: RepNode[]): number => {
    let count = 0;
    for (const n of nodes) {
      count += 1 + countNodes(n.children);
    }
    return count;
  };

  const totalReps = countNodes(tree);

  const STATUS_LABELS: Record<string, string> = {
    pending: "Очікує",
    confirmed: "Підтверджено",
    completed: "Виконано",
    cancelled: "Скасовано",
  };

  return (
    <div className="space-y-6">
      {/* ── View Switcher ── */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeView === "structure" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("structure")}
        >
          <Users className="h-4 w-4 mr-1" />
          Структура ({totalReps})
        </Button>
        <Button
          variant={activeView === "orders" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("orders")}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          Замовлення ({orders.length})
        </Button>
        <Button
          variant={activeView === "settings" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("settings")}
        >
          <Settings2 className="h-4 w-4 mr-1" />
          Налаштування
        </Button>
        <Button
          variant={activeView === "services" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("services")}
        >
          <Package className="h-4 w-4 mr-1" />
          Послуги
        </Button>
      </div>

      {/* ── Structure View ── */}
      {activeView === "structure" && (
        <Card>
          <CardHeader>
            <CardTitle>Структура представників</CardTitle>
            <CardDescription>Ієрархія представників, менеджерів та директорів</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : tree.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Немає представників</p>
                <p className="text-sm mt-1">
                  Призначте представників у вкладці «Користувачі» або через систему запрошень.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onToggleBlock={toggleRepresentativeBlock}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Orders View ── */}
      {activeView === "orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Замовлення через представників</CardTitle>
            <CardDescription>Замовлення, прив'язані до представників</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Немає замовлень</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-2">Замовлення</th>
                        <th className="p-2">Представник</th>
                        <th className="p-2">Дата</th>
                        <th className="p-2">Сума</th>
                        <th className="p-2">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">{o.title}</td>
                          <td className="p-2">{o.representative_name}</td>
                          <td className="p-2">{new Date(o.order_date).toLocaleDateString("uk-UA")}</td>
                          <td className="p-2">{o.order_amount != null ? `${o.order_amount} $` : "—"}</td>
                          <td className="p-2">
                            <Badge variant="secondary">{STATUS_LABELS[o.status] || o.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {orders.map((o) => (
                    <Card key={o.id} className="p-3">
                      <p className="font-medium">{o.title}</p>
                      <p className="text-sm text-muted-foreground">{o.representative_name}</p>
                      <div className="flex justify-between mt-2 text-sm">
                        <span>{new Date(o.order_date).toLocaleDateString("uk-UA")}</span>
                        <span>{o.order_amount != null ? `${o.order_amount} $` : "—"}</span>
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {STATUS_LABELS[o.status] || o.status}
                      </Badge>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Settings View ── */}
      {activeView === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>Налаштування представників</CardTitle>
            <CardDescription>Комісійні відсотки та текст запрошення</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Commission percentages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total-max-percent">Загальний відсоток представників (%)</Label>
                <Input
                  id="total-max-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={totalMaxPercent}
                  onChange={(e) => setTotalMaxPercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Максимальний сумарний % від чистого прибутку
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personal-percent">Особисте замовлення — Представник (%)</Label>
                <Input
                  id="personal-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={personalPercent}
                  onChange={(e) => setPersonalPercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Комісія представника, який привів замовлення
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager-percent">Перша лінія — Менеджер (%)</Label>
                <Input
                  id="manager-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={managerPercent}
                  onChange={(e) => setManagerPercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Комісія менеджера (батько представника)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="director-percent">Друга лінія — Директор (%)</Label>
                <Input
                  id="director-percent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={directorPercent}
                  onChange={(e) => setDirectorPercent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Комісія директора (батько менеджера)
                </p>
              </div>
            </div>

            {/* Validation warning */}
            {validationError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Info about combinations */}
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm mb-1">Як працюють комбінації:</p>
              <p>• Тільки представник → {personalPercent}%</p>
              <p>• Представник + менеджер → {personalPercent}% + {managerPercent}%</p>
              <p>• Представник + менеджер + директор → {personalPercent}% + {managerPercent}% + {directorPercent}%</p>
               <p>• Менеджер без представника → {personalPercent}% (особисте замовлення)</p>
               <p>• Тільки директор → {personalPercent}% (особисте замовлення)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-text">Текст запрошення</Label>
              <Textarea
                id="invite-text"
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                rows={4}
                placeholder="Текст, який побачить запрошений користувач"
              />
              <p className="text-xs text-muted-foreground">
                Цей текст відображається в запрошенні для нових представників
              </p>
            </div>

            <Button onClick={saveSettings} disabled={settingsLoading || !!validationError}>
              <Save className="h-4 w-4 mr-1" />
              Зберегти налаштування
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Services View ── */}
      {activeView === "services" && <AdminServicesManager />}
    </div>
  );
}

// ── Tree Node Component ──
function TreeNode({
  node,
  depth,
  onToggleBlock,
}: {
  node: RepNode;
  depth: number;
  onToggleBlock: (userId: string, isActive: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors ${
          !node.isActive ? "opacity-50" : ""
        }`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {node.children.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {node.avatarUrl ? (
          <img
            src={node.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {node.fullName.charAt(0)}
          </div>
        )}

        <span className="font-medium text-sm flex-1 min-w-0 truncate">{node.fullName}</span>

        <Badge className={`text-xs ${ROLE_COLORS[node.role] || ""}`} variant="secondary">
          {ROLE_LABELS[node.role] || node.role}
        </Badge>

        {!node.isActive && (
          <Badge variant="destructive" className="text-xs">
            Заблоковано
          </Badge>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          title={node.isActive ? "Заблокувати" : "Розблокувати"}
          onClick={() => onToggleBlock(node.userId, node.isActive)}
        >
          <UserX className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} onToggleBlock={onToggleBlock} />
        ))}
    </div>
  );
}
