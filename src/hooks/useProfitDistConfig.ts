import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type ShareholderDistConfig, DEFAULT_DIST_CONFIG } from '@/lib/shareholderCalculations';

/**
 * Завантажує налаштовувані відсотки розподілу прибутку з site_settings.
 * Повертає DEFAULT_DIST_CONFIG до завершення завантаження.
 */
export function useProfitDistConfig() {
  const [config, setConfig] = useState<ShareholderDistConfig>(DEFAULT_DIST_CONFIG);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('site_settings')
      .select('id, value')
      .in('id', [
        'profit-specialists-percent',
        'profit-shares-percent',
        'profit-title-bonus-percent',
        'profit-admin-fund-percent',
      ]);

    const cfg = { ...DEFAULT_DIST_CONFIG };
    (data || []).forEach((s: any) => {
      const v = parseFloat(s.value) / 100;
      if (!isNaN(v)) {
        if (s.id === 'profit-specialists-percent') cfg.specialistsPercent = v;
        if (s.id === 'profit-shares-percent') cfg.sharesPercent = v;
        if (s.id === 'profit-title-bonus-percent') cfg.titleBonusPercent = v;
        if (s.id === 'profit-admin-fund-percent') cfg.adminFundPercent = v;
      }
    });

    setConfig(cfg);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return { config, loading, reload: load };
}
