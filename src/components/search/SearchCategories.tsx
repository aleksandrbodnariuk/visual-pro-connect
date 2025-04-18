
import { useState } from "react";
import { Camera, Music, Video, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

export const CATEGORIES = [
  {
    id: "photographer",
    name: "Фотографи",
    icon: Camera,
    color: "bg-gradient-blue"
  },
  {
    id: "videographer",
    name: "Відеографи",
    icon: Video,
    color: "bg-gradient-purple"
  },
  {
    id: "musician",
    name: "Музиканти",
    icon: Music,
    color: "bg-gradient-orange"
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
          </button>
        ))}
      </div>
    </div>
  );
}
