
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileEditor } from "./ProfileEditor";
import { AvatarUpload } from "./AvatarUpload";
import { BannerUpload } from "./BannerUpload";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { User } from "@/hooks/users/types";
import { toast } from "sonner";

interface ProfileEditorDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userData: Partial<User>) => void;
  onUpdate?: () => void;
}

export function ProfileEditorDialog({
  user,
  open,
  onOpenChange,
  onSave,
  onUpdate,
}: ProfileEditorDialogProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState("profile");

  // Скидаємо активну вкладку при відкритті діалогу
  useEffect(() => {
    if (open) {
      setActiveTab("profile");
    }
  }, [open]);

  const handleAvatarChange = (url: string) => {
    onSave({ avatarUrl: url });
    toast.success(t.profileUpdated);
    if (onUpdate) onUpdate();
  };

  const handleBannerComplete = (url: string) => {
    onSave({ bannerUrl: url });
    // Toast is already shown in onSave, no need to duplicate
    if (onUpdate) onUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.editProfile}</DialogTitle>
          <DialogDescription>{t.updateYourProfile}</DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="profile"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="profile">{t.profile}</TabsTrigger>
            <TabsTrigger value="avatar">{t.avatar}</TabsTrigger>
            <TabsTrigger value="banner">Банер</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 py-2">
            <ProfileEditor user={user} onSave={onSave} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="avatar" className="space-y-4 py-4 flex justify-center">
            <AvatarUpload 
              userId={user.id} 
              avatarUrl={user.avatarUrl || user.avatar_url}
              onAvatarChange={handleAvatarChange} 
            />
          </TabsContent>
          
          <TabsContent value="banner" className="space-y-4 py-2">
            <BannerUpload 
              userId={user.id} 
              existingBannerUrl={user.bannerUrl}
              onComplete={handleBannerComplete} 
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
