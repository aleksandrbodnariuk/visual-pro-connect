import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getPortfolioIconComponent,
  type PortfolioCategoryDef,
} from "@/lib/portfolioCategories";

export interface PortfolioCategoryRow {
  id: string;
  label: string;
  icon: string;
  sort_order: number;
  is_visible: boolean;
  is_system: boolean;
}

/**
 * Loads portfolio categories from the database.
 * - Default: only visible categories (for end users).
 * - includeHidden: returns all (for admin management).
 */
export function usePortfolioCategories(includeHidden = false) {
  const [rows, setRows] = useState<PortfolioCategoryRow[]>([]);
  const [categories, setCategories] = useState<PortfolioCategoryDef[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("portfolio_categories" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (!includeHidden) query = query.eq("is_visible", true);

      const { data, error } = await query;
      if (error) throw error;
      const list = (data || []) as unknown as PortfolioCategoryRow[];
      setRows(list);
      setCategories(
        list.map((r) => ({
          key: r.id,
          label: r.label,
          icon: getPortfolioIconComponent(r.icon),
        })),
      );
    } catch (err) {
      console.error("Error loading portfolio categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, [includeHidden]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, rows, isLoading, refetch: fetchCategories };
}