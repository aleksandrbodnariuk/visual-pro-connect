import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMarketplaceCategories } from '@/hooks/marketplace/useMarketplaceCategories';
import { useCreateListing } from '@/hooks/marketplace/useMarketplaceListings';
import { CONDITION_LABELS, DEAL_TYPE_LABELS, type MarketplaceCondition, type MarketplaceCurrency, type MarketplaceDealType } from '@/hooks/marketplace/types';
import { uploadToStorage } from '@/lib/storage';
import { toast } from 'sonner';
import { VipBoostToggle } from '@/components/marketplace/VipBoostToggle';
import { compressImageAsFile, OUTPUT_FORMAT } from '@/lib/imageCompression';
import { useUserVip } from '@/hooks/vip/useUserVip';

const MAX_IMAGES = 8;
const MAX_IMAGE_SIZE_MB = 5;
const HEIC_TYPES = ['image/heic', 'image/heif'];

export default function MarketplaceNew() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data: categories = [] } = useMarketplaceCategories();
  const createListing = useCreateListing();
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
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [vipBoost, setVipBoost] = useState(false);

  const hasActiveVip = Boolean(vip);

  useEffect(() => { document.title = 'Подати оголошення — Маркетплейс'; }, []);

  useEffect(() => {
    if (!isAuthenticated) navigate('/auth');
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!hasActiveVip && vipBoost) {
      setVipBoost(false);
    }
  }, [hasActiveVip, vipBoost]);

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Не вдалося прочитати файл ${file.name}`));
    reader.readAsDataURL(file);
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const room = MAX_IMAGES - images.length;
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

    const nextPreviews = await Promise.all(
      accepted.map(async (file) => {
        try {
          return await readFileAsDataUrl(file);
        } catch (error) {
          console.error('[Marketplace] Помилка підготовки прев’ю:', error);
          return '';
        }
      })
    );

    setImages((prev) => [...prev, ...accepted]);
    setPreviews((prev) => [...prev, ...nextPreviews.filter(Boolean)]);
  };

  const removeImage = (i: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    if (!title.trim()) { toast.error('Введіть назву'); return; }
    if (!categoryId) { toast.error('Оберіть категорію'); return; }

    setUploading(true);
    try {
      const imageUrls: string[] = [];
      const toastId = images.length > 0 ? toast.loading(`Обробка фото 0/${images.length}...`) : undefined;
      for (let i = 0; i < images.length; i++) {
        const original = images[i];
        if (toastId) toast.loading(`Стискання фото ${i + 1}/${images.length}...`, { id: toastId });

        // Автоматичне стиснення + конвертація в WebP (GIF зберігається як є)
        let fileToUpload: File = original;
        let contentType = original.type;
        try {
          fileToUpload = await compressImageAsFile(original, 'post');
          contentType = fileToUpload.type || OUTPUT_FORMAT;
        } catch (err) {
          console.warn('[Marketplace] Помилка стиснення, використовую оригінал:', err);
        }

        const ext = contentType === OUTPUT_FORMAT
          ? 'webp'
          : (original.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        if (toastId) toast.loading(`Завантаження фото ${i + 1}/${images.length}...`, { id: toastId });
        try {
          const url = await uploadToStorage('marketplace', path, fileToUpload, contentType);
          imageUrls.push(url);
        } catch (err: any) {
          if (toastId) toast.dismiss(toastId);
          throw new Error(`Не вдалося завантажити фото ${i + 1}: ${err?.message || 'невідома помилка'}`);
        }
      }
      if (toastId) toast.dismiss(toastId);

      await createListing.mutateAsync({
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
          status: 'active',
          is_vip_boost: vipBoost,
        },
        imageUrls,
      });
      navigate('/market/moi');
    } catch (e: any) {
      toast.error(e.message || 'Помилка');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 py-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate('/market')} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> До маркетплейсу
        </Button>

        <Card className="p-4 md:p-6 space-y-4">
          <h1 className="text-2xl font-bold">Подати оголошення</h1>

          <div className="space-y-2">
            <Label>Назва *</Label>
            <Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Наприклад: Камера Sony A7 III" />
          </div>

          <div className="space-y-2">
            <Label>Опис</Label>
            <Textarea rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Розкажіть про товар або послугу..." />
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

          <VipBoostToggle value={vipBoost} onChange={setVipBoost} />

          <div className="space-y-2">
            <Label>Фото (до {MAX_IMAGES})</Label>
            <p className="text-xs text-muted-foreground">Після вибору фото одразу з’явиться мініатюра перед публікацією.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-square rounded-md overflow-hidden border group bg-muted">
                  <img
                    src={src}
                    alt={`Фото ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => console.error('[Marketplace] Помилка превью:', src, e)}
                  />
                  <button onClick={() => removeImage(i)} type="button" className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <X className="h-3 w-3" />
                  </button>
                  {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-xs text-center py-0.5 z-10">Обкладинка</div>}
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Додати</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate('/market')} disabled={uploading}>Скасувати</Button>
            <Button onClick={handleSubmit} disabled={uploading || createListing.isPending} className="flex-1">
              {uploading ? 'Завантаження...' : 'Опублікувати'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}