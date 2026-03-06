
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Music, Video, Users, Sparkles, UtensilsCrossed, Car, Cake, Flower2, Star, type LucideIcon } from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Camera,
  Music,
  Video,
  Users,
  Sparkles,
  UtensilsCrossed,
  Car,
  Cake,
  Flower2,
  Star,
};

export const getIconComponent = (iconName: string): LucideIcon => {
  return ICON_MAP[iconName] || Star;
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

export const AVAILABLE_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-violet-500',
  'from-orange-500 to-amber-500',
  'from-indigo-500 to-purple-500',
  'from-red-500 to-rose-500',
  'from-amber-500 to-yellow-500',
  'from-slate-500 to-gray-600',
  'from-pink-400 to-rose-400',
  'from-green-500 to-emerald-500',
  'from-teal-500 to-cyan-500',
  'from-yellow-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

export function useDynamicCategories() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, isLoading, refetch: fetchCategories };
}
