
import { Camera, Video, Music, Users, Sparkles, Search, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-16 pt-10 md:pt-0">
      {/* Фонові елементи (графічні декорації) */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />
      <div className="absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      
      <div className="container relative z-10 flex flex-col items-center justify-center gap-6 text-center md:min-h-[calc(100vh-16rem)] md:py-12">
        <div className="space-y-4 md:max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground md:text-6xl">
            Об'єднуємо творчих <span className="text-gradient-purple">професіоналів</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
            Знаходьте кращих фотографів, відеографів, музикантів, ведучих і піротехніків для ваших проектів та заходів.
          </p>
          
          {/* Пошукова форма */}
          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Кого ви шукаєте?" 
                className="h-12 rounded-full pl-10"
              />
            </div>
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Місто або регіон" 
                className="h-12 rounded-full pl-10"
              />
            </div>
            <Button className="h-12 rounded-full bg-gradient-purple px-8">
              <Search className="mr-2 h-5 w-5" />
              <span>Шукати</span>
            </Button>
          </div>
        </div>
        
        {/* Категорії професіоналів */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CategoryCard
            icon={Camera}
            title="Фотографи"
            count="1,428"
            color="from-blue-500 to-sky-400"
          />
          <CategoryCard
            icon={Video}
            title="Відеографи"
            count="982"
            color="from-purple-500 to-violet-400"
          />
          <CategoryCard
            icon={Music}
            title="Музиканти"
            count="2,154"
            color="from-orange-500 to-amber-400"
          />
          <CategoryCard
            icon={Users}
            title="Ведучі"
            count="748"
            color="from-indigo-500 to-purple-400"
          />
          <CategoryCard
            icon={Sparkles}
            title="Піротехніки"
            count="326"
            color="from-red-500 to-rose-400"
          />
        </div>
      </div>
    </section>
  );
}

interface CategoryCardProps {
  icon: React.ComponentType<React.SVGAttributes<SVGElement>>;
  title: string;
  count: string;
  color: string;
}

function CategoryCard({ icon: Icon, title, count, color }: CategoryCardProps) {
  return (
    <a 
      href="/search" 
      className={cn(
        "group flex items-center gap-3 rounded-xl p-3 transition-all hover:scale-105",
        "bg-gradient-to-r cursor-pointer",
        color
      )}
    >
      <div className="rounded-full bg-white/20 p-2">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-left text-white">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs">{count} професіоналів</p>
      </div>
      <ChevronRight className="ml-2 h-4 w-4 text-white/70 transition-transform group-hover:translate-x-1" />
    </a>
  );
}
