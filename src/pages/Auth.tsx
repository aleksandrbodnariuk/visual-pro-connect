
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !password) {
      toast.error("Введіть номер телефону та пароль");
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
      toast.success("Вхід успішний");
      
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
        toast.success("Вхід як Адміністратор-засновник");
        navigate("/admin");
      } else {
        toast.error("Неправильний номер телефону або пароль");
      }
    }
  };
  
  const handleRegister = () => {
    if (password !== confirmPassword) {
      toast.error("Паролі не співпадають");
      return;
    }
    
    if (!firstName || !lastName) {
      toast.error("Введіть ім'я та прізвище");
      return;
    }
    
    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const userExists = users.some((u: any) => u.phoneNumber === phoneNumber);
    
    if (userExists) {
      toast.error("Користувач з таким номером телефону вже зареєстрований");
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
      following: []
    };
    
    localStorage.setItem("users", JSON.stringify([...users, newUser]));
    localStorage.setItem("currentUser", JSON.stringify(newUser));
    
    toast.success("Реєстрація успішна");
    navigate("/");
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? "Увійти на платформу" : "Зареєструватися"}
          </CardTitle>
          <CardDescription className="text-center">
            Visual Pro Connect - соціальна мережа для творчих професіоналів
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Номер телефону
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
                Пароль
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
                    Підтвердження паролю
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
                      Ім'я
                    </label>
                    <Input
                      id="firstName"
                      placeholder="Олександр"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Прізвище
                    </label>
                    <Input
                      id="lastName"
                      placeholder="Петренко"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
            
            <Button type="submit" className="w-full">
              {isLogin ? "Увійти" : "Зареєструватися"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin
              ? "Не маєте акаунту? Зареєструватися"
              : "Вже маєте акаунт? Увійти"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
