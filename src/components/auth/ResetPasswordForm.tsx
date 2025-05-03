
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface ResetPasswordFormProps {
  onBack: () => void;
  onCodeVerified: (phoneNumber: string) => void;
}

export default function ResetPasswordForm({ onBack, onCodeVerified }: ResetPasswordFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [resetPhoneNumber, setResetPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  
  const mockVerificationCode = "123456";

  const handleResetPassword = async () => {
    if (!resetPhoneNumber) {
      toast.error("Введіть номер телефону");
      return;
    }
    
    try {
      setLoading(true);
      // Перевірка чи існує користувач з таким номером
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', resetPhoneNumber);
      
      if (error) {
        console.error("Error finding user for password reset:", error);
        toast.error("Помилка при перевірці номеру телефону");
        return;
      }
      
      if (!user || user.length === 0) {
        toast.error(t.phoneNotRegistered);
        return;
      }
      
      // Імітуємо надсилання коду
      toast.success(`${t.verificationCodeSent} ${mockVerificationCode}`);
      
      // Переходимо до наступного кроку
      onCodeVerified(resetPhoneNumber);
    } catch (error) {
      console.error("Error during password reset:", error);
      toast.error("Помилка при скиданні паролю");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="tel"
        placeholder={t.phoneNumber}
        value={resetPhoneNumber}
        onChange={(e) => setResetPhoneNumber(e.target.value)}
      />
      
      <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
        {loading ? "Завантаження..." : t.reset}
      </Button>
      
      <Button variant="outline" className="w-full" onClick={onBack} disabled={loading}>
        {t.backToLogin}
      </Button>
    </div>
  );
}
