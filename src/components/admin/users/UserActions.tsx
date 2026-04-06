import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Ban, ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserActionsProps {
  user: any;
  onDeleteUser: (userId: string) => void;
  onToggleBlock?: (userId: string) => void;
}

export function UserActions({ user, onDeleteUser, onToggleBlock }: UserActionsProps) {
  const isFounder = user.founder_admin || user.phone_number === '0507068007';
  const isBlocked = Boolean(user.is_blocked);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  const handleSendMagicLink = async () => {
    if (!user.email) {
      toast.error("У користувача немає email");
      return;
    }
    setSendingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: false,
        },
      });
      if (error) {
        console.error("Magic link error:", error);
        toast.error(`Помилка: ${error.message}`);
      } else {
        toast.success(`Magic Link надіслано на ${user.email}`);
      }
    } catch (error) {
      console.error("Magic link error:", error);
      toast.error("Помилка надсилання Magic Link");
    } finally {
      setSendingMagicLink(false);
    }
  };

  return (
    <div className="flex space-x-2">
      {user.email && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendMagicLink}
          disabled={sendingMagicLink}
          title="Надіслати Magic Link для входу"
        >
          <KeyRound className="h-4 w-4 mr-1" />
          {sendingMagicLink ? "..." : "Magic"}
        </Button>
      )}
      {!isFounder && onToggleBlock && (
        <Button
          variant={isBlocked ? "outline" : "secondary"}
          size="sm"
          onClick={() => onToggleBlock(user.id)}
          title={isBlocked ? "Розблокувати" : "Заблокувати"}
        >
          {isBlocked ? <ShieldCheck className="h-4 w-4 mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
          {isBlocked ? "Розблок." : "Блок."}
        </Button>
      )}
      {!isFounder && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteUser(user.id)}
        >
          Видалити
        </Button>
      )}
    </div>
  );
}
