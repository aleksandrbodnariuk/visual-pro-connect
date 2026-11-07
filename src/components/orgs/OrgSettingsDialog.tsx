import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Settings, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { orgActions, type Organization } from '@/hooks/orgs/useOrganizations';
import { PartySymbols } from '@/components/party/PartySymbols';

/** Налаштування організації: оформлення, опис і (лише адміністратор сайту) видалення. */
export function OrgSettingsDialog({ org, isSiteAdmin, onChanged }: { org: Organization; isSiteAdmin: boolean; onChanged: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(org.name);
  const [description, setDescription] = useState(org.description || '');
  const [website, setWebsite] = useState(org.website || '');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) { setName(org.name); setDescription(org.description || ''); setWebsite(org.website || ''); }
  }, [open, org]);

  const save = async () => {
    const n = name.trim();
    if (!n) { toast.error('Назва не може бути порожньою'); return; }
    const w = website.trim();
    if (w && !/^https?:\/\//i.test(w)) { toast.error('Посилання має починатися з http:// або https://'); return; }
    setSaving(true);
    if (await orgActions.update(org.id, { name: n.slice(0, 200), description: description.trim().slice(0, 5000) || null, website: w || null })) {
      toast.success('Налаштування збережено');
      onChanged();
    }
    setSaving(false);
  };

  const remove = async () => {
    if (confirmText.trim() !== org.name.trim()) return;
    setDeleting(true);
    if (await orgActions.remove(org.id)) { setConfirmOpen(false); setOpen(false); navigate('/organizations'); }
    setDeleting(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" className="min-h-[44px]" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4 mr-1" /> Налаштування
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Налаштування організації</DialogTitle>
            <DialogDescription>Оформлення, назва та опис організації</DialogDescription>
          </DialogHeader>

          <section className="space-y-3">
            <h3 className="font-semibold">Основне</h3>
            <div className="space-y-1"><Label htmlFor="org-name">Назва</Label><Input id="org-name" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="org-desc">Опис</Label><Textarea id="org-desc" rows={4} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="org-web">Вебсайт</Label><Input id="org-web" value={website} placeholder="https://" onChange={(e) => setWebsite(e.target.value)} /></div>
            <Button className="min-h-[44px]" disabled={saving} onClick={save}>{saving ? 'Збереження…' : 'Зберегти'}</Button>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">Логотип і обкладинка</h3>
            <p className="text-xs text-muted-foreground">{org.type === 'party' ? 'Прапор (обкладинка)' : 'Фон'} показується у шапці; позицію можна змінити кнопкою на самій обкладинці.</p>
            <PartySymbols org={org} canEdit onChanged={onChanged} />
          </section>

          {isSiteAdmin && (
            <section className="rounded-lg border border-destructive/50 p-4 space-y-2">
              <h3 className="font-semibold text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Небезпечна зона</h3>
              <p className="text-sm text-muted-foreground">Видалення організації безповоротно стирає всі її дані: учасників, матеріали, події, альбоми та структуру.</p>
              <Button variant="destructive" className="min-h-[44px]" onClick={() => { setConfirmText(''); setConfirmOpen(true); }}>
                <Trash2 className="h-4 w-4 mr-1" /> Видалити організацію
              </Button>
            </section>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити «{org.name}»?</AlertDialogTitle>
            <AlertDialogDescription>Цю дію неможливо скасувати. Щоб підтвердити, введіть назву організації.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={org.name} aria-label="Назва для підтвердження" />
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || confirmText.trim() !== org.name.trim()}
              onClick={(e) => { e.preventDefault(); remove(); }}
            >{deleting ? 'Видалення…' : 'Видалити назавжди'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
