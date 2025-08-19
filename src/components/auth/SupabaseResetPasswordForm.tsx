import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface SupabaseResetPasswordFormProps {
  onBack: () => void;
}

export default function SupabaseResetPasswordForm({ onBack }: SupabaseResetPasswordFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      toast.error("Введіть email адресу");
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        console.error("Password reset error:", error);
        toast.error(error.message);
        return;
      }
      
      toast.success("Лист для скидання паролю надіслано на вашу електронну пошту");
      
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
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      
      <Button className="w-full" onClick={handleResetPassword} disabled={loading}>
        {loading ? "Завантаження..." : "Надіслати лист для скидання"}
      </Button>
      
      <Button variant="outline" className="w-full" onClick={onBack} disabled={loading}>
        {t.backToLogin}
      </Button>
    </div>
  );
}