
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!phoneNumber || !password || !confirmPassword) {
      toast.error(t.enterPhoneAndPassword);
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error(t.passwordsDoNotMatch);
      return;
    }
    
    if (!firstName || !lastName) {
      toast.error(t.enterNameAndSurname);
      return;
    }
    
    try {
      setLoading(true);
      // Перевірка чи існує користувач з таким номером
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', phoneNumber);
        
      if (checkError) {
        console.error("Помилка при перевірці номеру телефону:", checkError);
        toast.error("Помилка при перевірці номеру телефону");
        return;
      }
      
      if (existingUsers && existingUsers.length > 0) {
        toast.error(t.userWithPhoneExists);
        return;
      }
      
      // Спеціальна обробка для засновника
      const isFounder = phoneNumber === "0507068007";
      
      // Створення нового користувача в Supabase
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          full_name: `${firstName} ${lastName}`,
          phone_number: phoneNumber,
          password: password,
          is_admin: isFounder,
          founder_admin: isFounder,
          is_shareholder: isFounder,
          bio: '',
          website: '',
          instagram: '',
          facebook: '',
          viber: ''
        })
        .select();
        
      if (insertError) {
        console.error("Помилка при створенні користувача:", insertError);
        
        // Додаткова інформація про помилку
        if (insertError.message.includes('row-level security policy')) {
          toast.error("Помилка безпеки при створенні користувача. Будь ласка, зверніться до адміністратора.");
        } else {
          toast.error("Помилка при створенні користувача");
        }
        return;
      }
      
      if (!newUser || newUser.length === 0) {
        toast.error("Помилка створення користувача: порожня відповідь");
        return;
      }
      
      const createdUser = newUser[0];
      
      // Зберігаємо користувача в локальному сховищі
      const currentUser = {
        id: createdUser.id,
        firstName,
        lastName,
        phoneNumber,
        password,
        isAdmin: isFounder,
        isFounder: isFounder,
        isShareHolder: isFounder,
        role: isFounder ? "admin-founder" : "user",
        status: isFounder ? "Адміністратор-засновник" : "Звичайний користувач",
        createdAt: createdUser.created_at,
        categories: [],
        bio: '',
        website: '',
        instagram: '',
        facebook: '',
        viber: ''
      };
      
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      
      toast.success(t.registrationSuccessful);
      
      if (isFounder) {
        navigate("/admin");
      } else {
        navigate("/");
      }
      
    } catch (error) {
      console.error("Помилка при реєстрації:", error);
      toast.error("Помилка при реєстрації");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder={t.firstNamePlaceholder}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          placeholder={t.lastNamePlaceholder}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
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
      <Input
        type="password"
        placeholder={t.confirmPassword}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button className="w-full" onClick={handleRegister} disabled={loading}>
        {loading ? "Завантаження..." : t.register}
      </Button>
      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t.alreadyHaveAccount}</span>{" "}
        <Button variant="link" onClick={onSwitchToLogin} className="p-0 h-auto text-sm" disabled={loading}>
          {t.login}
        </Button>
      </div>
    </div>
  );
}
