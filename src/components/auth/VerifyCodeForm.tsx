
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface VerifyCodeFormProps {
  onBack: () => void;
  onVerified: () => void;
}

export default function VerifyCodeForm({ onBack, onVerified }: VerifyCodeFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const [verificationCode, setVerificationCode] = useState("");
  const mockVerificationCode = "123456";

  const handleVerifyCode = () => {
    // Перевіряємо код
    if (verificationCode !== mockVerificationCode) {
      toast.error(t.incorrectCode);
      return;
    }
    
    // Переходимо до наступного кроку
    onVerified();
  };

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="123456"
        value={verificationCode}
        onChange={(e) => setVerificationCode(e.target.value)}
      />
      
      <Button className="w-full" onClick={handleVerifyCode}>
        {t.confirm}
      </Button>
      
      <Button variant="outline" className="w-full" onClick={onBack}>
        {t.backToLogin}
      </Button>
    </div>
  );
}
