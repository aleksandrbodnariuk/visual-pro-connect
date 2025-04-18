
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserRound, Upload, Trash2, Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PortfolioManager } from "./PortfolioManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/components/search/SearchCategories";

interface ProfileEditorProps {
  user: any;
  onUpdate: () => void;
}

export function ProfileEditor({ user, onUpdate }: ProfileEditorProps) {
  const [country, setCountry] = useState(user?.country || "");
  const [city, setCity] = useState(user?.city || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string | null>(null);
  const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(user?.categories || []);

  useEffect(() => {
    if (user) {
      setCountry(user.country || "");
      setCity(user.city || "");
      setAvatarUrl(user.avatar_url || null);
      setSelectedCategories(user.categories || []);
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      setIsSaving(true);
      
      // Спроба оновлення в Supabase
      try {
        const { error } = await supabase
          .from("users")
          .update({
            country,
            city,
            categories: selectedCategories
          })
          .eq("id", user.id);

        if (error) throw error;
      } catch (supabaseError) {
        console.warn("Не вдалося оновити профіль в Supabase:", supabaseError);
        
        // Оновлюємо дані в локальному сховищі
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        if (currentUser && currentUser.id === user.id) {
          const updatedUser = {
            ...currentUser,
            country,
            city,
            categories: selectedCategories
          };
          localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        }
        
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        const updatedUsers = storedUsers.map((u: any) => {
          if (u.id === user.id) {
            return {
              ...u,
              country,
              city,
              categories: selectedCategories
            };
          }
          return u;
        });
        localStorage.setItem("users", JSON.stringify(updatedUsers));
      }

      toast.success("Профіль оновлено");
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при оновленні профілю");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAvatarDialog = () => {
    setTempAvatarUrl(avatarUrl);
    setTempAvatarFile(null);
    setAvatarDialogOpen(true);
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    setTempAvatarFile(file);

    // Створюємо попередній перегляд файлу
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    try {
      setIsUploading(true);
      
      if (tempAvatarFile) {
        // Спроба завантаження в Supabase
        try {
          const fileExt = tempAvatarFile.name.split(".").pop();
          const filePath = `${user.id}/avatar.${fileExt}`;

          // Видаляємо старий аватар, якщо він існує
          if (avatarUrl) {
            try {
              const oldAvatarPath = avatarUrl.split("/").pop();
              if (oldAvatarPath) {
                await supabase.storage
                  .from("avatars")
                  .remove([`${user.id}/${oldAvatarPath}`]);
              }
            } catch (removeError) {
              console.warn("Не вдалося видалити попередній аватар", removeError);
            }
          }

          // Завантажуємо новий аватар
          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, tempAvatarFile, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

          const newAvatarUrl = urlData.publicUrl;
          setAvatarUrl(newAvatarUrl);

          // Оновлюємо посилання в базі даних
          const { error: updateError } = await supabase
            .from("users")
            .update({ avatar_url: newAvatarUrl })
            .eq("id", user.id);

          if (updateError) throw updateError;
        } catch (supabaseError) {
          console.warn("Не вдалося завантажити аватар в Supabase:", supabaseError);
          
          // Альтернативне рішення для локального сховища
          const reader = new FileReader();
          reader.onloadend = () => {
            const newAvatarUrl = reader.result as string;
            setAvatarUrl(newAvatarUrl);
            
            // Оновлюємо дані в локальному сховищі
            const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
            if (currentUser && currentUser.id === user.id) {
              currentUser.avatarUrl = newAvatarUrl;
              localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }
            
            const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
            const updatedUsers = storedUsers.map((u: any) => {
              if (u.id === user.id) {
                return { ...u, avatarUrl: newAvatarUrl };
              }
              return u;
            });
            localStorage.setItem("users", JSON.stringify(updatedUsers));
          };
          reader.readAsDataURL(tempAvatarFile);
        }
      }

      toast.success("Аватар оновлено");
      setAvatarDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при завантаженні аватара");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      if (!avatarUrl) return;
      
      setIsUploading(true);
      
      // Спроба видалення з Supabase
      try {
        const oldAvatarPath = avatarUrl.split("/").pop();
        if (oldAvatarPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${user.id}/${oldAvatarPath}`]);
        }
        
        const { error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: null })
          .eq("id", user.id);

        if (updateError) throw updateError;
      } catch (supabaseError) {
        console.warn("Не вдалося видалити аватар в Supabase:", supabaseError);
        
        // Оновлюємо дані в локальному сховищі
        const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
        if (currentUser && currentUser.id === user.id) {
          currentUser.avatarUrl = null;
          localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }
        
        const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
        const updatedUsers = storedUsers.map((u: any) => {
          if (u.id === user.id) {
            return { ...u, avatarUrl: null };
          }
          return u;
        });
        localStorage.setItem("users", JSON.stringify(updatedUsers));
      }
      
      setAvatarUrl(null);
      setTempAvatarUrl(null);
      toast.success("Аватар видалено");
      setAvatarDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast.error("Помилка при видаленні аватара");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategories(prevCategories => {
      if (prevCategories.includes(categoryId)) {
        return prevCategories.filter(id => id !== categoryId);
      } else {
        return [...prevCategories, categoryId];
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-2 cursor-pointer hover:opacity-90 transition-opacity" onClick={handleOpenAvatarDialog}>
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={user?.full_name || 'Користувач'} />
                ) : (
                  <AvatarFallback>
                    <UserRound className="h-12 w-12" />
                  </AvatarFallback>
                )}
                <div className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full">
                  <Camera className="h-4 w-4" />
                </div>
              </Avatar>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleOpenAvatarDialog}
              >
                <Camera className="h-4 w-4 mr-1" /> Змінити фото
              </Button>
            </div>
            
            <div className="flex-1 space-y-4 w-full">
              <div>
                <Label htmlFor="country">Країна</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Введіть країну"
                />
              </div>

              <div>
                <Label htmlFor="city">Місто</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Введіть місто"
                />
              </div>
              
              <div>
                <Label>Професійні категорії</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CATEGORIES.map(category => (
                    <div 
                      key={category.id}
                      className={`flex items-center gap-2 p-2 rounded border ${
                        selectedCategories.includes(category.id) 
                          ? 'border-primary bg-primary/10' 
                          : 'border-input'
                      } cursor-pointer`}
                      onClick={() => handleCategoryChange(category.id)}
                    >
                      <category.icon className="h-4 w-4" />
                      <span className="text-sm">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleUpdateProfile} 
            className="w-full"
            disabled={isSaving}
          >
            {isSaving ? "Зберігаю..." : "Зберегти зміни"}
          </Button>
        </div>
      </Card>

      <PortfolioManager userId={user.id} onUpdate={onUpdate} />
      
      {/* Діалог зміни аватара */}
      <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Зміна аватара</DialogTitle>
            <DialogDescription>
              Завантажте нове зображення для профілю або видаліть поточне.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <Avatar className="h-32 w-32">
                {tempAvatarUrl ? (
                  <AvatarImage src={tempAvatarUrl} alt="Новий аватар" />
                ) : (
                  <AvatarFallback>
                    <UserRound className="h-16 w-16" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <div>
              <Label htmlFor="avatarFile">Оберіть зображення</Label>
              <Input
                id="avatarFile"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={isUploading}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {avatarUrl && (
              <Button 
                variant="destructive" 
                onClick={handleRemoveAvatar}
                disabled={isUploading}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Видалити аватар
              </Button>
            )}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setAvatarDialogOpen(false)}
              >
                Скасувати
              </Button>
              <Button 
                onClick={handleSaveAvatar} 
                disabled={isUploading || (!tempAvatarFile && tempAvatarUrl === avatarUrl)}
              >
                {isUploading ? "Зберігаю..." : "Зберегти аватар"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
