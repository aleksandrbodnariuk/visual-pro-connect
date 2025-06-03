
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { useAuthState } from '@/hooks/auth/useAuthState';
import { Hero } from '@/components/home/Hero';

import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import VerifyCodeForm from '@/components/auth/VerifyCodeForm';
import SetNewPasswordForm from '@/components/auth/SetNewPasswordForm';
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
  const { checkAuthStatus } = useAuthState();
  
  useEffect(() => {
    // Перевіряємо, чи користувач увійшов в систему
    const isLoggedIn = checkAuthStatus();
    if (isLoggedIn) {
      navigate("/");
    }
  }, [navigate, checkAuthStatus]);
  
  const handleCodeVerified = (phoneNumber: string) => {
    setResetPhoneNumber(phoneNumber);
    setAuthStep(AuthStep.VERIFY_CODE);
  };
  
  return (
    <div className="min-h-screen">
      {/* Hero секція для неавторизованих користувачів */}
      <Hero />
      
      {/* Форми авторизації */}
      <div className="container py-8">
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
  );
}
