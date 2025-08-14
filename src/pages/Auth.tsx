
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { useSupabaseAuth } from '@/hooks/auth/useSupabaseAuth';
import { Button } from "@/components/ui/button";

import { AuthStepManager } from '@/components/auth/AuthStepManager';

enum AuthStep {
  LOGIN_REGISTER,
  RESET_PASSWORD,
  VERIFY_CODE,
  SET_NEW_PASSWORD
}

export default function Auth() {
  const { language } = useLanguage();
  const t = translations[language];
  
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>(AuthStep.LOGIN_REGISTER);
  const [resetPhoneNumber, setResetPhoneNumber] = useState("");
  const { isAuthenticated } = useSupabaseAuth();
  
  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/");
    }
  }, [navigate, isAuthenticated]);
  
  const handleCodeVerified = (phoneNumber: string) => {
    setResetPhoneNumber(phoneNumber);
    setAuthStep(AuthStep.VERIFY_CODE);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero секція */}
      <div className="relative bg-gradient-to-r from-purple-500/20 to-blue-500/20 flex-1 flex items-center justify-center">
        <div className="container py-12 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Ліва частина - привітальний текст */}
            <div className="text-center lg:text-left space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Вітаємо у Спільноті B&C
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                Соціальна платформа для фотографів, відеографів, музикантів, 
                ведучих заходів та піротехніків. Знаходьте нових клієнтів, 
                публікуйте своє портфоліо та розвивайте власний бренд.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" onClick={() => navigate("/search")}>
                  Пошук
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
                resetPhoneNumber={resetPhoneNumber}
                onCodeVerified={handleCodeVerified}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
