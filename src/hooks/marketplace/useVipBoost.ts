import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

/**
 * Перемикає VIP-бустинг оголошення. Сервер (RLS) перевіряє власника,
 * а клієнт додатково має блокувати UI для не-VIP користувачів.
 */
export function useToggleVipBoost() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, boost }: { id: string; boost: boolean }) => {
      if (!user?.id) throw new Error('Не авторизовано');
      const { error } = await (supabase as any)
        .from('marketplace_listings')
        .update({ is_vip_boost: boost })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['marketplace_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_my_listings'] });
      qc.invalidateQueries({ queryKey: ['marketplace_listing'] });
      toast.success(vars.boost ? 'VIP-бустинг увімкнено' : 'VIP-бустинг вимкнено');
    },
    onError: (e: any) => toast.error(e.message || 'Помилка'),
  });
}
