
import { useState, useEffect } from "react";
import { Camera, Music, Video, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  {
    id: "photographer",
    name: "Фотографи",
    icon: Camera,
    color: "bg-gradient-blue from-blue-500 to-cyan-500"
  },
  {
    id: "videographer",
    name: "Відеографи",
    icon: Video,
    color: "bg-gradient-purple from-purple-500 to-violet-500"
  },
  {
    id: "musician",
    name: "Музиканти",
    icon: Music,
    color: "bg-gradient-orange from-orange-500 to-amber-500"
  },
  {
    id: "host",
    name: "Ведучі",
    icon: Users,
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: "pyrotechnician",
    name: "Піротехніки",
    icon: Sparkles,
    color: "from-red-500 to-rose-500"
  },
];

export function SearchCategories() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get("category") || "";
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        // Try to get counts from Supabase
        const { data, error } = await (supabase as any)
          .rpc('get_public_profiles');
          
        if (error) throw error;
        
        const categoryCounts: Record<string, number> = {};
        
        // Initialize all categories with 0
        CATEGORIES.forEach(cat => {
          categoryCounts[cat.id] = 0;
        });
        
        // Count users in each category
        if (data) {
          data.forEach(user => {
            if (user.categories && Array.isArray(user.categories)) {
              user.categories.forEach(category => {
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
        
        // Fallback: provide dummy counts
        setCounts({
          photographer: 12,
          videographer: 8,
          musician: 6,
          host: 4,
          pyrotechnician: 2
        });
      }
    };
    
    fetchCategoryCounts();
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    searchParams.set("category", categoryId);
    navigate(`/search?${searchParams.toString()}`);
  };

  return (
    <div className="my-6">
      <h2 className="mb-4 text-xl font-semibold">Категорії професіоналів</h2>
      <div className="flex flex-wrap gap-3">
        {CATEGORIES.map((category) => (
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
            <category.icon className="h-4 w-4" />
            <span>{category.name}</span>
            {counts[category.id] > 0 && (
              <span className="ml-1 rounded-full bg-white bg-opacity-20 px-1.5 py-0.5 text-xs">
                {counts[category.id]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
