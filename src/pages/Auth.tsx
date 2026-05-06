
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { AuthStepManager, AuthStep } from '@/components/auth/AuthStepManager';
import { GuestSupportDialog } from '@/components/support/GuestSupportDialog';
import { MessageCircleQuestion } from 'lucide-react';

export default function Auth() {
  const { language } = useLanguage();
  const t = translations[language];
  
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>(AuthStep.LOGIN_REGISTER);
  const [supportOpen, setSupportOpen] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    // Чекаємо завантаження перед редиректом
    if (!loading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);
  
  // Показуємо loader поки визначається стан
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero секція */}
      <div className="relative bg-gradient-to-r from-purple-500/20 to-blue-500/20 flex-1 flex items-center justify-center">
        <div className="container py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Ліва частина - привітальний текст */}
            <div className="text-center lg:text-left space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                {t.welcomeTitle}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                {t.socialPlatformSubtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={() => navigate("/search")}>
                  {t.search}
                </Button>
                <Button size="lg" variant="outline" onClick={() => setSupportOpen(true)}>
                  <MessageCircleQuestion className="w-5 h-5 mr-2" />
                  {t.writeToSupport}
                </Button>
              </div>
            </div>
            
            {/* Права частина - форма авторизації */}
            <div className="w-full max-w-md mx-auto">
              <AuthStepManager 
                authStep={authStep}
                isLogin={isLogin}
                setIsLogin={setIsLogin}
                setAuthStep={setAuthStep}
              />
              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  className="text-sm text-muted-foreground"
                  onClick={() => setSupportOpen(true)}
                >
                  <MessageCircleQuestion className="w-4 h-4 mr-1" />
                  {t.cantLogin}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GuestSupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
