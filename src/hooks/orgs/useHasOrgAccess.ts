import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const cache = new Map<string, boolean>();

/** Чи бачить користувач хоча б одну організацію (для показу пункту меню). */
export function useHasOrgAccess() {
  const { user } = useAuth();
  const [has, setHas] = useState<boolean>(() => (user?.id ? cache.get(user.id) ?? false : false));
  useEffect(() => {
    if (!user?.id) { setHas(false); return; }
    if (cache.has(user.id)) { setHas(cache.get(user.id)!); return; }
    (supabase as any).rpc('has_any_org_access').then(({ data }: any) => {
      cache.set(user.id, data === true);
      setHas(data === true);
    });
  }, [user?.id]);
  return has;
}
