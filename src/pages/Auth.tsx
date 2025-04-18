
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

enum AuthStep {
  LOGIN_REGISTER,
  RESET_PASSWORD,
  VERIFY_CODE,
  SET_NEW_PASSWORD
}

// Define user interface to fix type errors
interface User {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password?: string;
  createdAt: string;
  categories: any[];
  isAdmin?: boolean;
  isFounder?: boolean;
  isShareHolder?: boolean;
  role?: string;
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
  
  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      navigate("/");
    }
  }, [navigate]);
  
  const handleLogin = () => {
    if (!phoneNumber || !password) {
      toast.error(t.enterPhoneAndPassword);
      return;
    }
    
    // Отримуємо користувачів з localStorage
    const users = JSON.parse(localStorage.getItem("users") || "[]") as User[];
    
    // Перевіряємо чи це логін адміністратора-засновника (0507068007)
    if (phoneNumber === "0507068007") {
      // Якщо це телефон адміністратора-засновника
      if (password === "admin" || password === "00000000") {
        const adminUser: User = {
          id: "admin1",
          firstName: "Admin",
          lastName: "Founder",
          phoneNumber: phoneNumber,
          isAdmin: true,
          isFounder: true,
          isShareHolder: true,
          role: "admin",
          createdAt: new Date().toISOString(),
          categories: []
        };
        
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        toast.success(t.loginAsAdminFounder);
        navigate("/admin");
        return;
      }
    }
    
    // Спочатку шукаємо користувача за номером телефону і паролем
    const foundUser = users.find((user) => 
      user.phoneNumber === phoneNumber && user.password === password);
    
    // Якщо знайдено користувача, виконуємо вхід
    if (foundUser) {
      // Перевіряємо, чи це адміністратор за номером телефону
      if (phoneNumber === "0507068007") {
        // Якщо це телефон адміністратора, додаємо права адміністратора
        foundUser.isAdmin = true;
        foundUser.isFounder = true;
        foundUser.isShareHolder = true;
        foundUser.role = "admin";
        
        // Оновлюємо користувача в локальному сховищі
        const updatedUsers = users.map((u) => 
          u.phoneNumber === phoneNumber ? foundUser : u
        );
        localStorage.setItem("users", JSON.stringify(updatedUsers));
        
        localStorage.setItem("currentUser", JSON.stringify(foundUser));
        toast.success(t.loginAsAdminFounder);
        navigate("/admin");
        return;
      }
      
      localStorage.setItem("currentUser", JSON.stringify(foundUser));
      toast.success(t.loginSuccessful);
      navigate("/");
      return;
    }
    
    // Якщо не знайшли за паролем, перевіряємо, чи користувач існує, але без пароля
    // або використовуючи тимчасовий пароль
    const userExists = users.find((user) => user.phoneNumber === phoneNumber);
    
    if (userExists && (!userExists.password || userExists.password === "")) {
      // Якщо користувач існує і не має пароля, перевіряємо тимчасовий пароль
      if (password === "00000000") {
        // Перевіряємо, чи це адміністратор за номером телефону
        if (phoneNumber === "0507068007") {
          // Якщо це телефон адміністратора, додаємо права адміністратора
          userExists.isAdmin = true;
          userExists.isFounder = true;
          userExists.isShareHolder = true;
          userExists.role = "admin";
          
          // Оновлюємо користувача в локальному сховищі
          const updatedUsers = users.map((u) => 
            u.phoneNumber === phoneNumber ? userExists : u
          );
          localStorage.setItem("users", JSON.stringify(updatedUsers));
          
          localStorage.setItem("currentUser", JSON.stringify(userExists));
          toast.success(t.loginAsAdminFounder);
          navigate("/admin");
          return;
        }
        
        // Успішний вхід через тимчасовий пароль
        localStorage.setItem("currentUser", JSON.stringify(userExists));
        toast.success(t.temporaryPasswordLogin);
        toast.info(t.pleaseChangePassword);
        navigate("/settings");
        return;
      }
    }
    
    toast.error(t.incorrectPhoneOrPassword);
  };
  
  const handleRegister = () => {
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
    
    // Отримуємо користувачів з localStorage
    const users = JSON.parse(localStorage.getItem("users") || "[]") as User[];
    
    // Перевіряємо, чи існує вже користувач з таким номером
    const existingUser = users.find((user) => user.phoneNumber === phoneNumber);
    if (existingUser) {
      toast.error(t.userWithPhoneExists);
      return;
    }
    
    // Створюємо нового користувача
    const newUser: User = {
      id: Date.now().toString(),
      firstName,
      lastName,
      phoneNumber,
      password,
      createdAt: new Date().toISOString(),
      categories: [],
      isAdmin: false,
      isFounder: false,
      isShareHolder: false,
      role: "user"
    };
    
    // Перевіряємо, чи це адміністратор за номером телефону
    if (phoneNumber === "0507068007") {
      // Якщо це телефон адміністратора, додаємо права адміністратора
      newUser.isAdmin = true;
      newUser.isFounder = true;
      newUser.isShareHolder = true;
      newUser.role = "admin";
    }
    
    // Додаємо нового користувача
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));
    
    // Встановлюємо поточного користувача
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    
    toast.success(t.registrationSuccessful);
    
    // Якщо це адміністратор, перенаправляємо в адмін-панель
    if (phoneNumber === "0507068007") {
      navigate("/admin");
    } else {
      navigate("/");
    }
  };
  
  const handleResetPassword = () => {
    // Перевіряємо, чи існує користувач з таким номером
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.phoneNumber === resetPhoneNumber);
    
    if (!user) {
      toast.error(t.phoneNotRegistered);
      return;
    }
    
    // Імітуємо надсилання коду
    toast.success(`${t.verificationCodeSent} ${mockVerificationCode}`);
    
    // Переходимо до наступного кроку
    setAuthStep(AuthStep.VERIFY_CODE);
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
  
  const handleSetNewPassword = () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(t.passwordsDoNotMatch);
      return;
    }
    
    // Оновлюємо пароль у локальному сховищі
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const updatedUsers = users.map((user: any) => {
      if (user.phoneNumber === resetPhoneNumber) {
        return { ...user, password: newPassword };
      }
      return user;
    });
    
    // Зберігаємо оновлений список користувачів
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    toast.success(t.passwordResetSuccess);
    
    // Повертаємось до форми входу
    setAuthStep(AuthStep.LOGIN_REGISTER);
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
            
            <Button className="w-full" onClick={handleResetPassword}>
              {t.reset}
            </Button>
            
            <Button variant="outline" className="w-full" onClick={() => setAuthStep(AuthStep.LOGIN_REGISTER)}>
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
            <Button className="w-full" onClick={handleLogin}>
              {t.login}
            </Button>
            <div className="flex justify-between text-sm">
              <Button
                variant="link"
                onClick={() => setAuthStep(AuthStep.RESET_PASSWORD)}
                className="p-0 h-auto text-sm"
              >
                {t.forgotPassword}
              </Button>
              <Button
                variant="link"
                onClick={handleLoginWithTempPassword}
                className="p-0 h-auto text-sm"
              >
                {t.temporaryPasswordLogin || "Вхід за тимчасовим паролем"}
              </Button>
            </div>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t.noAccount}</span>{" "}
              <Button variant="link" onClick={() => setIsLogin(false)} className="p-0 h-auto text-sm">
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
            <Button className="w-full" onClick={handleRegister}>
              {t.register}
            </Button>
            <div className="text-center text-sm">
              <span className="text-muted-foreground">{t.alreadyHaveAccount}</span>{" "}
              <Button variant="link" onClick={() => setIsLogin(true)} className="p-0 h-auto text-sm">
                {t.login}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
