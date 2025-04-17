
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

export interface SharePriceControlProps {
  className?: string;
}

export function SharePriceControl({ className }: SharePriceControlProps) {
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const { language } = useLanguage();
  
  useEffect(() => {
    // Завантажуємо поточну ціну з localStorage
    const price = localStorage.getItem('sharePrice') || '1000';
    setCurrentPrice(price);
    setNewPrice(price);
  }, []);
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) { // Перевіряємо, що введено лише цифри
      setNewPrice(value);
    }
  };
  
  const saveNewPrice = () => {
    if (!newPrice || parseInt(newPrice) <= 0) {
      toast.error('Будь ласка, введіть дійсну ціну акції');
      return;
    }
    
    // Зберігаємо нову ціну в localStorage
    localStorage.setItem('sharePrice', newPrice);
    setCurrentPrice(newPrice);
    
    // Оновлюємо ціни на всі акції
    const shares = JSON.parse(localStorage.getItem('shares') || '[]');
    const updatedShares = shares.map((share: any) => {
      if (!share.soldTo) { // Якщо акція не продана
        return { ...share, price: parseInt(newPrice) };
      }
      return share;
    });
    
    localStorage.setItem('shares', JSON.stringify(updatedShares));
    
    toast.success(`Ціну акції успішно змінено на ${newPrice} грн`);
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Управління ціною акцій</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Поточна ціна акції:</p>
            <div className="text-xl font-bold">{currentPrice} грн</div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="new-price" className="text-sm font-medium">
              Нова ціна акції (грн)
            </label>
            <div className="flex gap-2">
              <Input
                id="new-price"
                type="text"
                value={newPrice}
                onChange={handlePriceChange}
                placeholder="Введіть нову ціну"
              />
              <Button onClick={saveNewPrice}>Зберегти</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
