
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

// Схема для форми реєстрації
const registerFormSchema = z.object({
  name: z.string().min(2, "Ім'я повинно містити щонайменше 2 символи"),
  email: z.string().email("Невірний формат електронної пошти"),
  password: z.string().min(6, "Пароль повинен містити щонайменше 6 символів"),
  profession: z.string().min(1, "Оберіть свій тип професійної діяльності")
});

// Схема для форми входу
const loginFormSchema = z.object({
  email: z.string().email("Невірний формат електронної пошти"),
  password: z.string().min(1, "Введіть пароль")
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
      name: "",
      email: "",
      password: "",
      profession: "",
    },
  });

  // Ініціалізація форми входу
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
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
      users.push({...data, id: Date.now().toString(), isAdmin: false});
      localStorage.setItem("users", JSON.stringify(users));
      
      // Імітуємо "сесію" користувача
      localStorage.setItem("currentUser", JSON.stringify({...data, id: Date.now().toString(), isAdmin: false}));
      
      toast.success("Реєстрація успішна!");
      setIsLoading(false);
      navigate("/profile/" + Date.now().toString());
    }, 1500);
  }

  // Обробник для входу
  function onLoginSubmit(data: LoginFormValues) {
    setIsLoading(true);
    
    // Імітація запиту до сервера
    setTimeout(() => {
      console.log("Вхід:", data);
      
      // Перевіряємо чи є адмін користувач
      if (data.email === "admin@visualpro.com" && data.password === "admin123") {
        const adminUser = {
          id: "admin",
          name: "Адміністратор",
          email: data.email,
          isAdmin: true
        };
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        toast.success("Ви увійшли як адміністратор!");
        setIsLoading(false);
        navigate("/admin");
        return;
      }
      
      // Демонстраційна перевірка користувача
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const user = users.find((u: any) => u.email === data.email);
      
      if (user && user.password === data.password) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        toast.success("Вхід успішний!");
        navigate("/profile/" + user.id);
      } else {
        toast.error("Невірна електронна пошта або пароль");
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
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Електронна пошта</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
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
                  Для входу в кабінет адміністратора:<br/> 
                  Email: admin@visualpro.com<br/>
                  Пароль: admin123
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
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Повне ім'я</FormLabel>
                          <FormControl>
                            <Input placeholder="Іван Петренко" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Електронна пошта</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Професійна діяльність</FormLabel>
                          <FormControl>
                            <select 
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                              {...field}
                            >
                              <option value="">Оберіть тип діяльності</option>
                              <option value="Photo">Фотограф</option>
                              <option value="Video">Відеограф</option>
                              <option value="Music">Музикант</option>
                              <option value="Event">Ведучий заходів</option>
                              <option value="Pyro">Піротехнік</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
