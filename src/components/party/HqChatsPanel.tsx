import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, MessagesSquare, Network, Users } from 'lucide-react';
import { partyExtra } from '@/hooks/orgs/useOrganizations';
import { cn } from '@/lib/utils';
import { EmbeddedConversation } from './EmbeddedConversation';

type Kind = 'internal' | 'network' | 'general';

export function HqChatsPanel({ orgId, hqId, hqName }: { orgId: string; hqId: string | null; hqName?: string }) {
  const [active, setActive] = useState<{ kind: Kind; convId: string; title: string } | null>(null);
  const [opening, setOpening] = useState<Kind | null>(null);

  const items = [
    ...(hqId ? [
      { kind: 'internal' as const, icon: Users, title: 'Внутрішній чат штабу', desc: `Команда та керівники «${hqName}»` },
      { kind: 'network' as const, icon: Network, title: 'Чат з підлеглими штабами', desc: 'Цей штаб + керівники підпорядкованих штабів' },
    ] : []),
    { kind: 'general' as const, icon: MessagesSquare, title: 'Загальнопартійний чат', desc: 'Усі, хто має доступ до партії' },
  ];

  const open = async (it: (typeof items)[number]) => {
    setOpening(it.kind);
    const id = await partyExtra.openChat(orgId, it.kind === 'general' ? null : hqId, it.kind);
    setOpening(null);
    if (id) setActive({ kind: it.kind, convId: id, title: it.title });
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] h-[70vh] min-h-[420px]">
        <div className={cn('border-r overflow-y-auto', active ? 'hidden md:block' : 'block')}>
          {items.map((it) => (
            <button
              key={it.kind}
              onClick={() => open(it)}
              className={cn('w-full text-left flex gap-3 p-3 min-h-[60px] border-b hover:bg-muted/60 transition-colors', active?.kind === it.kind && 'bg-muted')}
            >
              {opening === it.kind ? <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" /> : <it.icon className="h-5 w-5 text-primary shrink-0" />}
              <span className="min-w-0">
                <span className="block font-medium">{it.title}</span>
                <span className="block text-xs text-muted-foreground">{it.desc}</span>
              </span>
            </button>
          ))}
          <p className="p-3 text-xs text-muted-foreground">Учасники додаються автоматично при відкритті: люди з команди, прив’язані до профілю, та керівники штабів.</p>
        </div>
        <div className={cn('min-h-0', active ? 'flex flex-col' : 'hidden md:flex md:flex-col')}>
          {active ? (
            <EmbeddedConversation conversationId={active.convId} title={active.title} onBack={() => setActive(null)} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">Оберіть чат ліворуч, щоб почати спілкування</div>
          )}
        </div>
      </div>
    </Card>
  );
}
