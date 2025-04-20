
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServicesSectionProps {
  isCurrentUser: boolean;
  categories?: string[];
}

export function ServicesSection({ isCurrentUser, categories }: ServicesSectionProps) {
  const getCategoryName = (categoryId: string) => {
    switch(categoryId) {
      case 'photographer': return 'Фотограф';
      case 'videographer': return 'Відеограф';
      case 'musician': return 'Музикант';
      case 'host': return 'Ведучий';
      case 'pyrotechnician': return 'Піротехнік';
      default: return categoryId;
    }
  };

  return (
    <div className="rounded-xl border p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Мої послуги</h2>
        {isCurrentUser && (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" /> Редагувати послуги
          </Button>
        )}
      </div>
      
      {categories && categories.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((category: string) => (
            <Badge key={category} variant="secondary" className="text-sm">
              {getCategoryName(category)}
            </Badge>
          ))}
        </div>
      ) : null}
      
      <div className="space-y-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Портретна фотосесія</h3>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 1500 грн</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Індивідуальна фотосесія в студії або на локації. До 2 годин зйомки, 30 оброблених фотографій.
          </p>
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Комерційна зйомка</h3>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 3000 грн</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Фотографії для соціальних мереж, каталогів та реклами. До 4 годин зйомки, 50 оброблених фотографій.
          </p>
        </div>
        
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Весільна фотографія</h3>
            <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-secondary">від 8000 грн</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Повний день зйомки весілля, від зборів до першого танцю. 300+ оброблених фотографій, фотокнига.
          </p>
        </div>
      </div>
    </div>
  );
}
