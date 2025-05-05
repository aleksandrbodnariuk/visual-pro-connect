
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";

export function LogoSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem("customLogo") || null);
  const [logoText, setLogoText] = useState<string>(localStorage.getItem("siteName") || "Спільнота B&C");

  const handleSaveLogoText = async () => {
    localStorage.setItem("siteName", logoText);
    
    // We'll store it only in localStorage since we don't have a site_settings table
    // If in the future you need to store this in the database,
    // first create a site_settings table in Supabase
    
    toast.success('Назву сайту оновлено');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Налаштування логотипу</CardTitle>
        <CardDescription>Змініть назву сайту</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Поточний логотип сайту</Label>
          <div className="flex justify-center mb-4">
            <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Логотип сайту" 
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full flex flex-col items-center justify-center text-gray-400 border border-dashed">
                  <span className="text-xs">Логотип не налаштовано</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Label htmlFor="logo-text">Назва сайту</Label>
          <Input 
            id="logo-text"
            value={logoText}
            onChange={(e) => setLogoText(e.target.value)}
            placeholder="Введіть назву сайту"
          />
          <Button onClick={handleSaveLogoText}>
            <Save className="mr-2 h-4 w-4" /> Зберегти назву
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
