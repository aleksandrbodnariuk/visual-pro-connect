import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSupabaseAuth } from '@/hooks/auth/useSupabaseAuth';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface SupabaseRegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function SupabaseRegisterForm({ onSwitchToLogin }: SupabaseRegisterFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();
  const { signUp } = useSupabaseAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      toast.error(t.fillAllFields);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t.passwordsDoNotMatch);
      return;
    }

    if (password.length < 6) {
      toast.error('Пароль повинен містити принаймні 6 символів');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(email, password, {
        full_name: `${firstName} ${lastName}`,
        phone: phoneNumber,
        first_name: firstName,
        last_name: lastName
      });

      if (error) {
        console.error("Registration error:", error);
        if (error.message.includes('User already registered')) {
          toast.error('Користувач з таким email вже зареєстрований');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data?.user) {
        toast.success('Реєстрація успішна! Перевірте ваш email для підтвердження.');
        navigate('/');
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error('Помилка реєстрації');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="text"
          placeholder={t.firstName}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        
        <Input
          type="text"
          placeholder={t.lastName}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      
      <Input
        type="tel"
        placeholder={t.phoneNumber + ' (опціонально)'}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      
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
      
      <Input
        type="password"
        placeholder={t.confirmPassword}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      
      <Button className="w-full" onClick={handleRegister} disabled={loading}>
        {loading ? t.loading : t.register}
      </Button>
      
      <Button variant="ghost" className="w-full" onClick={onSwitchToLogin} disabled={loading}>
        {t.alreadyHaveAccount}
      </Button>
    </div>
  );
}