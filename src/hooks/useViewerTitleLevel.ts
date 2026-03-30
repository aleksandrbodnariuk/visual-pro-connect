import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { getTitleByPercent } from '@/lib/shareholderRules';

/**
 * Повертає рівень титулу поточного користувача та чи є він адміністратором.
 * Використовується для визначення видимості титулів інших акціонерів.
 */
export function useViewerTitleLevel() {
  const { totalShares, loading: settingsLoading } = useCompanySettings();
  const [viewerLevel, setViewerLevel] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setViewerLevel(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const userId = session.user.id;

        // Check admin
        const { data: adminData } = await supabase.rpc('check_admin_access');
        setIsAdmin(!!adminData);

        // Check shareholder status & shares
        const { data: sharesData } = await supabase
          .from('shares')
          .select('quantity')
          .eq('user_id', userId)
          .maybeSingle();

        const shares = sharesData?.quantity ?? 0;
        if (shares > 0 && totalShares > 0) {
          const pct = (shares / totalShares) * 100;
          const title = getTitleByPercent(pct);
          setViewerLevel(title?.level ?? 0);
        } else {
          // Check if user is shareholder at all
          const { data: hasRole } = await supabase.rpc('has_role', {
            _user_id: userId,
            _role: 'shareholder' as any,
          });
          setViewerLevel(hasRole ? 0 : null);
        }
      } catch {
        setViewerLevel(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    if (!settingsLoading) load();
  }, [totalShares, settingsLoading]);

  return { viewerLevel, isAdmin, loading };
}
