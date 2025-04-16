
import { useState } from "react";
import { Camera, Music, Video, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGAttributes<SVGElement>>;
  color: string;
}

const categories: Category[] = [
  {
    id: "photo",
    name: "Фотографи",
    icon: Camera,
    color: "bg-gradient-blue"
  },
  {
    id: "video",
    name: "Відеографи",
    icon: Video,
    color: "bg-gradient-purple"
  },
  {
    id: "music",
    name: "Музиканти",
    icon: Music,
    color: "bg-gradient-orange"
  },
  {
    id: "event",
    name: "Ведучі",
    icon: Users,
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: "pyro",
    name: "Піротехніки",
    icon: Sparkles,
    color: "from-red-500 to-rose-500"
  },
];

export function SearchCategories() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="my-6">
      <h2 className="mb-4 text-xl font-semibold">Категорії професіоналів</h2>
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`/search?category=${category.id}`}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-white transition-all cursor-pointer",
              `bg-gradient-to-r ${category.color}`,
              selectedCategory === category.id 
                ? "ring-2 ring-white ring-offset-2 ring-offset-background" 
                : "opacity-90 hover:opacity-100"
            )}
            onClick={(e) => {
              e.preventDefault();
              setSelectedCategory(
                selectedCategory === category.id ? null : category.id
              );
              window.location.href = `/search?category=${category.id}`;
            }}
          >
            <category.icon className="h-4 w-4" />
            <span>{category.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
