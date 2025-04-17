
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

interface HeroProps {
  onLogin?: () => void;
}

export function Hero({ onLogin }: HeroProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];
  
  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate("/auth");
    }
  };
  
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20" />
      <div className="relative container py-12 md:py-24 lg:py-32">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Вітаємо у Спільноті B&C
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              Соціальна платформа для фотографів, відеографів, музикантів, 
              ведучих заходів та піротехніків. Знаходьте нових клієнтів, 
              публікуйте своє портфоліо та розвивайте власний бренд.
            </p>
          </div>
          <div className="space-x-4">
            <Button size="lg" onClick={handleLoginClick}>
              {t.login}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/search")}>
              {t.search}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
