import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { supabase } from "@/integrations/supabase/client";

enum AuthStep {
  LOGIN_REGISTER,
  RESET_PASSWORD,
  VERIFY_CODE,
  SET_NEW_PASSWORD
}

export default function Auth() {
  const { language } = useLanguage();
  const t = translations[language];
  
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>(AuthStep.LOGIN_REGISTER);
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  // Для скидання паролю
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetPhoneNumber, setResetPhoneNumber] = useState("");
  
  const mockVerificationCode = "123456";
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      navigate("/");
    }
  }, [navigate]);
  
  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      toast.error(t.enterPhoneAndPassword);
      return;
    }
    
    try {
      setLoading(true);
      // Перевіряємо користувача в Supabase
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber);
      
      if (fetchError) {
        console.error("Помилка при пошуку користувача:", fetchError);
        toast.error("Помилка при перевірці облікового запису");
        setLoading(false);
        return;
      }

      console.log("Знайдено користувачів:", users);
      
      if (!users || users.length === 0) {
        toast.error("Користувача з таким номером не знайдено");
        setLoading(false);
        return;
      }
      
      const user = users[0]; // Беремо першого знайденого користувача
      
      // Спочатку перевіряємо чи це телефон засновника
      if (phoneNumber === "0507068007") {
        // Якщо засновник існує в базі, перевіряємо пароль
        if (user) {
          if (user.password === password) {
            // Успішний вхід для засновника
            const adminUser = {
              id: user.id,
              firstName: user.full_name?.split(' ')[0] || 'Admin',
              lastName: user.full_name?.split(' ')[1] || 'Founder',
              phoneNumber: phoneNumber,
              password: user.password,
              isAdmin: true,
              isFounder: true,
              isShareHolder: true,
              role: "admin-founder",
              status: "Адміністратор-засновник",
              createdAt: user.created_at,
              categories: user.categories || [],
              avatarUrl: user.avatar_url,
              bio: user.bio || '',
              website: user.website || '',
              instagram: user.instagram || '',
              facebook: user.facebook || '',
              viber: user.viber || ''
            };
            
            localStorage.setItem("currentUser", JSON.stringify(adminUser));
            toast.success(t.loginAsAdminFounder);
            navigate("/admin");
            return;
          } else {
            toast.error(t.incorrectPhoneOrPassword);
            setLoading(false);
            return;
          }
        }
      }
      
      // Перевірка пароля
      if (user.password !== password) {
        // Перевірка тимчасового пароля
        if (password === "00000000" && (!user.password || user.password === '')) {
          // Оновлюємо в локальному сховищі
          const currentUser = {
            id: user.id,
            firstName: user.full_name?.split(' ')[0] || '',
            lastName: user.full_name?.split(' ')[1] || '',
            phoneNumber: user.phone_number,
            password: password,
            isAdmin: user.is_admin,
            isFounder: user.founder_admin,
            isShareHolder: user.is_shareholder,
            role: user.is_admin ? (user.founder_admin ? "admin-founder" : "admin") : 
                 (user.is_shareholder ? "shareholder" : "user"),
            status: user.founder_admin ? "Адміністратор-засновник" : 
                  (user.is_admin ? "Адміністратор" : 
                  (user.is_shareholder ? "Акціонер" : "Звичайний користувач")),
            createdAt: user.created_at,
            categories: user.categories || [],
            avatarUrl: user.avatar_url,
            bio: user.bio || '',
            website: user.website || '',
            instagram: user.instagram || '',
            facebook: user.facebook || '',
            viber: user.viber || ''
          };
          
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
          toast.success(t.temporaryPasswordLogin);
          toast.info(t.pleaseChangePassword);
          navigate("/settings");
          return;
        }
        
        toast.error(t.incorrectPhoneOrPassword);
        setLoading(false);
        return;
      }
      
      // Успішний вхід
      const currentUser = {
        id: user.id,
        firstName: user.full_name?.split(' ')[0] || '',
        lastName: user.full_name?.split(' ')[1] || '',
        phoneNumber: user.phone_number,
        password: user.password,
        isAdmin: user.is_admin,
        isFounder: user.founder_admin,
        isShareHolder: user.is_shareholder,
        role: user.is_admin ? (user.founder_admin ? "admin-founder" : "admin") : 
             (user.is_shareholder ? "shareholder" : "user"),
        status: user.founder_admin ? "Адміністратор-засновник" : 
              (user.is_admin ? "Адміністратор" : 
              (user.is_shareholder ? "Акціонер" : "Звичайний користувач")),
        createdAt: user.created_at,
        categories: user.categories || [],
        avatarUrl: user.avatar_url,
        bio: user.bio || '',
        website: user.website || '',
        instagram: user.instagram || '',
        facebook: user.facebook || '',
        viber: user.viber || ''
      };
      
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      toast.success(t.loginSuccessful);
      navigate("/");
      
    } catch (error) {
      console.error("Помилка при авторизації:", error);
      toast.error("Помилка при авторизації");
    } finally {
      setLoading(false);
    }
  };
  
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
        setLoading(false);
        return;
      }
      
      if (existingUsers && existingUsers.length > 0) {
        toast.error(t.userWithPhoneExists);
        setLoading(false);
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
          is_shareholder: isFounder
        })
        .select();
        
      if (insertError) {
        console.error("Помилка при створенні користувача:", insertError);
        toast.error("Помилка при створенні користувача");
        setLoading(false);
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
        categories: []
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
  
  const handleResetPassword = async () => {
    if (!resetPhoneNumber) {
      toast.error("Введіть номер телефону");
      return;
    }
    
    try {
      // Перевірка чи існує користувач з таким номером
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('phone_number', resetPhoneNumber)
        .single();
      
      if (error) {
        console.error("Error finding user for password reset:", error);
        if (error.code === 'PGRST116') {
          toast.error(t.phoneNotRegistered);
        } else {
          toast.error("Помилка при перевірці номеру телефону");
        }
        return;
      }
      
      // Імітуємо надсилання коду
      toast.success(`${t.verificationCodeSent} ${mockVerificationCode}`);
      
      // Переходимо до наступного кроку
      setAuthStep(AuthStep.VERIFY_CODE);
    } catch (error) {
      console.error("Error during password reset:", error);
      toast.error("Помилка при скиданні паролю");
    }
  };
  
  const handleVerifyCode = () => {
    // Перевіряємо код
    if (verificationCode !== mockVerificationCode) {
      toast.error(t.incorrectCode);
      return;
    }
    
    // Переходимо до наступного кроку
    setAuthStep(AuthStep.SET_NEW_PASSWORD);
  };
  
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
      // Оновлюємо пароль у Supabase
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('phone_number', resetPhoneNumber);
        
      if (error) {
        console.error("Error updating password:", error);
        toast.error("Помилка при оновленні паролю");
        return;
      }
      
      toast.success(t.passwordResetSuccess);
      
      // Повертаємось до форми входу
      setAuthStep(AuthStep.LOGIN_REGISTER);
    } catch (error) {
      console.error("Error during password update:", error);
      toast.error("Помилка при оновленні паролю");
    }
  };
  
  const handleLoginWithTempPassword = () => {
    // Для користувачів, які зареєстровані, але не мають пароля
    toast(t.useTemporaryPassword);
  };
  
  // Рендеримо сторінку відповідно до поточного кроку
  if (authStep === AuthStep.RESET_PASSWORD) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.resetPassword}</h1>
            <p className="mt-2 text-muted-foreground">{t.enterPhone}</p>
          </div>
          
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
            
            <Button variant="outline" className="w-full" onClick={() => setAuthStep(AuthStep.LOGIN_REGISTER)} disabled={loading}>
              {t.backToLogin}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (authStep === AuthStep.VERIFY_CODE) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.verifyCode}</h1>
            <p className="mt-2 text-muted-foreground">{t.enterVerificationCode}</p>
          </div>
          
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
            
            <Button variant="outline" className="w-full" onClick={() => setAuthStep(AuthStep.RESET_PASSWORD)}>
              {t.backToLogin}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (authStep === AuthStep.SET_NEW_PASSWORD) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{t.resetPassword}</h1>
            <p className="mt-2 text-muted-foreground">{t.enterNewPassword}</p>
          </div>
          
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
            
            <Button className="w-full" onClick={handleSetNewPassword}>
              {t.confirm}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isLogin ? t.loginToApp : t.register}</h1>
          <p className="mt-2 text-muted-foreground">{t.appDescription}</p>
        </div>
        
        <Tabs value={isLogin ? "login" : "register"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" onClick={() => setIsLogin(true)}>
              {t.login}
            </TabsTrigger>
            <TabsTrigger value="register" onClick={() => setIsLogin(false)}>
              {t.register}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
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
                onClick={() => setAuthStep(AuthStep.RESET_PASSWORD)}
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
              <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto text-sm" disabled={loading}>
                {t.register}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="register" className="space-y-4">
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
              <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto text-sm" disabled={loading}>
                {t.login}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
