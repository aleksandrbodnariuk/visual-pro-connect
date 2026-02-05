import React from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface PasswordRequirementsProps {
  password: string;
}

export const validatePassword = (pwd: string) => ({
  minLength: pwd.length >= 10,
  hasUppercase: /[A-Z]/.test(pwd),
  hasLowercase: /[a-z]/.test(pwd),
  hasNumber: /[0-9]/.test(pwd),
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
});

export const isPasswordValid = (pwd: string) => 
  Object.values(validatePassword(pwd)).every(Boolean);

export default function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const { language } = useLanguage();
  const t = translations[language];
  
  const requirements = validatePassword(password);
  
  const items = [
    { key: 'minLength', label: t.passwordMinChars, met: requirements.minLength },
    { key: 'hasUppercase', label: t.passwordUppercase, met: requirements.hasUppercase },
    { key: 'hasLowercase', label: t.passwordLowercase, met: requirements.hasLowercase },
    { key: 'hasNumber', label: t.passwordNumber, met: requirements.hasNumber },
    { key: 'hasSpecial', label: t.passwordSpecial, met: requirements.hasSpecial },
  ];

  return (
    <div className="space-y-1.5 text-sm">
      <p className="font-medium text-muted-foreground">{t.passwordRequirements}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            {item.met ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
            <span className={item.met ? 'text-primary' : 'text-muted-foreground'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
