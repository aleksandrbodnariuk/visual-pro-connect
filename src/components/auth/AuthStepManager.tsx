import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { LanguageSelector } from '@/components/layout/LanguageSelector';

import SupabaseLoginForm from '@/components/auth/SupabaseLoginForm';
import SupabaseRegisterForm from '@/components/auth/SupabaseRegisterForm';
import SupabaseResetPasswordForm from '@/components/auth/SupabaseResetPasswordForm';

export enum AuthStep {
  LOGIN_REGISTER,
  SUPABASE_RESET_PASSWORD
}

interface AuthStepManagerProps {
  authStep: AuthStep;
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  setAuthStep: (step: AuthStep) => void;
  resetPhoneNumber?: string;
  onCodeVerified?: (phoneNumber: string) => void;
}

export function AuthStepManager({
  authStep,
  isLogin,
  setIsLogin,
  setAuthStep,
}: AuthStepManagerProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  // Рендеримо компонент відповідно до поточного кроку автентифікації
  if (authStep === AuthStep.SUPABASE_RESET_PASSWORD) {
    return (
      <div className="relative flex h-screen flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Скидання паролю</h1>
            <p className="mt-2 text-muted-foreground">Введіть вашу email адресу для скидання паролю</p>
          </div>
          
          <SupabaseResetPasswordForm 
            onBack={() => setAuthStep(AuthStep.LOGIN_REGISTER)}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
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
              onForgotPassword={() => setAuthStep(AuthStep.SUPABASE_RESET_PASSWORD)}
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
