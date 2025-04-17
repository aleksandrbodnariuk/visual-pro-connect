
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpVerification, setIsOtpVerification] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      handleForgotPassword();
      return;
    }
    
    if (isOtpVerification) {
      handleOtpVerification();
      return;
    }
    
    if (!phoneNumber || !password) {
      toast.error(t.enterPhoneAndPassword);
      return;
    }
    
    if (isLogin) {
      handleLogin();
    } else {
      handleRegister();
    }
  };
  
  const handleLogin = () => {
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const user = users.find((u: any) => u.phoneNumber === phoneNumber && u.password === password);
    
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      toast.success(t.loginSuccessful);
      
      if (user.role === "admin" || user.role === "admin-founder") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } else {
      // Check for founder admin access
      if (phoneNumber === "0507068007" && password === "admin") {
        const adminUser = {
          id: "admin-founder",
          firstName: "Олександр",
          lastName: "Боднарюк",
          phoneNumber: "0507068007",
          password: "admin",
          role: "admin-founder",
          status: "Адміністратор-засновник",
          isAdmin: true
        };
        
        const existingUsers = JSON.parse(localStorage.getItem("users") || "[]");
        const adminExists = existingUsers.some((u: any) => u.role === "admin-founder");
        
        if (!adminExists) {
          localStorage.setItem("users", JSON.stringify([...existingUsers, adminUser]));
        }
        
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        toast.success(t.loginAsAdminFounder);
        navigate("/admin");
      } else {
        // Check if user exists but with empty password (never set)
        const userWithoutPassword = users.find((u: any) => u.phoneNumber === phoneNumber && (!u.password || u.password === ""));
        
        if (userWithoutPassword) {
          // Allow login with temporary password "00000000"
          if (password === "00000000") {
            localStorage.setItem("currentUser", JSON.stringify(userWithoutPassword));
            toast.success(t.temporaryPasswordLogin);
            toast.info(t.pleaseChangePassword);
            navigate("/settings");
          } else {
            toast.info(t.useTemporaryPassword);
          }
        } else {
          toast.error(t.incorrectPhoneOrPassword);
        }
      }
    }
  };
  
  const handleRegister = () => {
    if (password !== confirmPassword) {
      toast.error(t.passwordsDoNotMatch);
      return;
    }
    
    if (!firstName || !lastName) {
      toast.error(t.enterNameAndSurname);
      return;
    }
    
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userExists = users.some((u: any) => u.phoneNumber === phoneNumber);
    
    if (userExists) {
      toast.error(t.userWithPhoneExists);
      return;
    }
    
    const newUser = {
      id: Date.now().toString(),
      firstName,
      lastName,
      phoneNumber,
      password,
      role: "user",
      status: "Учасник",
      posts: [],
      followers: [],
      following: [],
      profilePicture: ""
    };
    
    localStorage.setItem("users", JSON.stringify([...users, newUser]));
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    
    toast.success(t.registrationSuccessful);
    navigate("/");
  };

  const handleForgotPassword = () => {
    if (!phoneNumber) {
      toast.error(t.enterPhone);
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userExists = users.some((u: any) => u.phoneNumber === phoneNumber);
    
    if (!userExists) {
      toast.error(t.phoneNotRegistered);
      return;
    }

    // In a real app, we would send an SMS with OTP
    // For now, we'll simulate it by setting a verification code in localStorage
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem(`verification_${phoneNumber}`, verificationCode);
    
    toast.success(t.verificationCodeSent + " " + verificationCode);
    setIsOtpVerification(true);
  };

  const handleOtpVerification = () => {
    const storedCode = localStorage.getItem(`verification_${phoneNumber}`);
    
    if (otp === storedCode) {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const userIndex = users.findIndex((u: any) => u.phoneNumber === phoneNumber);
      
      if (userIndex !== -1) {
        if (newPassword !== confirmNewPassword) {
          toast.error(t.passwordsDoNotMatch);
          return;
        }
        
        users[userIndex].password = newPassword;
        localStorage.setItem("users", JSON.stringify(users));
        localStorage.removeItem(`verification_${phoneNumber}`);
        
        toast.success(t.passwordResetSuccess);
        setIsForgotPassword(false);
        setIsOtpVerification(false);
        setIsLogin(true);
      }
    } else {
      toast.error(t.incorrectCode);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const resetAuthState = () => {
    setIsForgotPassword(false);
    setIsOtpVerification(false);
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isForgotPassword 
              ? t.resetPassword 
              : isOtpVerification 
                ? t.verifyCode 
                : isLogin 
                  ? t.loginToApp 
                  : t.register}
          </CardTitle>
          <CardDescription className="text-center">
            {t.appDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isForgotPassword && !isOtpVerification && (
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  {t.phoneNumber}
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}
            
            {isOtpVerification && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t.enterVerificationCode}
                  </label>
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    render={({ slots }) => (
                      <InputOTPGroup>
                        {slots.map((slot, index) => (
                          <InputOTPSlot key={index} index={index} {...slot} />
                        ))}
                      </InputOTPGroup>
                    )}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    {t.newPassword}
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmNewPassword" className="text-sm font-medium">
                    {t.confirmNewPassword}
                  </label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
              </>
            )}
            
            {!isForgotPassword && !isOtpVerification && (
              <>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    {t.phoneNumber}
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0XXXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    {t.password}
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="text-sm font-medium">
                        {t.confirmPassword}
                      </label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="firstName" className="text-sm font-medium">
                          {t.firstName}
                        </label>
                        <Input
                          id="firstName"
                          placeholder={t.firstNamePlaceholder}
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="lastName" className="text-sm font-medium">
                          {t.lastName}
                        </label>
                        <Input
                          id="lastName"
                          placeholder={t.lastNamePlaceholder}
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            
            <Button type="submit" className="w-full">
              {isForgotPassword 
                ? t.reset 
                : isOtpVerification 
                  ? t.confirm 
                  : isLogin 
                    ? t.login 
                    : t.register}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          {isForgotPassword || isOtpVerification ? (
            <Button
              variant="link"
              className="w-full"
              onClick={resetAuthState}
            >
              {t.backToLogin}
            </Button>
          ) : (
            <>
              <Button
                variant="link"
                className="w-full"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? t.noAccount
                  : t.alreadyHaveAccount}
              </Button>
              
              {isLogin && (
                <Button
                  variant="link"
                  className="w-full"
                  onClick={() => setIsForgotPassword(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  {t.forgotPassword}
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
