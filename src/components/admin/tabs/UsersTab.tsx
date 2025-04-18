
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
import { PenLine, Trash2 } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import { USER_STATUSES } from "@/lib/constants";

export function UsersTab() {
  const navigate = useNavigate();
  const { users, deleteUser, changeUserStatus, toggleShareholderStatus, isFounder } = useUsers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління користувачами</CardTitle>
        <CardDescription>Перегляд та модерацію користувачів платформи</CardDescription>
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
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{user.id}</td>
                    <td className="p-2">{user.firstName} {user.lastName}</td>
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
                          onClick={() => deleteUser(user.id)}
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
                    Немає зареєстрованих користувачів
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
