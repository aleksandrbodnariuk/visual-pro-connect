
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
      <div className="relative container py-8 sm:py-12 md:py-24 lg:py-32 3xl:py-40 px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4 md:space-y-6">
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl 3xl:text-7xl font-bold tracking-tighter">
              Вітаємо у Спільноті B&C
            </h1>
            <p className="mx-auto max-w-[90%] sm:max-w-[700px] 3xl:max-w-[900px] text-sm sm:text-base md:text-lg lg:text-xl 3xl:text-2xl text-muted-foreground">
              Соціальна платформа для фотографів, відеографів, музикантів, 
              ведучих заходів та піротехніків. Знаходьте нових клієнтів, 
              публікуйте своє портфоліо та розвивайте власний бренд.
            </p>
          </div>
          <div className="flex flex-col xs:flex-row gap-3 xs:gap-4">
            <Button size="lg" className="text-sm sm:text-base 3xl:text-lg 3xl:px-8 3xl:py-6" onClick={handleLoginClick}>
              {t.login}
            </Button>
            <Button size="lg" variant="outline" className="text-sm sm:text-base 3xl:text-lg 3xl:px-8 3xl:py-6" onClick={() => navigate("/search")}>
              {t.search}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
