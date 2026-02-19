
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVisitTracker() {
  useEffect(() => {
    const recordVisit = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.rpc('record_visit');
        console.log('Visit recorded');
      } catch (error) {
        console.warn('Failed to record visit:', error);
      }
    };

    recordVisit();
  }, []);
}
