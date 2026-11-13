import RewardsCalculator from './RewardsCalculator';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, BookOpen, Network, GraduationCap, CalendarDays, Plus, Trash2, Phone, ChevronLeft, ChevronRight, Maximize2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { presentationLink, newMeetingRoomUrl, isMeetingRoom } from '@/lib/presentation';
import { TeamLiveBanner } from './TeamLiveStage';
import { TeamStructure } from './TeamStructure';
import { TeamChat } from './TeamChat';
import { SlideViewer } from './SlideViewer';
import { resolveSlideUrl } from '@/lib/slideUrl';
import { SlideEditor } from './SlideEditor';
import { extractPptxSlideImages, toWebp } from '@/lib/pptxSlides';
import { MessageCircle, UserRound, Images } from 'lucide-react';
import { TeamAlbums } from './TeamAlbums';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { nameMatches } from '@/lib/nameSearch';
import { Users } from 'lucide-react';
import { BONUS_SCALE, bonusPercent, differentialBonus, groupPv, nextLevel, type PlanNode } from '@/lib/amwayPlan';

const sb = supabase as any;
const fmt = (n: number) => Math.round(n).toLocaleString('uk-UA');

/* ---------------- Маркетинг-план ---------------- */
interface SimNode extends PlanNode { name: string }
const PRESETS: { label: string; nodes: SimNode[] }[] = [
  { label: 'Перший старт 3%', nodes: [{ id: 'me', sponsor_id: null, personal_pv: 200, name: 'Я' }] },
  { label: 'Рівень 9%', nodes: [
    { id: 'me', sponsor_id: null, personal_pv: 200, name: 'Я' },
    { id: 'a', sponsor_id: 'me', personal_pv: 400, name: 'Партнер 1' },
    { id: 'b', sponsor_id: 'me', personal_pv: 300, name: 'Партнер 2' },
    { id: 'c', sponsor_id: 'me', personal_pv: 300, name: 'Партнер 3' },
  ] },
  { label: 'Рівень 15%', nodes: [
    { id: 'me', sponsor_id: null, personal_pv: 200, name: 'Я' },
    { id: 'a', sponsor_id: 'me', personal_pv: 300, name: 'Гілка 1' },
    { id: 'a1', sponsor_id: 'a', personal_pv: 700, name: 'Гілка 1.1' },
    { id: 'b', sponsor_id: 'me', personal_pv: 400, name: 'Гілка 2' },
    { id: 'b1', sponsor_id: 'b', personal_pv: 800, name: 'Гілка 2.1' },
    { id: 'c', sponsor_id: 'me', personal_pv: 600, name: 'Гілка 3' },
    { id: 'c1', sponsor_id: 'c', personal_pv: 1000, name: 'Гілка 3.1' },
  ] },
  { label: 'Рівень 21%', nodes: [
    { id: 'me', sponsor_id: null, personal_pv: 300, name: 'Я' },
    { id: 'a', sponsor_id: 'me', personal_pv: 3000, name: 'Гілка 1' },
    { id: 'b', sponsor_id: 'me', personal_pv: 3500, name: 'Гілка 2' },
    { id: 'c', sponsor_id: 'me', personal_pv: 3200, name: 'Гілка 3' },
  ] },
];

