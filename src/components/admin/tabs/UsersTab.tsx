
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PenLine, Trash2, AlertTriangle, Filter } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { USER_STATUSES } from "@/lib/constants";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function UsersTab() {
  const navigate = useNavigate();
  const { users, deleteUser, changeUserStatus, toggleShareholderStatus, isFounder } = useUsers();
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuspicious, setShowSuspicious] = useState(false);

  // Функція для визначення підозрілих акаунтів
  const isSuspiciousAccount = (user: any) => {
    // Приклади критеріїв для виявлення рекламних/підозрілих акаунтів:
    // 1. Відсутнє ім'я
    const noName = !user.firstName && !user.lastName && !user.full_name;
    
    // 2. Відсутня активність (немає постів, коментарів, тощо)
    const noActivity = !user.posts || user.posts.length === 0;
    
    // 3. Профіль створено нещодавно (менше 24 годин)
    const isNewAccount = user.created_at && 
      (new Date().getTime() - new Date(user.created_at).getTime()) < 24 * 60 * 60 * 1000;
      
    // 4. Містить підозрілі слова в імені або описі
    const suspiciousWords = ['реклама', 'знижка', 'акція', 'продаж', 'купити', 'sale', 'discount'];
    const hasSuspiciousWords = 
      (user.firstName && suspiciousWords.some(word => user.firstName.toLowerCase().includes(word))) ||
      (user.lastName && suspiciousWords.some(word => user.lastName.toLowerCase().includes(word))) ||
      (user.full_name && suspiciousWords.some(word => user.full_name.toLowerCase().includes(word))) ||
      (user.bio && suspiciousWords.some(word => user.bio.toLowerCase().includes(word)));
      
    return noName || noActivity || isNewAccount || hasSuspiciousWords;
  };

  // Фільтрація та пошук користувачів
  const filteredUsers = users.filter(user => {
    // Пошук за текстом
    const matchesSearch = searchTerm 
      ? (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.phoneNumber?.includes(searchTerm) ||
         user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    
    // Фільтр підозрілих акаунтів
    const matchesSuspicious = showSuspicious ? isSuspiciousAccount(user) : true;
    
    // Показувати користувача, якщо відповідає всім активним фільтрам
    return !showSuspicious 
      ? matchesSearch 
      : (matchesSearch && matchesSuspicious);
  });

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteUser(userToDelete);
      setUserToDelete(null);
      toast.success("Користувача успішно видалено");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління користувачами</CardTitle>
        <CardDescription>Перегляд та модерацію користувачів платформи</CardDescription>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Input
              placeholder="Пошук за ім'ям або номером телефону"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="suspicious-filter"
                checked={showSuspicious}
                onCheckedChange={setShowSuspicious}
              />
              <Label htmlFor="suspicious-filter" className="flex items-center cursor-pointer">
                <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                Підозрілі акаунти
              </Label>
            </div>
          </div>
        </div>
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
                <th className="text-left p-2">Акціонер</th>
                <th className="text-left p-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`border-b hover:bg-muted/50 ${isSuspiciousAccount(user) ? 'bg-amber-50' : ''}`}>
                    <td className="p-2">{user.id}</td>
                    <td className="p-2">{user.firstName} {user.lastName || user.full_name}</td>
                    <td className="p-2">
                      {user.phoneNumber}
                      {user.phoneNumber === "0507068007" && (
                        <Badge variant="outline" className="ml-2">Засновник</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      {isFounder || (user.role !== "admin-founder" && user.phoneNumber !== "0507068007") ? (
                        <Select 
                          defaultValue={user.status || "Звичайний користувач"} 
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
                                  // Обмеження для зміни статусу засновника
                                  (!isFounder && 
                                  ((status === "Адміністратор-засновник" && user.phoneNumber !== "0507068007") || 
                                  ((user.role === "admin-founder" || user.phoneNumber === "0507068007") && status !== user.status)))
                                }
                              >
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge>{user.status || "Адміністратор-засновник"}</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`shareholder-switch-${user.id}`}
                          checked={user.isShareHolder || false}
                          onCheckedChange={(checked) => toggleShareholderStatus(user.id, checked)}
                          disabled={!isFounder && (user.role === "admin-founder" || user.phoneNumber === "0507068007")}
                        />
                        <Label htmlFor={`shareholder-switch-${user.id}`}>
                          {user.isShareHolder ? "Так" : "Ні"}
                        </Label>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/profile/${user.id}`)}>
                          <PenLine className="h-4 w-4 mr-1" /> Профіль
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => setUserToDelete(user.id)}
                          disabled={user.role === "admin-founder" || user.phoneNumber === "0507068007"}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Видалити
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-2 text-center text-muted-foreground">
                    {searchTerm ? "Немає користувачів, що відповідають критеріям пошуку" : "Немає зареєстрованих користувачів"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      {/* Діалог підтвердження видалення */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалення користувача</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити цього користувача? Ця дія не може бути скасована.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
