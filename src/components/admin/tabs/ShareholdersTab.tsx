
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SHAREHOLDER_TITLES } from "@/lib/constants";

export function ShareholdersTab() {
  const [shareholders, setShareholders] = useState<any[]>(() => {
    const storedData = localStorage.getItem("users");
    if (!storedData) return [];
    
    const users = JSON.parse(storedData);
    const shareholdersData = users.filter((user: any) => 
      user.isShareHolder || user.role === "shareholder"
    );
    
    // Calculate percentages based on shares
    const totalShares = shareholdersData.reduce(
      (sum: number, sh: any) => sum + (sh.shares || 0), 0
    );
    
    return shareholdersData.map((sh: any) => ({
      ...sh,
      percentage: totalShares > 0 ? ((sh.shares / totalShares) * 100).toFixed(2) : 0,
      shares: sh.shares || 10,
      title: sh.title || "Магнат",
      profit: sh.profit || 0
    }));
  });

  const changeShareholderTitle = (userId: string, newTitle: string) => {
    const updatedShareholders = shareholders.map(sh => {
      if (sh.id === userId) {
        return { ...sh, title: newTitle };
      }
      return sh;
    });
    
    setShareholders(updatedShareholders);
    
    // Update users storage
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const updatedUsers = storedUsers.map((user: any) => {
      if (user.id === userId) {
        return { ...user, title: newTitle };
      }
      return user;
    });
    
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success(`Титул акціонера змінено на "${newTitle}"`);
  };

  const updateSharesCount = (userId: string, sharesCount: number) => {
    if (isNaN(sharesCount) || sharesCount < 0) {
      toast.error("Кількість акцій повинна бути додатнім числом");
      return;
    }

    const updatedShareholders = shareholders.map(sh => {
      if (sh.id === userId) {
        return { ...sh, shares: sharesCount };
      }
      return sh;
    });
    
    // Recalculate percentages
    const totalShares = updatedShareholders.reduce(
      (sum, sh) => sum + (sh.shares || 0), 0
    );
    
    const shareholdersWithPercentage = updatedShareholders.map((sh) => ({
      ...sh,
      percentage: totalShares > 0 ? ((sh.shares / totalShares) * 100).toFixed(2) : 0
    }));
    
    setShareholders(shareholdersWithPercentage);
    
    // Update users storage
    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const updatedUsers = storedUsers.map((user: any) => {
      if (user.id === userId) {
        return { ...user, shares: sharesCount };
      }
      return user;
    });
    
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    toast.success("Кількість акцій оновлено");
  };

  return (
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
                <th className="text-left p-2">Титул</th>
                <th className="text-left p-2">Кількість акцій</th>
                <th className="text-left p-2">Частка (%)</th>
                <th className="text-left p-2">Прибуток (грн)</th>
                <th className="text-left p-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {shareholders.length > 0 ? (
                shareholders.map((shareholder) => (
                  <tr key={shareholder.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{shareholder.firstName} {shareholder.lastName}</td>
                    <td className="p-2">
                      <Select 
                        defaultValue={shareholder.title || "Магнат"} 
                        onValueChange={(value) => changeShareholderTitle(shareholder.id, value)}
                      >
                        <SelectTrigger className="w-[150px]">
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
                    <td className="p-2">
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          className="w-24"
                          min="1"
                          value={shareholder.shares || 10}
                          onChange={(e) => updateSharesCount(shareholder.id, parseInt(e.target.value))}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateSharesCount(shareholder.id, (shareholder.shares || 10) + 1)}
                        >
                          +
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => updateSharesCount(
                            shareholder.id, 
                            Math.max(1, (shareholder.shares || 10) - 1)
                          )}
                          disabled={(shareholder.shares || 10) <= 1}
                        >
                          -
                        </Button>
                      </div>
                    </td>
                    <td className="p-2">{shareholder.percentage}%</td>
                    <td className="p-2">{shareholder.profit?.toFixed(2) || "0.00"} грн</td>
                    <td className="p-2">
                      <Button variant="outline" size="sm" className="mr-2">
                        <PenLine className="h-4 w-4 mr-1" /> Деталі
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-2 text-center text-muted-foreground">
                    Немає зареєстрованих акціонерів
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
