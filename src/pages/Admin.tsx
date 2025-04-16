import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  PenLine, 
  Trash2, 
  Calendar, 
  Users, 
  FileText, 
  Image, 
  BarChart3, 
  UserCheck, 
  DollarSign,
  Crown
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const USER_STATUSES = [
  "Учасник",
  "Активний учасник",
  "Клієнт",
  "Партнер",
  "Представник",
  "Акціонер",
  "Модератор",
  "Адміністратор",
  "Адміністратор-засновник"
];

const SHAREHOLDER_TITLES = [
  "Магнат",
  "Барон",
  "Граф",
  "Маркіз",
  "Лорд",
  "Герцог",
  "Імператор"
];

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [newOrderAmount, setNewOrderAmount] = useState("");
  const [newOrderDescription, setNewOrderDescription] = useState("");
  const [stockPrice, setStockPrice] = useState("1000");
  const [stockExchangeItems, setStockExchangeItems] = useState<any[]>([]);
  
  const navigate = useNavigate();
  
  const stats = [
    { title: "Користувачі", value: "0", icon: Users, color: "bg-blue-100 text-blue-700" },
    { title: "Акціонери", value: "0", icon: Crown, color: "bg-amber-100 text-amber-700" },
    { title: "Замовлення", value: "0", icon: DollarSign, color: "bg-green-100 text-green-700" },
    { title: "Ціна акції", value: `${stockPrice} грн`, icon: Image, color: "bg-purple-100 text-purple-700" },
  ];
  
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!currentUser || !(currentUser.isAdmin || currentUser.role === "admin" || currentUser.role === "admin-founder")) {
      toast.error("Доступ заборонено: Необхідні права адміністратора");
      navigate("/auth");
      return;
    }
    
    setIsAdmin(true);
    setIsFounder(currentUser.role === "admin-founder");
    
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    setUsers(storedUsers);
    
    const shareholdersData = storedUsers.filter((user: any) => 
      user.status === "Акціонер" || user.role === "shareholder"
    );
    
    const initializedShareholders = shareholdersData.map((shareholder: any) => {
      if (!shareholder.shares) {
        return {
          ...shareholder,
          shares: 10,
          percentage: 0,
          title: shareholder.title || "Магнат",
          profit: 0
        };
      }
      return shareholder;
    });
    
    const totalShares = initializedShareholders.reduce(
      (sum: number, sh: any) => sum + (sh.shares || 0), 0
    );
    
    const shareholdersWithPercentage = initializedShareholders.map((sh: any) => ({
      ...sh,
      percentage: totalShares > 0 ? ((sh.shares / totalShares) * 100).toFixed(2) : 0
    }));
    
    setShareholders(shareholdersWithPercentage);
    
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    setOrders(storedOrders);
    
    const storedPosts = JSON.parse(localStorage.getItem("posts") || "[]");
    setPosts(storedPosts || [
      { id: "1", author: "Олександр Петренко", title: "Нова фотосесія", status: "Активний" },
      { id: "2", author: "Марія Коваленко", title: "Відеомонтаж кліпу", status: "Активний" },
      { id: "3", author: "Ігор Мельник", title: "Музичний реліз", status: "На розгляді" }
    ]);
    
    const storedStockExchange = JSON.parse(localStorage.getItem("stockExchange") || "[]");
    setStockExchangeItems(storedStockExchange);
    
    const storedStockPrice = localStorage.getItem("stockPrice");
    if (storedStockPrice) {
      setStockPrice(storedStockPrice);
    } else {
      localStorage.setItem("stockPrice", stockPrice);
    }
  }, [navigate, stockPrice]);
  
  const updatedStats = [
    { title: "Користувачі", value: users.length.toString(), icon: Users, color: "bg-blue-100 text-blue-700" },
    { title: "Акціонери", value: shareholders.length.toString(), icon: Crown, color: "bg-amber-100 text-amber-700" },
    { title: "Замовлення", value: orders.length.toString(), icon: DollarSign, color: "bg-green-100 text-green-700" },
    { title: "Ціна акції", value: `${stockPrice} грн`, icon: Image, color: "bg-purple-100 text-purple-700" },
  ];
  
  const deleteUser = (userId: string) => {
    const userToDelete = users.find(user => user.id === userId);
    if (userToDelete && userToDelete.role === "admin-founder") {
      toast.error("Неможливо видалити Адміністратора-засновника");
      return;
    }
    
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    const updatedShareholders = shareholders.filter(sh => sh.id !== userId);
    setShareholders(updatedShareholders);
    
    toast.success("Користувача видалено");
  };
  
  const changeUserStatus = (userId: string, newStatus: string) => {
    const userToUpdate = users.find(user => user.id === userId);
    if (userToUpdate && userToUpdate.role === "admin-founder" && !isFounder) {
      toast.error("Тільки Адміністратор-засновник може змінювати свій статус");
      return;
    }
    
    let newRole = "user";
    if (newStatus === "Адміністратор" || newStatus === "Адміністратор-засновник") {
      newRole = newStatus === "Адміністратор-засновник" ? "admin-founder" : "admin";
    } else if (newStatus === "Модератор") {
      newRole = "moderator";
    } else if (newStatus === "Акціонер") {
      newRole = "shareholder";
    } else if (newStatus === "Представник") {
      newRole = "representative";
    }
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { ...user, status: newStatus, role: newRole };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    if (newStatus === "Акціонер") {
      const user = updatedUsers.find(u => u.id === userId);
      if (user) {
        const newShareholder = {
          ...user,
          shares: 10,
          percentage: 0,
          title: "Магнат",
          profit: 0
        };
        
        const updatedShareholders = [...shareholders.filter(sh => sh.id !== userId), newShareholder];
        
        const totalShares = updatedShareholders.reduce(
          (sum: number, sh: any) => sum + (sh.shares || 0), 0
        );
        
        const shareholdersWithPercentage = updatedShareholders.map((sh: any) => ({
          ...sh,
          percentage: totalShares > 0 ? ((sh.shares / totalShares) * 100).toFixed(2) : 0
        }));
        
        setShareholders(shareholdersWithPercentage);
      }
    } else if (newStatus !== "Акціонер") {
      const updatedShareholders = shareholders.filter(sh => sh.id !== userId);
      setShareholders(updatedShareholders);
    }
    
    toast.success(`Статус користувача змінено на "${newStatus}"`);
  };
  
  const changeShareholderTitle = (userId: string, newTitle: string) => {
    const updatedShareholders = shareholders.map(sh => {
      if (sh.id === userId) {
        return { ...sh, title: newTitle };
      }
      return sh;
    });
    
    setShareholders(updatedShareholders);
    
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return { ...user, title: newTitle };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    
    toast.success(`Титул акціонера змінено на "${newTitle}"`);
  };
  
  const addNewOrder = () => {
    if (!newOrderAmount || isNaN(parseFloat(newOrderAmount)) || parseFloat(newOrderAmount) <= 0) {
      toast.error("Введіть коректну суму замовлення");
      return;
    }
    
    if (!newOrderDescription.trim()) {
      toast.error("Введіть опис замовлення");
      return;
    }
    
    const amount = parseFloat(newOrderAmount);
    const orderId = Date.now().toString();
    
    const newOrder = {
      id: orderId,
      amount,
      description: newOrderDescription,
      date: new Date().toISOString(),
      status: "Завершено"
    };
    
    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);
    localStorage.setItem("orders", JSON.stringify(updatedOrders));
    
    const profitToDistribute = amount * 0.45;
    
    if (shareholders.length > 0) {
      const updatedShareholders = shareholders.map(sh => {
        const sharePortion = (parseFloat(sh.percentage) / 100) * profitToDistribute;
        return {
          ...sh,
          profit: (sh.profit || 0) + sharePortion
        };
      });
      
      setShareholders(updatedShareholders);
      
      const updatedUsers = users.map(user => {
        const shareholderData = updatedShareholders.find(sh => sh.id === user.id);
        if (shareholderData) {
          return { ...user, profit: shareholderData.profit };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    }
    
    setNewOrderAmount("");
    setNewOrderDescription("");
    
    toast.success("Замовлення додано і прибуток розподілено між акціонерами");
  };
  
  const updateStockPrice = () => {
    localStorage.setItem("stockPrice", stockPrice);
    toast.success(`Ціну акції оновлено: ${stockPrice} грн`);
  };
  
  const deletePost = (postId: string) => {
    const updatedPosts = posts.filter(post => post.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    toast.success("Публікацію видалено");
  };
  
  if (!isAdmin) {
    return <div className="container py-16 text-center">Перевірка прав доступу...</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Панель адміністратора</h1>
          <p className="text-muted-foreground">Управління сайтом Visual Pro Connect</p>
          
          {isFounder && (
            <Badge variant="secondary" className="mt-2">
              Адміністратор-засновник
            </Badge>
          )}
        </div>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {updatedStats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Користувачі</TabsTrigger>
            <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
            <TabsTrigger value="orders">Замовлення</TabsTrigger>
            <TabsTrigger value="stock-exchange">Ринок акцій</TabsTrigger>
            <TabsTrigger value="posts">Публікації</TabsTrigger>
            <TabsTrigger value="settings">Налаштування</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Управління користувачами</CardTitle>
                <CardDescription>Перегляд та модерація користувачів платформи</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Ім'я</th>
                        <th className="text-left p-2">Телефон</th>
                        <th className="text-left p-2">Статус</th>
                        <th className="text-left p-2">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{user.id}</td>
                            <td className="p-2">{user.firstName} {user.lastName}</td>
                            <td className="p-2">{user.phoneNumber}</td>
                            <td className="p-2">
                              {isFounder || user.role !== "admin-founder" ? (
                                <Select 
                                  defaultValue={user.status} 
                                  onValueChange={(value) => changeUserStatus(user.id, value)}
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Статус" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {USER_STATUSES.map((status) => (
                                      <SelectItem 
                                        key={status} 
                                        value={status}
                                        disabled={
                                          !isFounder && 
                                          (status === "Адміністратор-засновник" || 
                                          (user.role === "admin-founder" && status !== user.status))
                                        }
                                      >
                                        {status}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge>{user.status}</Badge>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
                                  <PenLine className="h-4 w-4 mr-1" /> Профіль
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => deleteUser(user.id)}
                                  disabled={user.role === "admin-founder"}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Видалити
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-muted-foreground">
                            Немає зареєстрованих користувачів
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shareholders">
            <Card>
              <CardHeader>
                <CardTitle>Управління акціонерами</CardTitle>
                <CardDescription>Перегляд акціонерів та розподіл прибутку</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Акціонер</th>
                        <th className="text-left p-2">Кількість акцій</th>
                        <th className="text-left p-2">Відсоток</th>
                        <th className="text-left p-2">Титул</th>
                        <th className="text-left p-2">Прибуток</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shareholders.length > 0 ? (
                        shareholders.map((shareholder) => (
                          <tr key={shareholder.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{shareholder.firstName} {shareholder.lastName}</td>
                            <td className="p-2">{shareholder.shares}</td>
                            <td className="p-2">{shareholder.percentage}%</td>
                            <td className="p-2">
                              <Select 
                                defaultValue={shareholder.title || "Магнат"} 
                                onValueChange={(value) => changeShareholderTitle(shareholder.id, value)}
                                disabled={!isFounder}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Титул" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SHAREHOLDER_TITLES.map((title) => (
                                    <SelectItem key={title} value={title}>
                                      {title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">{shareholder.profit?.toFixed(2) || "0"} грн</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-muted-foreground">
                            Немає акціонерів
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Управління замовленнями</CardTitle>
                <CardDescription>Додавання замовлень і розподіл прибутку між акціонерами</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                      <label className="text-sm font-medium" htmlFor="order-amount">Сума замовлення (грн)</label>
                      <Input 
                        id="order-amount" 
                        type="number" 
                        value={newOrderAmount} 
                        onChange={(e) => setNewOrderAmount(e.target.value)} 
                        placeholder="5000"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium" htmlFor="order-description">Опис замовлення</label>
                      <Input 
                        id="order-description" 
                        value={newOrderDescription}
                        onChange={(e) => setNewOrderDescription(e.target.value)}
                        placeholder="Весільна фотосесія"
                      />
                    </div>
                  </div>
                  <Button onClick={addNewOrder}>Додати замовлення і розподілити прибуток</Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Дата</th>
                        <th className="text-left p-2">Опис</th>
                        <th className="text-left p-2">Сума (грн)</th>
                        <th className="text-left p-2">Прибуток акціонерів (45%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length > 0 ? (
                        orders.map((order) => (
                          <tr key={order.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">{order.id}</td>
                            <td className="p-2">{new Date(order.date).toLocaleDateString()}</td>
                            <td className="p-2">{order.description}</td>
                            <td className="p-2">{order.amount.toFixed(2)}</td>
                            <td className="p-2">{(order.amount * 0.45).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-muted-foreground">
                            Немає замовлень
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="stock-exchange">
            <Card>
              <CardHeader>
                <CardTitle>Ринок акцій</CardTitle>
                <CardDescription>Управління продажем акцій між акціонерами</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-1">
                      <label className="text-sm font-medium" htmlFor="stock-price">Поточна ціна акції (грн)</label>
                      <div className="flex">
                        <Input 
                          id="stock-price" 
                          type="number" 
                          value={stockPrice} 
                          onChange={(e) => setStockPrice(e.target.value)} 
                          placeholder="1000"
                        />
                        <Button className="ml-2" onClick={updateStockPrice}>Оновити</Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ця ціна є рекомендованою для акціонерів при продажу акцій
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="font-semibold mb-2">Інформація про ринок акцій</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Ринок акцій доступний тільки для акціонерів</li>
                    <li>• Акціонери можуть виставляти свої акції на умовний продаж</li>
                    <li>• Домовленість про купівлю-продаж відбувається між акціонерами</li>
                    <li>• Адміністратор встановлює рекомендовану ціну акцій</li>
                    <li>• Адміністратор-засновник може змінювати власників акцій після угоди</li>
                  </ul>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Продавець</th>
                        <th className="text-left p-2">Кількість акцій</th>
                        <th className="text-left p-2">Ціна за акцію</th>
                        <th className="text-left p-2">Сума</th>
                        <th className="text-left p-2">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockExchangeItems.length > 0 ? (
                        stockExchangeItems.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2">{item.sellerName}</td>
                            <td className="p-2">{item.sharesCount}</td>
                            <td className="p-2">{item.pricePerShare}</td>
                            <td className="p-2">{(item.sharesCount * item.pricePerShare).toFixed(2)}</td>
                            <td className="p-2">
                              <Badge variant={item.status === "Активна" ? "secondary" : "outline"}>
                                {item.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-muted-foreground">
                            Немає активних пропозицій на продаж акцій
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="posts">
            <Card>
              <CardHeader>
                <CardTitle>Управління публікаціями</CardTitle>
                <CardDescription>Модерація контенту на платформі</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Автор</th>
                        <th className="text-left p-2">Назва</th>
                        <th className="text-left p-2">Статус</th>
                        <th className="text-left p-2">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post) => (
                        <tr key={post.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{post.id}</td>
                          <td className="p-2">{post.author}</td>
                          <td className="p-2">{post.title}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              post.status === "Активний" ? "bg-green-100 text-green-800" : 
                              "bg-yellow-100 text-yellow-800"
                            }`}>
                              {post.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <PenLine className="h-4 w-4 mr-1" /> Редагувати
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => deletePost(post.id)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Видалити
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Налаштування сайту</CardTitle>
                <CardDescription>Управління основними параметрами платформи</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="site-name">Назва сайту</label>
                    <Input id="site-name" defaultValue="Visual Pro Connect" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="site-description">Опис сайту</label>
                    <Textarea 
                      id="site-description" 
                      defaultValue="Соціальна мережа для фотографів, відеографів, музикантів, ведучих та піротехніків."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium" htmlFor="contact-email">Контактний телефон</label>
                    <Input id="contact-phone" defaultValue="+380991234567" />
                  </div>
                </div>
                
                <Button type="button" onClick={() => toast.success("Налаштування збережено")}>
                  Зберегти налаштування
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
