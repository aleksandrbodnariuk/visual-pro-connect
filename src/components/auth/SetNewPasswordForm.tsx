
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface SetNewPasswordFormProps {
  phoneNumber: string;
  onComplete: () => void;
}

export default function SetNewPasswordForm({ phoneNumber, onComplete }: SetNewPasswordFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetNewPassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast.error("Введіть новий пароль");
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast.error(t.passwordsDoNotMatch);
      return;
    }
    
    try {
      setLoading(true);
      // Оновлюємо пароль через безпечну RPC
      const { data: ok, error } = await (supabase as any).rpc('set_user_password', {
        _phone_number: phoneNumber,
        _new_password: newPassword
      });
        
      if (error) {
        console.error("Error updating password:", error);
        toast.error("Помилка при оновленні паролю");
        return;
      }
      
      toast.success(t.passwordResetSuccess);
      
      // Повертаємось до форми входу
      onComplete();
    } catch (error) {
      console.error("Error during password update:", error);
      toast.error("Помилка при оновленні паролю");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="password"
        placeholder={t.newPassword}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      
      <Input
        type="password"
        placeholder={t.confirmNewPassword}
        value={confirmNewPassword}
        onChange={(e) => setConfirmNewPassword(e.target.value)}
      />
      
      <Button className="w-full" onClick={handleSetNewPassword} disabled={loading}>
        {loading ? "Завантаження..." : t.confirm}
      </Button>
    </div>
  );
}
