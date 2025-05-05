
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function LogoSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem("customLogo") || null);
  const [logoText, setLogoText] = useState<string>(localStorage.getItem("siteName") || "Спільнота B&C");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load the site name from site_settings table when component mounts
  useEffect(() => {
    async function loadSiteName() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("id", "site-name")
          .single();
          
        if (error) {
          console.error("Error loading site name:", error);
          return;
        }
        
        if (data) {
          setLogoText(data.value);
          // Also update localStorage for components that might still be using it
          localStorage.setItem("siteName", data.value);
        }
      } catch (error) {
        console.error("Failed to load site name:", error);
      }
    }
    
    loadSiteName();
  }, []);

  const handleSaveLogoText = async () => {
    setIsLoading(true);
    
    try {
      // Update in Supabase
      const { error } = await supabase
        .from("site_settings")
        .upsert({ id: "site-name", value: logoText, updated_at: new Date().toISOString() });
      
      if (error) {
        console.error("Error saving site name to Supabase:", error);
        toast.error("Помилка збереження назви сайту");
        
        // If Supabase fails, at least update localStorage
        localStorage.setItem("siteName", logoText);
      } else {
        // Update localStorage too for compatibility
        localStorage.setItem("siteName", logoText);
        toast.success("Назву сайту оновлено");
      }
    } catch (error) {
      console.error("Failed to save site name:", error);
      toast.error("Помилка збереження назви сайту");
      
      // Fallback to localStorage
      localStorage.setItem("siteName", logoText);
    } finally {
      setIsLoading(false);
    }
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
                  className="h-24 object-contain"
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
          <Button onClick={handleSaveLogoText} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" /> {isLoading ? 'Зберігаємо...' : 'Зберегти назву'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
