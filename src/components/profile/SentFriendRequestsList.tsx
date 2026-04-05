import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Loader2, Clock } from "lucide-react";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { useAuth } from '@/context/AuthContext';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export function SentFriendRequestsList() {
  const { friendRequests, isLoading, refreshFriendRequests } = useFriendRequests();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || null;
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const sentRequests = friendRequests.filter(
    request => request.status === 'pending' && request.sender_id === currentUserId
  );

  const getInitials = (name: string | null): string => {
    if (!name) return 'К';
    const nameParts = name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    }
    return name.charAt(0);
  };

  const cancelRequest = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId)
        .eq('sender_id', currentUserId!);

      if (error) throw error;
      toast.success("Запит скасовано");
      await refreshFriendRequests();
    } catch (error) {
      toast.error("Не вдалося скасувати запит");
    } finally {
      setCancellingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Надіслані запити</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (sentRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Надіслані запити</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Немає надісланих запитів</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Надіслані запити ({sentRequests.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sentRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <Avatar>
                  {request.receiver?.avatar_url ? (
                    <AvatarImage src={request.receiver.avatar_url} />
                  ) : (
                    <AvatarFallback>
                      {request.receiver?.full_name ? getInitials(request.receiver.full_name) : 'К'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">
                    {request.receiver?.full_name || 'Користувач'}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Очікує підтвердження
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={cancellingId === request.id}
                onClick={() => cancelRequest(request.id)}
              >
                {cancellingId === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Скасувати
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