function MarketingPlan() {
  const [nodes, setNodes] = useState<SimNode[]>(PRESETS[1].nodes);
  const [rate, setRate] = useState(() => Number(localStorage.getItem('amway_rate') || 50));
  useEffect(() => { localStorage.setItem('amway_rate', String(rate)); }, [rate]);
  const total = groupPv(nodes, 'me');
  const pct = bonusPercent(total);
  const next = nextLevel(total);
  const bonus = differentialBonus(nodes, 'me');

  const add = (sponsor: string) => setNodes((n) => [...n, { id: crypto.randomUUID(), sponsor_id: sponsor, personal_pv: 100, name: `Партнер ${n.length}` }]);
  const remove = (id: string) => setNodes((n) => {
    const drop = new Set([id]);
    let grew = true;
    while (grew) { grew = false; n.forEach((x) => { if (x.sponsor_id && drop.has(x.sponsor_id) && !drop.has(x.id)) { drop.add(x.id); grew = true; } }); }
    return n.filter((x) => !drop.has(x.id));
  });
  const update = (id: string, patch: Partial<SimNode>) => setNodes((n) => n.map((x) => x.id === id ? { ...x, ...patch } : x));

  const renderNode = (node: SimNode, depth: number): JSX.Element => {
    const g = groupPv(nodes, node.id);
    return (
      <div key={node.id} className={depth ? 'ml-3 sm:ml-6 border-l border-border pl-2 sm:pl-3' : ''}>
        <div className="flex flex-wrap items-center gap-2 py-1.5">
          <Input className="h-11 w-32 sm:w-40" value={node.name} onChange={(e) => update(node.id, { name: e.target.value })} aria-label="Ім'я" />
          <Input className="h-11 w-24" type="number" min={0} value={node.personal_pv} onChange={(e) => update(node.id, { personal_pv: Math.max(0, Number(e.target.value)) })} aria-label="Особисті бали" />
          <Badge variant="secondary">{fmt(g)} PV · {bonusPercent(g)}%</Badge>
          <Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => add(node.id)} aria-label="Додати партнера"><Plus className="h-4 w-4" /></Button>
          {node.id !== 'me' && <Button size="icon" variant="ghost" className="h-11 w-11" onClick={() => remove(node.id)} aria-label="Видалити"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
        {nodes.filter((c) => c.sponsor_id === node.id).map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => <Button key={p.label} size="sm" variant="outline" onClick={() => setNodes(p.nodes.map((x) => ({ ...x })))}>{p.label}</Button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Групові бали</p><p className="text-2xl font-bold">{fmt(total)} PV</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Ваш рівень</p><p className="text-2xl font-bold text-primary">{pct}%</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Орієнтовний бонус</p><p className="text-2xl font-bold">{fmt(bonus * rate)} грн</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">До наступного рівня</p><p className="text-lg font-semibold">{next ? `${fmt(next.missing)} PV → ${next.pct}%` : 'Максимум 21%'}</p></Card>
      </div>
      <Card className="p-3 overflow-x-auto">
        <p className="text-sm font-medium mb-1">Структура (ім'я · особисті бали)</p>
        {nodes.filter((n) => n.id === 'me').map((n) => renderNode(n, 0))}
      </Card>
      <Card className="p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Курс: 1 бал ≈</span>
          <Input className="h-11 w-24" type="number" min={0} value={rate} onChange={(e) => setRate(Math.max(0, Number(e.target.value)))} />
          <span>грн бізнес-обсягу (BV)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...BONUS_SCALE].reverse().map((s) => <Badge key={s.pct} variant={pct === s.pct ? 'default' : 'outline'}>{fmt(s.pv)} PV — {s.pct}%</Badge>)}
        </div>
        <p className="text-xs text-muted-foreground">Розрахунок орієнтовний: бонус = ваш % × групові бали − % кожної гілки × її бали. Точні суми, програми Core Plus і курс бала дивіться в офіційному маркетинг-плані Amway.</p>
      </Card>
    </div>
  );
}

/* ---------------- Матеріали ---------------- */
const MAT_CATS = [
  { value: 'presentation', label: 'Презентації' },
  { value: 'product', label: 'Продукти' },
  { value: 'script', label: 'Скрипти' },
  { value: 'plan', label: 'Маркетинг-план' },
];
const BUILTIN = [
  { category: 'script', title: 'Запрошення на зустріч', body: 'Привіт! Я зараз розвиваю власну справу й шукаю цілеспрямованих людей. Не обіцяю, що це для тебе, але хочу показати — знайдеш 30 хвилин у четвер або суботу?' },
  { category: 'script', title: '«Це піраміда?»', body: 'Ні. У піраміді заробляють за реєстрацію людей. Тут дохід нараховується лише з товарообігу реальних продуктів, і партнер може заробляти більше за свого спонсора.' },
  { category: 'script', title: '«У мене немає часу»', body: 'Саме тому я тобі й пропоную: бізнес будується у вільний час, 6–10 годин на тиждень. Давай покажу, як це роблять зайняті люди.' },
  { category: 'script', title: '«Я не вмію продавати»', body: 'І не треба. Ми ділимося продуктами, якими користуємося самі, і навчаємо інших робити так само. Спонсор допомагає на кожній зустрічі.' },
  { category: 'product', title: 'Nutrilite', body: 'Вітаміни та харчові добавки з рослин, вирощених на власних органічних фермах.' },
  { category: 'product', title: 'eSpring', body: 'Система очищення води для дому.' },
  { category: 'product', title: 'iCook', body: 'Посуд для приготування їжі без олії зі збереженням вітамінів.' },
  { category: 'product', title: 'Artistry', body: 'Догляд за шкірою та декоративна косметика.' },
  { category: 'product', title: 'Amway Home', body: 'Концентровані засоби для прибирання та прання.' },
  { category: 'product', title: 'Glister', body: 'Догляд за ротовою порожниною.' },
];
const PITCH = [
  { t: 'Навіщо нам додатковий дохід?', b: 'Зарплати вистачає «до наступної». Власна справа дає вибір і час.' },
  { t: 'Що таке Amway', b: 'Компанія з 1959 року, присутня у понад 100 країнах, власні виробництва та ферми.' },
  { t: 'Як формується дохід', b: 'Ви користуєтеся продуктами та ділитеся ними. Бали всієї команди формують ваш відсоток від 3% до 21%.' },
  { t: 'Приклад', b: 'Ви + 3 партнери по 300 балів = 1200 PV = рівень 9%.' },
  { t: 'Наша підтримка', b: 'Спонсор, школа новачка, щотижневі зустрічі та готові матеріали в цьому кабінеті.' },
  { t: 'Наступний крок', b: 'Реєстрація, перше замовлення та зустріч зі спонсором протягом 72 годин.' },
];

function Pitch() {
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const slide = (
    <div className={`flex flex-col justify-center items-center text-center gap-4 p-6 ${full ? 'fixed inset-0 z-50 bg-background' : 'min-h-[260px]'}`}>
      <p className="text-xs text-muted-foreground">{i + 1} / {PITCH.length}</p>
      <h3 className="text-2xl md:text-4xl font-bold">{PITCH[i].t}</h3>
      <p className="text-base md:text-xl text-muted-foreground max-w-2xl">{PITCH[i].b}</p>
      <div className="flex gap-2">
        <Button variant="outline" className="h-11" disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" className="h-11" disabled={i === PITCH.length - 1} onClick={() => setI(i + 1)}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" className="h-11" onClick={() => setFull(!full)}><Maximize2 className="h-4 w-4 mr-1" />{full ? 'Закрити' : 'На весь екран'}</Button>
      </div>
    </div>
  );
  return <Card>{slide}</Card>;
}

function Materials({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const uploadDeck = async (files: FileList | null) => {
    if (!files?.length || !user?.id) return;
    if (!form.title.trim()) return toast.error('Спочатку вкажіть назву презентації');
    try {
      let blobs: Blob[] = [];
      const list = [...files];
      if (list.some((f) => /\.pptx$/i.test(f.name))) {
        setBusy('Читаю слайди…');
        blobs = await extractPptxSlideImages(list.find((f) => /\.pptx$/i.test(f.name))!);
      } else blobs = list.filter((f) => f.type.startsWith('image/')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (!blobs.length) return toast.error('У файлі не знайдено слайдів-картинок');
      if (blobs.length > 80) return toast.error('Максимум 80 слайдів');
      const stamp = Date.now(); const urls: string[] = [];
      for (let k = 0; k < blobs.length; k++) {
        setBusy(`Завантажую слайд ${k + 1} з ${blobs.length}…`);
        const webp = await toWebp(blobs[k]);
        const path = `${user.id}/team-slides/${orgId}/${stamp}/${String(k + 1).padStart(2, '0')}.webp`;
        const { error } = await supabase.storage.from('posts').upload(path, webp, { contentType: 'image/webp' });
        if (error) throw error;
        urls.push(supabase.storage.from('posts').getPublicUrl(path).data.publicUrl);
      }
      const { error } = await sb.from('team_materials').insert({ organization_id: orgId, category: 'presentation', title: form.title.trim(), body: form.body.slice(0, 10000) || null, slides: urls });
      if (error) throw error;
      toast.success(`Презентацію додано: ${urls.length} слайдів`);
      setForm({ title: '', body: '', url: '' }); load();
    } catch (e: any) { toast.error(e?.message?.includes('PowerPoint') ? e.message : 'Не вдалося завантажити презентацію'); }
    finally { setBusy(''); }
  };
  const [cat, setCat] = useState('presentation');
  const [form, setForm] = useState({ title: '', body: '', url: '' });
  const load = useCallback(async () => {
    const { data } = await sb.from('team_materials').select('*').eq('organization_id', orgId).order('sort_order').order('created_at');
    setItems(data || []);
  }, [orgId]);
  useEffect(() => { load(); }, [load]);
  const save = async () => {
    if (!form.title.trim()) return toast.error('Вкажіть назву');
    if (form.url && !/^https?:\/\//i.test(form.url)) return toast.error('Посилання має починатися з http(s)://');
    const { error } = await sb.from('team_materials').insert({ organization_id: orgId, category: cat, title: form.title.trim(), body: form.body.slice(0, 10000) || null, url: form.url || null });
    if (error) return toast.error('Не вдалося зберегти');
    setForm({ title: '', body: '', url: '' }); load();
  };
  const list = [...BUILTIN.filter((b) => b.category === cat), ...items.filter((x) => x.category === cat)];
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {MAT_CATS.map((c) => <Button key={c.value} size="sm" variant={cat === c.value ? 'default' : 'outline'} onClick={() => setCat(c.value)}>{c.label}</Button>)}
      </div>
      {cat === 'presentation' && <Pitch />}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((m: any, idx) => (
          <Card key={m.id || idx} className={`p-4 space-y-1 ${openId === m.id || editId === m.id ? 'sm:col-span-2' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{m.title}</p>
              {m.id && canEdit && <Button size="icon" variant="ghost" className="h-9 w-9" onClick={async () => { await sb.from('team_materials').delete().eq('id', m.id); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
            </div>
            {m.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.body}</p>}
            {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Відкрити</a>}
            {m.slides?.length > 0 && canEdit && editId !== m.id && <Button size="sm" variant="outline" onClick={() => { setEditId(m.id); setOpenId(null); }}>Змінити слайди</Button>}
            {editId === m.id ? <SlideEditor material={m} orgId={orgId} onDone={() => { setEditId(null); load(); }} /> : m.slides?.length > 0 && (openId === m.id
              ? <><SlideViewer slides={m.slides} title={m.title} /><Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Згорнути</Button></>
              : <button className="block w-full text-left" onClick={() => setOpenId(m.id)}>
                  <img src={resolveSlideUrl(m.slides[0])} alt={m.title} loading="lazy" className="w-full rounded-md aspect-video object-cover" />
                  <span className="text-sm text-primary">▶ Переглянути презентацію · {m.slides.length} слайдів</span>
                </button>)}
          </Card>
        ))}
      </div>
      {canEdit && (
        <Card className="p-4 space-y-2">
          <p className="font-medium text-sm">Додати матеріал у «{MAT_CATS.find((c) => c.value === cat)?.label}»</p>
          <Input placeholder="Назва" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea placeholder="Текст (необов'язково)" value={form.body} maxLength={10000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <Input placeholder="Посилання на файл чи відео (необов'язково)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={!!busy}><Plus className="h-4 w-4 mr-1" />Додати</Button>
            {cat === 'presentation' && (
              <label className={`inline-flex h-10 items-center rounded-md border border-input px-3 text-sm cursor-pointer hover:bg-muted ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                <input type="file" className="hidden" multiple accept=".pptx,image/*" onChange={(e) => { uploadDeck(e.target.files); e.target.value = ''; }} />
                {busy || 'Завантажити презентацію (.pptx або картинки)'}
              </label>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Структура команди ---------------- */
const coupleName = (r: any) => (r.co_full_name ? `${r.full_name} та ${r.co_full_name}` : r.full_name);
const isMine = (r: any, uid?: string) => !!uid && (r.user_id === uid || r.co_user_id === uid);
function subtreeOf(rows: any[], rootId: string): any[] {
  const out: any[] = []; const stack = [rootId]; const seen = new Set<string>();
  while (stack.length) {
    const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id);
    const r = rows.find((x) => x.id === id); if (r) out.push(r);
    rows.filter((x) => x.sponsor_id === id).forEach((c) => stack.push(c.id));
  }
  return out;
}

function EditPartnerDialog({ row, rows, canEdit, onClose, onDone }: { row: any | null; rows: any[]; canEdit: boolean; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState<any>({});
  useEffect(() => { if (row) setF({ full_name: row.full_name || '', phone: row.phone || '', co_full_name: row.co_full_name || '', co_phone: row.co_phone || '', personal_pv: Number(row.personal_pv) || 0, sponsor_id: row.sponsor_id || '' }); }, [row]);
  const banned = useMemo(() => new Set(row ? subtreeOf(rows, row.id).map((x) => x.id) : []), [row, rows]);
  const own = row && isMine(row, user?.id);
  const lockSponsor = !canEdit && own;
  const options = rows.filter((r) => !banned.has(r.id));
  const save = async () => {
    if (!f.full_name?.trim()) return toast.error("Вкажіть ім'я");
    const { error } = await sb.from('team_partners').update({
      full_name: f.full_name.trim(), phone: f.phone || null, co_full_name: f.co_full_name.trim() || null, co_phone: f.co_phone || null,
      personal_pv: Math.max(0, Number(f.personal_pv) || 0), sponsor_id: f.sponsor_id || null,
    }).eq('id', row.id);
    if (error) return toast.error(error.message || 'Не вдалося зберегти');
    toast.success(f.sponsor_id !== (row.sponsor_id || '') ? 'Партнера разом з гілкою перенесено' : 'Зміни збережено'); onDone();
  };
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Редагування · {row && coupleName(row)}</DialogTitle></DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Ім'я та прізвище" maxLength={150} value={f.full_name || ''} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <Input placeholder="Телефон" maxLength={30} value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Input placeholder="Чоловік/дружина" maxLength={150} value={f.co_full_name || ''} onChange={(e) => setF({ ...f, co_full_name: e.target.value })} />
          <Input placeholder="Телефон пари" maxLength={30} value={f.co_phone || ''} onChange={(e) => setF({ ...f, co_phone: e.target.value })} />
          <Input type="number" placeholder="Особисті бали" value={f.personal_pv ?? 0} onChange={(e) => setF({ ...f, personal_pv: e.target.value })} />
          <select disabled={lockSponsor} className="h-10 rounded-md border border-input bg-card px-2 text-sm" value={f.sponsor_id || ''} onChange={(e) => setF({ ...f, sponsor_id: e.target.value })}>
            {(canEdit || !row?.sponsor_id) && <option value="">Без спонсора (верх)</option>}
            {options.map((r) => <option key={r.id} value={r.id}>Спонсор: {coupleName(r)}</option>)}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">{lockSponsor ? 'Свого спонсора може змінити лише керівник команди.' : 'Зміна спонсора переносить партнера разом з усією його структурою.'}</p>
        <Button onClick={save}>Зберегти</Button>
      </DialogContent>
    </Dialog>
  );
}

function BindDialog({ target, onClose, onDone }: { target: { id: string; co: boolean; name: string } | null; onClose: () => void; onDone: () => void }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { if (target) supabase.rpc('get_safe_public_profiles').then(({ data }) => setProfiles((data as any[]) || [])); }, [target]);
  const res = q.trim().length < 2 ? [] : profiles.filter((p) => nameMatches(q, p.full_name)).slice(0, 8);
  const bind = async (uid: string) => {
    const { error } = await sb.rpc('bind_team_partner', { _partner_id: target!.id, _user_id: uid, _as_co: target!.co });
    if (error) return toast.error(error.message || 'Не вдалося прикріпити акаунт');
    toast.success('Акаунт прикріплено — кабінет відкрито'); setQ(''); onDone();
  };
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{target?.co ? 'Прикріпити акаунт чоловіка/дружини' : 'Прикріпити акаунт'} · {target?.name}</DialogTitle></DialogHeader>
        <Input autoFocus placeholder="Ім'я користувача соцмережі" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {res.map((p) => (
            <button key={p.id} onClick={() => bind(p.id)} className="flex w-full min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-muted text-left">
              <img src={p.avatar_url || '/placeholder.svg'} alt="" className="h-9 w-9 rounded-full object-cover" />
              <span className="font-medium">{p.full_name}</span>
            </button>
          ))}
          {q.trim().length >= 2 && res.length === 0 && <p className="text-sm text-muted-foreground py-2">Нікого не знайдено. Людина ще не зареєструвалась — місце чекатиме на неї.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamTree({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const empty = { full_name: '', phone: '', personal_pv: 0, sponsor_id: '', co_full_name: '', co_phone: '' };
  const [form, setForm] = useState(empty);
  const [bindT, setBindT] = useState<{ id: string; co: boolean; name: string } | null>(null);
  const [editT, setEditT] = useState<any | null>(null);
  const load = useCallback(async () => {
    const { data } = await sb.from('team_partners').select('*').eq('organization_id', orgId).order('created_at');
    setRows(data || []);
  }, [orgId]);
  useEffect(() => { load(); }, [load]);
  const me = rows.find((r) => isMine(r, user?.id));
  const visible = useMemo(() => {
    if (canEdit && scope === 'all') return rows;
    return me ? subtreeOf(rows, me.id) : [];
  }, [rows, canEdit, scope, me]);
  const canAdd = canEdit || !!me;

  const add = async () => {
    if (!form.full_name.trim()) return toast.error("Вкажіть ім'я");
    const sponsor = form.sponsor_id || (!canEdit ? me?.id : '') || null;
    const { error } = await sb.from('team_partners').insert({
      organization_id: orgId, full_name: form.full_name.trim(), phone: form.phone || null, personal_pv: form.personal_pv, sponsor_id: sponsor,
      co_full_name: form.co_full_name.trim() || null, co_phone: form.co_phone || null,
    });
    if (error) return toast.error('Не вдалося додати партнера');
    toast.success('Місце в структурі створено'); setForm(empty); load();
  };
  const setPv = async (id: string, pv: number) => { const { error } = await sb.from('team_partners').update({ personal_pv: pv }).eq('id', id); if (error) toast.error('Немає прав змінювати ці бали'); load(); };
  const nodes = visible as (PlanNode & any)[];
  const hints = useMemo(() => visible.map((r) => ({ r, n: nextLevel(groupPv(nodes, r.id)) })).filter((x) => x.n && x.n.missing <= 150), [visible]);
  const display = useMemo(() => visible.map((r) => ({ ...r, full_name: coupleName(r) })), [visible]);

  if (!canEdit && !me) return <Card className="p-6 text-center text-sm text-muted-foreground">Вашого місця ще немає в дереві команди. Попросіть свого спонсора або лідера створити місце та прикріпити ваш акаунт.</Card>;

  return (
    <div className="space-y-3">
      {canEdit && me && (
        <div className="flex gap-1">
          <Button size="sm" variant={scope === 'all' ? 'default' : 'outline'} onClick={() => setScope('all')}>Уся команда</Button>
          <Button size="sm" variant={scope === 'mine' ? 'default' : 'outline'} onClick={() => setScope('mine')}>Моя гілка</Button>
        </div>
      )}
      {hints.length > 0 && (
        <Card className="p-4 space-y-1 border-primary">
          <p className="font-semibold text-sm">Пульс закриття місяця</p>
          {hints.map(({ r, n }) => <p key={r.id} className="text-sm">{coupleName(r)}: не вистачає <b>{n!.missing} PV</b> до рівня {n!.pct}% — зателефонуйте.</p>)}
        </Card>
      )}
      <Card className="p-3">
        <TeamStructure rows={display} canEdit={canEdit} onSetPv={setPv} onDelete={async (id) => { if (confirm('Видалити партнера?')) { await sb.from('team_partners').delete().eq('id', id); load(); } }} />
      </Card>

      {canAdd && visible.length > 0 && (
        <Card className="p-3 space-y-1">
          <p className="font-semibold text-sm px-1">Керування місцями та акаунтами</p>
          {visible.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/40">
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{coupleName(r)}{isMine(r, user?.id) && <Badge className="ml-2" variant="secondary">Це ви</Badge>}</p>
                <p className="text-xs text-muted-foreground">
                  {r.user_id ? 'Акаунт прикріплено' : 'Очікує реєстрації'}{r.co_full_name ? ` · пара: ${r.co_user_id ? 'прикріплено' : 'очікує'}` : ''}
                </p>
              </div>
              <Button size="sm" variant="outline" className="min-h-10" onClick={() => setForm({ ...empty, sponsor_id: r.id })}><Plus className="h-4 w-4 mr-1" />Під цього</Button>
              <Button size="sm" variant="outline" className="min-h-10" onClick={() => setEditT(r)}><Pencil className="h-4 w-4 mr-1" />Редагувати</Button>
              {!r.user_id && <Button size="sm" className="min-h-10" onClick={() => setBindT({ id: r.id, co: false, name: r.full_name })}><Link2 className="h-4 w-4 mr-1" />Прикріпити акаунт</Button>}
              {!r.co_user_id && (r.user_id || r.co_full_name) && <Button size="sm" variant="outline" className="min-h-10" onClick={() => setBindT({ id: r.id, co: true, name: r.co_full_name || r.full_name })}><Users className="h-4 w-4 mr-1" />{r.co_full_name ? 'Акаунт пари' : 'Додати пару'}</Button>}
            </div>
          ))}
        </Card>
      )}

      {canAdd && (
        <Card className="p-4 space-y-2">
          <p className="font-semibold text-sm">Нове місце в структурі {form.sponsor_id && <>під «{coupleName(rows.find((r) => r.id === form.sponsor_id) || {})}»</>}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Ім'я та прізвище" value={form.full_name} maxLength={150} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input placeholder="Телефон" value={form.phone} maxLength={30} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input type="number" placeholder="Особисті бали" value={form.personal_pv || ''} onChange={(e) => setForm({ ...form, personal_pv: Math.max(0, Number(e.target.value)) })} />
            <Input placeholder="Чоловік/дружина (необов'язково)" value={form.co_full_name} maxLength={150} onChange={(e) => setForm({ ...form, co_full_name: e.target.value })} />
            <Input placeholder="Телефон пари" value={form.co_phone} maxLength={30} onChange={(e) => setForm({ ...form, co_phone: e.target.value })} />
            <select className="h-10 rounded-md border border-input bg-card px-2 text-sm" value={form.sponsor_id} onChange={(e) => setForm({ ...form, sponsor_id: e.target.value })}>
              {canEdit ? <option value="">Без спонсора (верх)</option> : <option value="">Спонсор: я</option>}
              {visible.map((r) => <option key={r.id} value={r.id}>Спонсор: {coupleName(r)}</option>)}
            </select>
          </div>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Створити місце</Button>
          <p className="text-xs text-muted-foreground">Якщо людина ще не має акаунта — місце чекатиме, а після реєстрації натисніть «Прикріпити акаунт».</p>
        </Card>
      )}
      <EditPartnerDialog row={editT} rows={rows} canEdit={canEdit} onClose={() => setEditT(null)} onDone={() => { setEditT(null); load(); }} />
      <BindDialog target={bindT} onClose={() => setBindT(null)} onDone={() => { setBindT(null); load(); }} />
    </div>
  );
}

/* ---------------- Школа новачка ---------------- */
const STEPS = [
  { key: 'register', t: 'Реєстрація та вхід в особистий кабінет' },
  { key: 'first_order', t: 'Перше особисте замовлення продуктів' },
  { key: 'goals', t: 'Записати свою мету: навіщо мені бізнес' },
  { key: 'list100', t: 'Скласти список 100 знайомих' },
  { key: 'calls5', t: 'Зробити перші 5 дзвінків разом зі спонсором' },
  { key: 'meeting', t: 'Призначити першу домашню чи онлайн-презентацію' },
  { key: 'plan', t: 'Розібрати маркетинг-план у симуляторі' },
  { key: 'event', t: 'Відвідати командну зустріч' },
];
function School({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [done, setDone] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await sb.from('team_onboarding').select('step_key').eq('organization_id', orgId).eq('user_id', user.id);
    setDone(new Set((data || []).map((x: any) => x.step_key)));
  }, [orgId, user?.id]);
  useEffect(() => { load(); }, [load]);
  const toggle = async (key: string) => {
    const on = done.has(key);
    const { error } = on
      ? await sb.from('team_onboarding').delete().eq('organization_id', orgId).eq('user_id', user!.id).eq('step_key', key)
      : await sb.from('team_onboarding').insert({ organization_id: orgId, user_id: user!.id, step_key: key });
    if (error) return toast.error('Не вдалося зберегти. Можливо, ви ще не учасник команди.');
    load();
  };
  const pct = Math.round((done.size / STEPS.length) * 100);
  return (
    <Card className="p-4 space-y-3">
      <div>
        <p className="font-semibold">Перші 72 години — {pct}%</p>
        <div className="h-2 rounded-full bg-muted mt-2"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
      </div>
      {STEPS.map((s, i) => (
        <label key={s.key} className="flex items-center gap-3 min-h-11 cursor-pointer">
          <Checkbox checked={done.has(s.key)} onCheckedChange={() => toggle(s.key)} />
          <span className={done.has(s.key) ? 'line-through text-muted-foreground' : ''}>{i + 1}. {s.t}</span>
        </label>
      ))}
    </Card>
  );
}

/* ---------------- Події ---------------- */
const EVENT_KINDS: Record<string, string> = { meeting: 'Бізнес-зустріч', seminar: 'Семінар', zoom: 'Онлайн-зустріч', client: 'День клієнта' };
function Events({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [decks, setDecks] = useState<any[]>([]);
  useEffect(() => { sb.from('team_materials').select('id,title,slides').eq('organization_id', orgId).neq('slides', '{}').then(({ data }: any) => setDecks(data || [])); }, [orgId]);
  const empty = { title: '', kind: 'zoom', starts_at: '', location: '', link: '', description: '', is_public: true, duration_minutes: 90, format: 'stream', material_id: '' };
  const [form, setForm] = useState(empty);
  const load = useCallback(async () => {
    const since = new Date(Date.now() - 86400000).toISOString();
    const [{ data }, l] = await Promise.all([
      sb.from('team_events').select('*').eq('organization_id', orgId).gte('starts_at', since).order('starts_at').limit(50),
      sb.from('team_presentation_leads').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(100),
    ]);
    setRows(data || []); setLeads(l.data || []);
  }, [orgId]);
  useEffect(() => { load(); }, [load]);
  const add = async () => {
    if (!form.title.trim() || !form.starts_at) return toast.error('Вкажіть назву та дату');
    const link = form.format === 'room' ? (form.link || newMeetingRoomUrl()) : form.link;
    if (form.format === 'stream' && form.link && !/^https?:\/\//i.test(form.link)) return toast.error('Посилання має починатися з http(s)://');
    const { error } = await sb.from('team_events').insert({ organization_id: orgId, title: form.title.trim(), kind: form.kind, starts_at: new Date(form.starts_at).toISOString(), location: form.location || null, link: link || null, description: form.description.trim() || null, is_public: form.is_public, duration_minutes: Math.min(600, Math.max(15, Number(form.duration_minutes) || 90)), created_by: user?.id ?? null, material_id: form.material_id || null });
    if (error) return toast.error('Не вдалося додати подію');
    setForm(empty); load();
  };
  const copyLink = async (id: string) => {
    const url = presentationLink(window.location.origin, id, user?.id);
    try { await navigator.clipboard.writeText(url); toast.success('Ваше особисте посилання скопійовано'); }
    catch { window.prompt('Скопіюйте посилання', url); }
  };
  const titleOf = (id: string) => rows.find((r) => r.id === id)?.title || 'Презентація';
  return (
    <div className="space-y-3">
      {rows.length === 0 ? <Card className="p-6 text-center text-sm text-muted-foreground">Найближчих подій немає</Card> : rows.map((e) => (
        <Card key={e.id} className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{e.title}</p>
            <p className="text-sm text-muted-foreground">{new Date(e.starts_at).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })}{e.location ? ` · ${e.location}` : ''}</p>
          </div>
          <Badge variant="outline">{EVENT_KINDS[e.kind] || e.kind}</Badge>
          {isMeetingRoom(e.link) && <Badge variant="secondary">Відеокімната</Badge>}
          {e.is_public && <Badge>Для гостей</Badge>}
          {e.is_public && <Button size="sm" variant="secondary" className="h-10" onClick={() => copyLink(e.id)}><Link2 className="h-4 w-4 mr-1" />Запросити друзів</Button>}
          {e.link && <Button asChild size="sm" className="h-10"><a href={e.link} target="_blank" rel="noreferrer">Приєднатися</a></Button>}
          {canEdit && <Button size="icon" variant="ghost" onClick={async () => { if (!confirm('Видалити подію?')) return; await sb.from('team_events').delete().eq('id', e.id); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </Card>
      ))}
      {canEdit && (
        <Card className="p-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Input placeholder="Назва події" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {Object.entries(EVENT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          <Input placeholder="Місце" value={form.location} maxLength={200} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value, link: '' })}>
            <option value="stream">Трансляція зі сцени (YouTube / Vimeo)</option>
            <option value="room">Відеокімната команди (усі з камерами)</option>
          </select>
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })}>
            <option value="">Без слайдів</option>
            {decks.map((d) => <option key={d.id} value={d.id}>Слайди: {d.title}</option>)}
          </select>
          {form.format === 'stream'
            ? <Input placeholder="Посилання на трансляцію (YouTube Live, Vimeo, Zoom)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            : <p className="text-sm text-muted-foreground self-center">Кімнату буде створено автоматично</p>}
          <Input type="number" min={15} max={600} placeholder="Тривалість, хв" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
          <Textarea className="sm:col-span-2 lg:col-span-3" placeholder="Опис для гостей" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 min-h-11 text-sm sm:col-span-2"><Checkbox checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: !!v })} />Гостьова презентація — доступна за посиланням до кінця наступного дня</label>
          <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Додати подію</Button>
        </Card>
      )}
      <Card className="p-4 space-y-2">
        <p className="font-medium">Заявки гостей ({leads.length})</p>
        {leads.length === 0 ? <p className="text-sm text-muted-foreground">Поки немає заявок. Натисніть «Запросити друзів» і надішліть посилання.</p> : leads.map((l) => (
          <div key={l.id} className="border-b last:border-0 py-2 text-sm">
            <p className="font-medium">{l.name}{l.phone && <> · <a className="text-primary" href={`tel:${l.phone}`}>{l.phone}</a></>}</p>
            <p className="text-muted-foreground">{titleOf(l.event_id)} · {new Date(l.created_at).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}</p>
            {l.message && <p className="whitespace-pre-wrap">{l.message}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------------- Мій кабінет ---------------- */
function MyCabinet({ orgId, isLeader }: { orgId: string; isLeader: boolean }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [steps, setSteps] = useState(0);
  useEffect(() => {
    (async () => {
      const [{ data }, o] = await Promise.all([
        sb.from('team_partners').select('*').eq('organization_id', orgId),
        user?.id ? sb.from('team_onboarding').select('step_key').eq('organization_id', orgId).eq('user_id', user.id) : Promise.resolve({ data: [] }),
      ]);
      setRows(data || []); setSteps((o.data || []).length);
    })();
  }, [orgId, user?.id]);
  const me = rows.find((r) => r.user_id === user?.id || r.co_user_id === user?.id);
  const sponsor = me?.sponsor_id ? rows.find((r) => r.id === me.sponsor_id) : null;
  const g = me ? groupPv(rows, me.id) : 0;
  const pct = bonusPercent(g); const nx = nextLevel(g);
  const firstLine = me ? rows.filter((r) => r.sponsor_id === me.id) : [];
  const newbie = !isLeader && pct < 9;
  const school = Math.round((steps / STEPS.length) * 100);
  const pulse = isLeader ? rows.map((r) => ({ r, n: nextLevel(groupPv(rows, r.id)) })).filter((x) => x.n && x.n.missing <= 150).slice(0, 8) : [];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card className="p-4 space-y-1">
        <p className="text-xs text-muted-foreground">{isLeader ? 'Кабінет лідера' : newbie ? 'Кабінет новачка' : 'Кабінет партнера'}</p>
        {me ? <>
          <p className="text-2xl font-bold">{pct}%</p>
          <p className="text-sm">Особисті бали: <b>{fmt(me.personal_pv)}</b> · Групові: <b>{fmt(g)}</b></p>
          {nx ? <p className="text-sm">До рівня {nx.pct}% бракує <b>{fmt(nx.missing)} PV</b></p> : <p className="text-sm">Максимальний рівень шкали досягнуто 🎉</p>}
          <p className="text-sm">Перша лінія: <b>{firstLine.length}</b></p>
        </> : <p className="text-sm text-muted-foreground">Вашого профілю ще немає в структурі. Попросіть лідера прив'язати вас.</p>}
      </Card>
      {sponsor && (
        <Card className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Мій спонсор</p>
          <p className="font-semibold">{sponsor.co_full_name ? `${sponsor.full_name} та ${sponsor.co_full_name}` : sponsor.full_name}</p>
          {sponsor.phone && <div className="flex gap-2 flex-wrap">
            <Button asChild size="sm"><a href={`tel:${sponsor.phone}`}><Phone className="h-4 w-4 mr-1" />Подзвонити</a></Button>
            <Button asChild size="sm" variant="outline"><a href={`viber://chat?number=${encodeURIComponent(sponsor.phone.replace(/[^\d+]/g, ''))}`}>Viber</a></Button>
          </div>}
        </Card>
      )}
      {!isLeader && (
        <Card className="p-4 space-y-2">
          <p className="font-semibold text-sm">Школа новачка — {school}%</p>
          <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${school}%` }} /></div>
          <p className="text-xs text-muted-foreground">Пройдіть усі кроки у вкладці «Школа новачка».</p>
        </Card>
      )}
      {isLeader && (
        <Card className="p-4 space-y-1">
          <p className="font-semibold text-sm">Команда: {rows.length} партнерів · активних {rows.filter((r) => Number(r.personal_pv) >= 100).length}</p>
          {pulse.length ? pulse.map(({ r, n }) => <p key={r.id} className="text-sm">{r.full_name}: бракує <b>{n!.missing} PV</b> до {n!.pct}%</p>)
            : <p className="text-sm text-muted-foreground">Ніхто не близький до нового рівня.</p>}
        </Card>
      )}
    </div>
  );
}

export function TeamBusinessPanel({ orgId, canEdit }: { orgId: string; canEdit: boolean }) {
  return (
    <>
    <TeamLiveBanner orgId={orgId} />
    <Tabs defaultValue="me">
      <TabsList className="flex-wrap h-auto mb-3 gap-1 rounded-2xl border bg-card p-1.5 shadow-card [&>button]:rounded-xl [&>button]:px-3 [&>button]:py-2 [&>button[data-state=active]]:bg-secondary [&>button[data-state=active]]:text-secondary-foreground">
        <TabsTrigger value="me"><UserRound className="h-4 w-4 mr-1" />Мій кабінет</TabsTrigger>
        <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-1" />Чат команди</TabsTrigger>
        <TabsTrigger value="plan"><Calculator className="h-4 w-4 mr-1" />Маркетинг-план</TabsTrigger>
        <TabsTrigger value="materials"><BookOpen className="h-4 w-4 mr-1" />Матеріали</TabsTrigger>
        <TabsTrigger value="tree"><Network className="h-4 w-4 mr-1" />Структура</TabsTrigger>
        <TabsTrigger value="school"><GraduationCap className="h-4 w-4 mr-1" />Школа новачка</TabsTrigger>
        <TabsTrigger value="events"><CalendarDays className="h-4 w-4 mr-1" />Події</TabsTrigger>
        <TabsTrigger value="life"><Images className="h-4 w-4 mr-1" />Життя команди</TabsTrigger>
      </TabsList>
      <TabsContent value="life"><TeamAlbums orgId={orgId} /></TabsContent>
      <TabsContent value="me"><MyCabinet orgId={orgId} isLeader={canEdit} /></TabsContent>
      <TabsContent value="chat"><TeamChat orgId={orgId} canEdit={canEdit} /></TabsContent>
      <TabsContent value="plan"><RewardsCalculator /></TabsContent>
      <TabsContent value="materials"><Materials orgId={orgId} canEdit={canEdit} /></TabsContent>
      <TabsContent value="tree"><TeamTree orgId={orgId} canEdit={canEdit} /></TabsContent>
      <TabsContent value="school"><School orgId={orgId} /></TabsContent>
      <TabsContent value="events"><Events orgId={orgId} canEdit={canEdit} /></TabsContent>
    </Tabs>
    </>
  );
}
