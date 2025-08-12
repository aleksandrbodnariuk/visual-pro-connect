
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { User } from '@/hooks/users/types';

interface LoginFormProps {
  onForgotPassword: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onForgotPassword, onSwitchToRegister }: LoginFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoginWithTempPassword = () => {
    toast(t.useTemporaryPassword);
  };

  const processUserLogin = async (user: any) => {
    // Конвертуємо користувача у формат, який використовується в додатку
    const currentUser: User = {
      id: user.id,
      firstName: user.full_name?.split(' ')[0] || '',
      lastName: user.full_name?.split(' ')[1] || '',
      phoneNumber: user.phone_number,
      isAdmin: user.is_admin,
      isFounder: user.founder_admin,
      isShareHolder: user.is_shareholder,
      role: user.is_admin ? (user.founder_admin ? "admin-founder" : "admin") : 
          (user.is_shareholder ? "shareholder" : "user"),
      status: user.founder_admin ? "Адміністратор-засновник" : 
            (user.is_admin ? "Адміністратор" : 
            (user.is_shareholder ? "Акціонер" : "Звичайний користувач")),
      created_at: user.created_at,
      categories: user.categories || [],
      avatarUrl: user.avatar_url,
      bio: user.bio || '',
      website: user.website || '',
      instagram: user.instagram || '',
      facebook: user.facebook || '',
      viber: user.viber || ''
    };
    
    localStorage.setItem("currentUser", JSON.stringify(currentUser));
    
    // Створюємо псевдо-сесію в Supabase для RLS
    try {
      await supabase.auth.signInAnonymously();
      // Встановлюємо user_id контекст для RLS
      await supabase.rpc('set_current_user_context', {
        user_uuid: currentUser.id
      });
    } catch (authError) {
      console.warn('Не вдалося створити Supabase сесію:', authError);
    }
    
    if (password === "00000000" && user.has_password === false) {
      toast.success(t.temporaryPasswordLogin);
      toast.info(t.pleaseChangePassword);
      navigate("/settings");
    } else {
      toast.success(t.loginSuccessful);
      navigate("/");
    }
  };

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      toast.error(t.enterPhoneAndPassword);
      return;
    }
    
    try {
      setLoading(true);
      
      // Перевіряємо користувача через безпечну RPC-функцію
      const { data, error } = await (supabase as any).rpc('validate_user_credentials', {
        _phone_number: phoneNumber,
        _input_password: password
      });
      
      if (error) {
        console.error("Помилка при перевірці облікового запису:", error);
        toast.error("Помилка при перевірці облікового запису");
        return;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        toast.error(t.incorrectPhoneOrPassword);
        return;
      }

      const user = data[0] as any;
      await processUserLogin(user);
      
    } catch (error) {
      console.error("Помилка при авторизації:", error);
      toast.error("Помилка при авторизації");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="tel"
        placeholder={t.phoneNumber}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <Input
        type="password"
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button className="w-full" onClick={handleLogin} disabled={loading}>
        {loading ? "Завантаження..." : t.login}
      </Button>
      <div className="flex justify-between text-sm">
        <Button
          variant="link"
          onClick={onForgotPassword}
          className="p-0 h-auto text-sm"
          disabled={loading}
        >
          {t.forgotPassword}
        </Button>
        <Button
          variant="link"
          onClick={handleLoginWithTempPassword}
          className="p-0 h-auto text-sm"
          disabled={loading}
        >
          {t.temporaryPasswordLogin || "Вхід за тимчасовим паролем"}
        </Button>
      </div>
      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t.noAccount}</span>{" "}
        <Button variant="link" onClick={onSwitchToRegister} className="p-0 h-auto text-sm" disabled={loading}>
          {t.register}
        </Button>
      </div>
    </div>
  );
}
