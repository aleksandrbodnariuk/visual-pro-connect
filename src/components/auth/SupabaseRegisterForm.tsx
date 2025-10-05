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
      toast.error(t.passwordMinLength);
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Starting registration for:', email);
      const { data, error } = await signUp(email, password, {
        full_name: `${firstName} ${lastName}`,
        phone: phoneNumber,
        first_name: firstName,
        last_name: lastName
      });

      console.log('🔐 Registration response:', { 
        hasData: !!data, 
        hasUser: !!data?.user,
        userId: data?.user?.id,
        error: error?.message 
      });

      if (error) {
        console.error("❌ Registration error:", error);
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          toast.error(t.userAlreadyExists);
        } else if (error.message.includes('Invalid email')) {
          toast.error(t.invalidEmail);
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data?.user) {
        console.log('✅ User registered successfully:', data.user.id);
        toast.success(t.registrationSuccess);
        // Don't navigate immediately - let the auth state change handle it
        // The auth listener in useSupabaseAuth will handle profile creation
      } else {
        console.warn('⚠️ Registration succeeded but no user data returned');
      }
    } catch (error: any) {
      console.error("❌ Registration exception:", error);
      toast.error(error?.message || t.registrationError);
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