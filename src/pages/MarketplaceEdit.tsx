import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, X, ArrowLeft, Crown, Video } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMarketplaceCategories } from '@/hooks/marketplace/useMarketplaceCategories';
import { useMarketplaceListing, useUpdateListing } from '@/hooks/marketplace/useMarketplaceListings';
import { CONDITION_LABELS, DEAL_TYPE_LABELS, type MarketplaceCondition, type MarketplaceCurrency, type MarketplaceDealType } from '@/hooks/marketplace/types';
import { uploadToStorage } from '@/lib/storage';
import { toast } from 'sonner';
import { compressImageAsFile, OUTPUT_FORMAT } from '@/lib/imageCompression';
import { useUserVip } from '@/hooks/vip/useUserVip';

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE_MB = 5;
const HEIC_TYPES = ['image/heic', 'image/heif'];

interface ImageItem {
  url: string;          // вже збережений URL або data: для нових
  file?: File;          // якщо новий, завантажимо при сабміті
}

export default function MarketplaceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: categories = [] } = useMarketplaceCategories();
  const { data: listing, isLoading } = useMarketplaceListing(id);
  const updateListing = useUpdateListing();
  const { vip } = useUserVip(user?.id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dealType, setDealType] = useState<MarketplaceDealType>('sale');
  const [condition, setCondition] = useState<MarketplaceCondition>('new');
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] = useState<MarketplaceCurrency>('UAH');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [city, setCity] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [items, setItems] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const hasActiveVip = Boolean(vip);

  useEffect(() => { document.title = 'Редагування оголошення — Маркетплейс'; }, []);

  useEffect(() => {
    if (!isAuthenticated) navigate('/auth');
  }, [isAuthenticated, navigate]);

  // Префіл форми при першому отриманні listing
  useEffect(() => {
    if (!listing || hydrated) return;
    setTitle(listing.title || '');
    setDescription(listing.description || '');
    setCategoryId(listing.category_id || '');
    setDealType((listing.deal_type as MarketplaceDealType) || 'sale');
    setCondition((listing.condition as MarketplaceCondition) || 'new');
    setPrice(listing.price ? String(listing.price) : '');
    setCurrency((listing.currency as MarketplaceCurrency) || 'UAH');
    setIsNegotiable(Boolean(listing.is_negotiable));
    setCity(listing.city || '');
    setContactPhone(listing.contact_phone || '');
    setVideoUrl(listing.video_url || '');
    const imgs = (listing.images || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ url: i.image_url }));
    setItems(imgs);
    setHydrated(true);
  }, [listing, hydrated]);

  const isOwner = user?.id && listing?.user_id && user.id === listing.user_id;

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Не вдалося прочитати файл ${file.name}`));
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const room = MAX_IMAGES - items.length;
    const accepted = arr.slice(0, room).filter((f) => {
      const lower = f.name.toLowerCase();
      if (HEIC_TYPES.includes(f.type) || lower.endsWith('.heic') || lower.endsWith('.heif')) {
        toast.error(`${f.name}: формат HEIC не підтримується. Конвертуйте у JPEG/PNG.`);
        return false;
      }
      if (f.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name}: більше ${MAX_IMAGE_SIZE_MB}МБ`);
        return false;
      }
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name}: підтримуються лише зображення`);
        return false;
      }
      return true;
    });
    if (accepted.length === 0) return;

    const prepared = await Promise.all(accepted.map(async (file) => {
      try {
        const preview = await readFileAsDataUrl(file);
        return { file, preview };
      } catch {
        return null;
      }
    }));
    const successful = prepared.filter((x): x is { file: File; preview: string } => Boolean(x?.preview));
    setItems((prev) => [...prev, ...successful.map((s) => ({ url: s.preview, file: s.file }))]);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const moveCover = (i: number) => {
    setItems((prev) => {
      if (i <= 0 || i >= prev.length) return prev;
      const copy = [...prev];
      const [picked] = copy.splice(i, 1);
      copy.unshift(picked);
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!user?.id || !listing) return;
    if (!isOwner) { toast.error('Немає прав на редагування'); return; }
    if (!title.trim()) { toast.error('Введіть назву'); return; }
    if (!categoryId) { toast.error('Оберіть категорію'); return; }

    setUploading(true);
    try {
      // Завантажуємо нові файли
      const finalUrls: string[] = [];
      const newFiles = items.filter((it) => it.file);
      const toastId = newFiles.length > 0 ? toast.loading(`Обробка фото 0/${newFiles.length}...`) : undefined;
      let processed = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.file) {
          finalUrls.push(it.url);
          continue;
        }
        if (toastId) toast.loading(`Стискання фото ${processed + 1}/${newFiles.length}...`, { id: toastId });
        let fileToUpload: File = it.file;
        let contentType = it.file.type;
        try {
          fileToUpload = await compressImageAsFile(it.file, 'post');
          contentType = fileToUpload.type || OUTPUT_FORMAT;
        } catch (err) {
          console.warn('[Marketplace] Помилка стиснення, використовую оригінал:', err);
        }
        const ext = contentType === OUTPUT_FORMAT
          ? 'webp'
          : (it.file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        if (toastId) toast.loading(`Завантаження фото ${processed + 1}/${newFiles.length}...`, { id: toastId });
        const url = await uploadToStorage('marketplace', path, fileToUpload, contentType);
        finalUrls.push(url);
        processed += 1;
      }
      if (toastId) toast.dismiss(toastId);

      await updateListing.mutateAsync({
        id: listing.id,
        listing: {
          title: title.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          deal_type: dealType,
          condition,
          price: price ? Number(price) : 0,
          currency,
          is_negotiable: isNegotiable,
          city: city.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_method: contactPhone.trim() ? 'both' : 'chat',
          video_url: hasActiveVip && videoUrl.trim() ? videoUrl.trim() : null,
        },
        imageUrls: finalUrls,
      });
      navigate(`/market/${listing.id}`);
    } catch (e: any) {
      toast.error(e.message || 'Помилка');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-3 md:px-4 py-6">
          <div className="h-96 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-3 md:px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Оголошення не знайдено</h1>
          <Button variant="outline" onClick={() => navigate('/market')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> До маркетплейсу
          </Button>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-3 md:px-4 py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Немає доступу</h1>
          <p className="text-muted-foreground mb-4">Ви можете редагувати лише власні оголошення.</p>
          <Button variant="outline" onClick={() => navigate(`/market/${listing.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> До оголошення
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 py-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/market/${listing.id}`)} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> До оголошення
        </Button>

        <Card className="p-4 md:p-6 space-y-4">
          <h1 className="text-2xl font-bold">Редагування оголошення</h1>

          <div className="space-y-2">
            <Label>Назва *</Label>
            <Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Опис</Label>
            <Textarea rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Категорія *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Оберіть категорію" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тип угоди</Label>
              <Select value={dealType} onValueChange={(v) => setDealType(v as MarketplaceDealType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Стан</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as MarketplaceCondition)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Місто</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Київ" />
            </div>
            <div className="space-y-2">
              <Label>Ціна</Label>
              <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = договірна" />
            </div>
            <div className="space-y-2">
              <Label>Валюта</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as MarketplaceCurrency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UAH">₴ UAH</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium text-sm">Можливий торг</div>
              <div className="text-xs text-muted-foreground">Покупці зможуть пропонувати свою ціну</div>
            </div>
            <Switch checked={isNegotiable} onCheckedChange={setIsNegotiable} />
          </div>

          <div className="space-y-2">
            <Label>Контактний телефон (опціонально)</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+380..." />
          </div>

          {hasActiveVip && (
            <div className="space-y-2 rounded-md border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-3">
              <Label className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Відео-посилання
                <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-semibold">VIP</span>
              </Label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube, Instagram, TikTok, Facebook…"
                  type="url"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Залиште поле порожнім, щоб видалити відео з оголошення.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Фото (до {MAX_IMAGES})</Label>
            <p className="text-xs text-muted-foreground">Натисніть на фото, щоб зробити його обкладинкою. Перше фото = обкладинка.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((it, i) => (
                <div key={`${it.url}-${i}`} className="relative aspect-square rounded-md overflow-hidden border group bg-muted">
                  <button
                    type="button"
                    onClick={() => moveCover(i)}
                    className="absolute inset-0 w-full h-full"
                    title={i === 0 ? 'Обкладинка' : 'Зробити обкладинкою'}
                  >
                    <img src={it.url} alt={`Фото ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                  <button
                    onClick={() => removeItem(i)}
                    type="button"
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-0.5 z-10 pointer-events-none">
                      Обкладинка
                    </div>
                  )}
                </div>
              ))}
              {items.length < MAX_IMAGES && (
                <label className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Додати</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate(`/market/${listing.id}`)} disabled={uploading}>Скасувати</Button>
            <Button onClick={handleSubmit} disabled={uploading || updateListing.isPending} className="flex-1">
              {uploading ? 'Збереження...' : 'Зберегти зміни'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}