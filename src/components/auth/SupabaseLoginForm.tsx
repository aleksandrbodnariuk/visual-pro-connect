import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSupabaseAuth } from '@/hooks/auth/useSupabaseAuth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface SupabaseLoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export default function SupabaseLoginForm({ onSwitchToRegister, onForgotPassword }: SupabaseLoginFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();
  const { signIn } = useSupabaseAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error(t.fillAllFields);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);

      if (error) {
        console.error("Login error:", error);
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Невірні облікові дані');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data?.user) {
        toast.success('Успішний вхід до системи!');
        navigate('/');
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error('Помилка входу в систему');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      
      <Input
        type="password"
        placeholder={t.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      
      <Button className="w-full" onClick={handleLogin} disabled={loading}>
        {loading ? t.loading : t.login}
      </Button>
      
      <div className="flex flex-col space-y-2">
        <Button variant="outline" className="w-full" onClick={onForgotPassword} disabled={loading}>
          {t.forgotPassword}
        </Button>
        
        <Button variant="ghost" className="w-full" onClick={onSwitchToRegister} disabled={loading}>
          {t.register}
        </Button>
      </div>
    </div>
  );
}