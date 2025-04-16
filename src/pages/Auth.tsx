import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { 
  UserRoundCheck, 
  Phone, 
  MessageCircleMore, 
  Instagram, 
  Facebook, 
  Smartphone 
} from "lucide-react";

// Схема для форми реєстрації
const registerFormSchema = z.object({
  firstName: z.string().min(2, "Ім'я повинно містити щонайменше 2 символи"),
  lastName: z.string().min(2, "Прізвище повинно містити щонайменше 2 символи"),
  phoneNumber: z.string().min(10, "Номер телефону повинен містити щонайменше 10 цифр"),
  viber: z.string().optional(),
  tiktok: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
});

// Схема для форми входу
const loginFormSchema = z.object({
  phoneNumber: z.string().min(10, "Введіть коректний номер телефону")
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Ініціалізація форми реєстрації
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      viber: "",
      tiktok: "",
      instagram: "",
      facebook: "",
    },
  });

  // Ініціалізація форми входу
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  // Обробник для реєстрації
  function onRegisterSubmit(data: RegisterFormValues) {
    setIsLoading(true);
    
    // Імітація запиту до сервера
    setTimeout(() => {
      console.log("Реєстрація:", data);
      
      // Зберігаємо дані користувача в localStorage (для демонстрації)
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const userId = Date.now().toString();
      
      const newUser = {
        ...data,
        id: userId,
        status: "Учасник",
        role: "user",
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));
      
      // Імітуємо "сесію" користувача
      localStorage.setItem("currentUser", JSON.stringify(newUser));
      
      toast.success("Реєстрація успішна! Ваш статус: Учасник");
      setIsLoading(false);
      navigate("/profile/" + userId);
    }, 1500);
  }

  // Обробник для входу
  function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    
    // Імітація запиту до сервера
    setTimeout(() => {
      console.log("Вхід:", data);
      
      // Перевіряємо чи є адмін користувач
      if (data.phoneNumber === "0507068007") {
        const adminUser = {
          id: "admin",
          firstName: "Олександр",
          lastName: "Боднарюк",
          phoneNumber: data.phoneNumber,
          role: "admin-founder",
          status: "Адміністратор-засновник",
          isAdmin: true
        };
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        toast.success("Ви увійшли як Адміністратор-засновник!");
        setIsLoading(false);
        navigate("/admin");
        return;
      }
      
      // Демонстраційна перевірка користувача
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find((u: any) => u.phoneNumber === data.phoneNumber);
      
      if (user) {
        // Оновлюємо час останньої активності
        user.lastActive = new Date().toISOString();
        localStorage.setItem("currentUser", JSON.stringify(user));
        
        // Оновлюємо користувача в списку користувачів
        const updatedUsers = users.map((u: any) => 
          u.id === user.id ? user : u
        );
        localStorage.setItem("users", JSON.stringify(updatedUsers));
        
        toast.success(`Вхід успішний! Ваш статус: ${user.status}`);
        
        if (user.role === "admin" || user.role === "admin-founder") {
          navigate("/admin");
        } else {
          navigate("/profile/" + user.id);
        }
      } else {
        toast.error("Користувача з таким номером телефону не знайдено");
      }
      
      setIsLoading(false);
    }, 1500);
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container flex items-center justify-center py-16">
        <Tabs defaultValue="login" className="w-full max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Вхід</TabsTrigger>
            <TabsTrigger value="register">Реєстрація</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Вхід в обліковий запис</CardTitle>
                <CardDescription>
                  Увійдіть до свого облікового запису, щоб отримати доступ до всіх функцій.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Номер телефону</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                              </span>
                              <Input 
                                className="rounded-l-none" 
                                placeholder="0671234567" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Обробка..." : "Увійти"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <p className="text-sm text-muted-foreground">
                  Для входу як Адміністратор-засновник:<br/> 
                  Номер телефону: 0507068007
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Створити обліковий запис</CardTitle>
                <CardDescription>
                  Зареєструйтеся, щоб почати користуватися усіма функціями Visual Pro Connect.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ім'я</FormLabel>
                          <FormControl>
                            <Input placeholder="Іван" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Прізвище</FormLabel>
                          <FormControl>
                            <Input placeholder="Петренко" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Номер телефону</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                              </span>
                              <Input 
                                className="rounded-l-none" 
                                placeholder="0671234567" 
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Соціальні мережі (необов'язково)</h3>
                      
                      <FormField
                        control={registerForm.control}
                        name="viber"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 bg-purple-100 text-purple-600 border border-r-0 border-input rounded-l-md">
                                  <MessageCircleMore className="h-4 w-4" />
                                </span>
                                <Input 
                                  className="rounded-l-none" 
                                  placeholder="Viber" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="tiktok"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-100 text-black border border-r-0 border-input rounded-l-md">
                                  <Smartphone className="h-4 w-4" />
                                </span>
                                <Input 
                                  className="rounded-l-none" 
                                  placeholder="TikTok" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 bg-pink-100 text-pink-600 border border-r-0 border-input rounded-l-md">
                                  <Instagram className="h-4 w-4" />
                                </span>
                                <Input 
                                  className="rounded-l-none" 
                                  placeholder="Instagram" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="facebook"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex">
                                <span className="inline-flex items-center px-3 bg-blue-100 text-blue-600 border border-r-0 border-input rounded-l-md">
                                  <Facebook className="h-4 w-4" />
                                </span>
                                <Input 
                                  className="rounded-l-none" 
                                  placeholder="Facebook" 
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Обробка..." : "Зареєструватися"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
