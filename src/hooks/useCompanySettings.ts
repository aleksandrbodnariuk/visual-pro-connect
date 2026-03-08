import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanySettings {
  id: string;
  totalShares: number;
  sharePriceUsd: number;
  updatedAt: string;
}

const DEFAULT_SETTINGS: Omit<CompanySettings, 'id' | 'updatedAt'> = {
  totalShares: 1000,
  sharePriceUsd: 10,
};

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching company settings:', error);
        // Fallback to defaults
        setSettings({
          id: '',
          ...DEFAULT_SETTINGS,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          totalShares: data.total_shares,
          sharePriceUsd: data.share_price_usd,
          updatedAt: data.updated_at,
        });
      } else {
        setSettings({
          id: '',
          ...DEFAULT_SETTINGS,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error in useCompanySettings:', err);
      setSettings({
        id: '',
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateTotalShares = useCallback(async (newTotal: number) => {
    if (!settings?.id) {
      toast.error('Налаштування не завантажені');
      return false;
    }

    const { error } = await supabase
      .from('company_settings')
      .update({ 
        total_shares: newTotal, 
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getSession()).data.session?.user?.id || null 
      })
      .eq('id', settings.id);

    if (error) {
      console.error('Error updating total shares:', error);
      toast.error('Не вдалося оновити загальну кількість акцій');
      return false;
    }

    setSettings(prev => prev ? { ...prev, totalShares: newTotal } : prev);
    return true;
  }, [settings?.id]);

  const updateSharePrice = useCallback(async (newPrice: number) => {
    if (!settings?.id) {
      toast.error('Налаштування не завантажені');
      return false;
    }

    const { error } = await supabase
      .from('company_settings')
      .update({ 
        share_price_usd: newPrice, 
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getSession()).data.session?.user?.id || null 
      })
      .eq('id', settings.id);

    if (error) {
      console.error('Error updating share price:', error);
      toast.error('Не вдалося оновити ціну акції');
      return false;
    }

    setSettings(prev => prev ? { ...prev, sharePriceUsd: newPrice } : prev);
    return true;
  }, [settings?.id]);

  return {
    settings,
    loading,
    totalShares: settings?.totalShares ?? DEFAULT_SETTINGS.totalShares,
    sharePriceUsd: settings?.sharePriceUsd ?? DEFAULT_SETTINGS.sharePriceUsd,
    updateTotalShares,
    updateSharePrice,
    refetch: fetchSettings,
  };
}
