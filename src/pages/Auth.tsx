
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { useAuthState } from '@/hooks/auth/useAuthState';

import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import VerifyCodeForm from '@/components/auth/VerifyCodeForm';
import SetNewPasswordForm from '@/components/auth/SetNewPasswordForm';

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
  
  // Рендеримо сторінку відповідно до поточного кроку
  if (authStep === AuthStep.RESET_PASSWORD) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.resetPassword}</h1>
            <p className="mt-2 text-muted-foreground">{t.enterPhone}</p>
          </div>
          
          <ResetPasswordForm 
            onBack={() => setAuthStep(AuthStep.LOGIN_REGISTER)}
            onCodeVerified={handleCodeVerified}
          />
        </div>
      </div>
    );
  }
  
  if (authStep === AuthStep.VERIFY_CODE) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.verifyCode}</h1>
            <p className="mt-2 text-muted-foreground">{t.enterVerificationCode}</p>
          </div>
          
          <VerifyCodeForm
            onBack={() => setAuthStep(AuthStep.RESET_PASSWORD)}
            onVerified={() => setAuthStep(AuthStep.SET_NEW_PASSWORD)}
          />
        </div>
      </div>
    );
  }
  
  if (authStep === AuthStep.SET_NEW_PASSWORD) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.resetPassword}</h1>
            <p className="mt-2 text-muted-foreground">{t.enterNewPassword}</p>
          </div>
          
          <SetNewPasswordForm
            phoneNumber={resetPhoneNumber}
            onComplete={() => setAuthStep(AuthStep.LOGIN_REGISTER)}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isLogin ? t.loginToApp : t.register}</h1>
          <p className="mt-2 text-muted-foreground">{t.appDescription}</p>
        </div>
        
        <Tabs value={isLogin ? "login" : "register"} className="w-full" onValueChange={(value) => setIsLogin(value === "login")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">
              {t.login}
            </TabsTrigger>
            <TabsTrigger value="register">
              {t.register}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4 pt-2">
            <LoginForm 
              onForgotPassword={() => setAuthStep(AuthStep.RESET_PASSWORD)}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 pt-2">
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
