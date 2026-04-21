import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  parent_id: string | null;
  full_name: string;
  avatar_url: string;
  level: number;
}

interface TreeNode {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  children: TreeNode[];
  ordersCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  representative: 'Представник',
  manager: 'Менеджер',
  director: 'Директор',
};

const ROLE_COLORS: Record<string, string> = {
  representative: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  manager: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  director: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

interface TeamTreeProps {
  representativeId: string;
}

export function TeamTree({ representativeId }: TeamTreeProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadTeam = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_team_tree', {
        _representative_id: representativeId,
      });

      if (error) throw error;

      const members = (data as TeamMember[]) || [];
      setTotalCount(members.length);

      // Build tree: level 1 are roots, level 2 are children
      const level1 = members.filter((m) => m.level === 1);
      const level2 = members.filter((m) => m.level === 2);

      const childrenByParent = new Map<string, TeamMember[]>();
      for (const m of level2) {
        if (!m.parent_id) continue;
        const arr = childrenByParent.get(m.parent_id) || [];
        arr.push(m);
        childrenByParent.set(m.parent_id, arr);
      }

      // Count non-archived orders per representative.id for the whole team
      const repIds = members.map((m) => m.id);
      const ordersCountMap = new Map<string, number>();
      if (repIds.length > 0) {
        const { data: orderRows } = await supabase
          .from('specialist_orders')
          .select('representative_id')
          .in('representative_id', repIds)
          .neq('status', 'archived');
        (orderRows || []).forEach((row: any) => {
          if (!row.representative_id) return;
          ordersCountMap.set(
            row.representative_id,
            (ordersCountMap.get(row.representative_id) || 0) + 1,
          );
        });
      }

      const treeNodes: TreeNode[] = level1.map((m) => ({
        id: m.id,
        userId: m.user_id,
        fullName: m.full_name,
        avatarUrl: m.avatar_url,
        role: m.role,
        ordersCount: ordersCountMap.get(m.id) || 0,
        children: (childrenByParent.get(m.id) || []).map((child) => ({
          id: child.id,
          userId: child.user_id,
          fullName: child.full_name,
          avatarUrl: child.avatar_url,
          role: child.role,
          ordersCount: ordersCountMap.get(child.id) || 0,
          children: [],
        })),
      }));

      setTree(treeNodes);
    } catch (err) {
      console.error('Error loading team:', err);
    } finally {
      setLoading(false);
    }
  }, [representativeId]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Моя команда ({totalCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tree.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 break-words">
            У вас поки немає залучених представників. Натисніть «Залучити» щоб надіслати запрошення.
          </p>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TeamTreeNode key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
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
            className="h-7 w-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
            {(node.fullName || '?')[0]}
          </div>
        )}

        <span className="font-medium text-sm flex-1 min-w-0 truncate">
          {node.fullName}
        </span>

        {node.ordersCount > 0 && (
          <Badge
            className="text-xs shrink-0 gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-transparent"
            variant="secondary"
            title={`Зробив(ла) ${node.ordersCount} замовлень`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Активний · {node.ordersCount}
          </Badge>
        )}

        <Badge className={`text-xs shrink-0 ${ROLE_COLORS[node.role] || ''}`} variant="secondary">
          {ROLE_LABELS[node.role] || node.role}
        </Badge>
      </div>

      {expanded &&
        node.children.map((child) => (
          <TeamTreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
