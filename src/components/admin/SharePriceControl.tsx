
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useCompanySettings } from '@/hooks/useCompanySettings';

export interface SharePriceControlProps {
  className?: string;
}

export function SharePriceControl({ className }: SharePriceControlProps) {
  const { sharePriceUsd, loading, updateSharePrice } = useCompanySettings();
  const [newPrice, setNewPrice] = useState<string>('');
  
  useEffect(() => {
    if (!loading) {
      setNewPrice(sharePriceUsd.toString());
    }
  }, [sharePriceUsd, loading]);
  
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setNewPrice(value);
    }
  };
  
  const saveNewPrice = async () => {
    const price = parseFloat(newPrice);
    if (!newPrice || isNaN(price) || price <= 0) {
      toast.error('Будь ласка, введіть дійсну ціну акції');
      return;
    }
    
    const success = await updateSharePrice(price);
    if (success) {
      toast.success(`Ціну акції успішно змінено на ${price} USD`);
    }
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
            <div className="text-xl font-bold">{sharePriceUsd} USD</div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="new-price" className="text-sm font-medium">
              Нова ціна акції (USD)
            </label>
            <div className="flex gap-2">
              <Input
                id="new-price"
                type="text"
                value={newPrice}
                onChange={handlePriceChange}
                placeholder="Введіть нову ціну"
                disabled={loading}
              />
              <Button onClick={saveNewPrice} disabled={loading}>Зберегти</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
