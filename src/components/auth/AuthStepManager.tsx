
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

import SupabaseLoginForm from '@/components/auth/SupabaseLoginForm';
import SupabaseRegisterForm from '@/components/auth/SupabaseRegisterForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import VerifyCodeForm from '@/components/auth/VerifyCodeForm';
import SetNewPasswordForm from '@/components/auth/SetNewPasswordForm';

enum AuthStep {
  LOGIN_REGISTER,
  RESET_PASSWORD,
  VERIFY_CODE,
  SET_NEW_PASSWORD
}

interface AuthStepManagerProps {
  authStep: AuthStep;
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  setAuthStep: (step: AuthStep) => void;
  resetPhoneNumber: string;
  onCodeVerified: (phoneNumber: string) => void;
}

export function AuthStepManager({
  authStep,
  isLogin,
  setIsLogin,
  setAuthStep,
  resetPhoneNumber,
  onCodeVerified
}: AuthStepManagerProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  // Рендеримо компонент відповідно до поточного кроку автентифікації
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
            onCodeVerified={onCodeVerified}
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
            <SupabaseLoginForm 
              onForgotPassword={() => setAuthStep(AuthStep.RESET_PASSWORD)}
              onSwitchToRegister={() => setIsLogin(false)}
            />
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4 pt-2">
            <SupabaseRegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
