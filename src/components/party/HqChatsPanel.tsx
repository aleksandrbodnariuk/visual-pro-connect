import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessagesSquare, Network, Users } from 'lucide-react';
import { goToConversation, partyExtra } from '@/hooks/orgs/useOrganizations';

export function HqChatsPanel({ orgId, hqId, hqName }: { orgId: string; hqId: string | null; hqName?: string }) {
  const navigate = useNavigate();
  const open = async (kind: 'internal' | 'network' | 'general') => {
    const id = await partyExtra.openChat(orgId, kind === 'general' ? null : hqId, kind);
    if (id) goToConversation(navigate, id);
  };
  const items = [
    ...(hqId ? [
      { kind: 'internal' as const, icon: Users, title: 'Внутрішній чат штабу', desc: `Команда та керівники «${hqName}»` },
      { kind: 'network' as const, icon: Network, title: 'Чат з підлеглими штабами', desc: 'Цей штаб + керівники підпорядкованих штабів' },
    ] : []),
    { kind: 'general' as const, icon: MessagesSquare, title: 'Загальнопартійний чат', desc: 'Усі, хто має доступ до партії' },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.map((it) => (
          <Card key={it.kind} className="p-4 flex flex-col gap-2">
            <it.icon className="h-6 w-6 text-primary" />
            <p className="font-medium">{it.title}</p>
            <p className="text-xs text-muted-foreground flex-1">{it.desc}</p>
            <Button size="sm" onClick={() => open(it.kind)}>Відкрити чат</Button>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Учасники додаються автоматично при відкритті: люди з команди, прив’язані до профілю на сайті, та керівники штабів. Чати відкриваються в розділі «Повідомлення».</p>
    </div>
  );
}
