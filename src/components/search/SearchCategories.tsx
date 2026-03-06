
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDynamicCategories, getIconComponent } from "@/hooks/useDynamicCategories";

export function SearchCategories() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get("category") || "";
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { categories } = useDynamicCategories();

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const { data, error } = await supabase.rpc('get_specialists');
        if (error) throw error;
        
        const categoryCounts: Record<string, number> = {};
        categories.forEach(cat => { categoryCounts[cat.id] = 0; });
        
        if (data) {
          data.forEach((user: any) => {
            if (user.categories && Array.isArray(user.categories)) {
              user.categories.forEach((category: string) => {
                if (categoryCounts[category] !== undefined) {
                  categoryCounts[category]++;
                }
              });
            }
          });
        }
        setCounts(categoryCounts);
      } catch (error) {
        console.error("Error fetching category counts:", error);
      }
    };
    
    if (categories.length > 0) fetchCategoryCounts();
  }, [categories]);

  const handleCategoryClick = (categoryId: string) => {
    searchParams.set("category", categoryId);
    navigate(`/search?${searchParams.toString()}`);
  };

  return (
    <div className="my-6">
      <h2 className="mb-1 text-xl font-semibold">Знайти послугу</h2>
      <p className="mb-4 text-sm text-muted-foreground">Категорії</p>
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => {
          const Icon = getIconComponent(category.icon);
          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-white transition-all cursor-pointer",
                `bg-gradient-to-r ${category.color}`,
                currentCategory === category.id 
                  ? "ring-2 ring-white ring-offset-2 ring-offset-background" 
                  : "opacity-90 hover:opacity-100"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{category.name}</span>
              {counts[category.id] > 0 && (
                <span className="ml-1 rounded-full bg-white bg-opacity-20 px-1.5 py-0.5 text-xs">
                  {counts[category.id]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
