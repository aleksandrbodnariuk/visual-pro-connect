import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, Copy, Check, MessageCircle, Facebook } from 'lucide-react';
import { toast } from 'sonner';

interface ShareInviteBlockProps {
  representativeId: string;
  onInviteDialogOpen: () => void;
}

export function ShareInviteBlock({ representativeId, onInviteDialogOpen }: ShareInviteBlockProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/auth?ref=${representativeId}`;
  const inviteText = `Приєднуйся до нашої команди! Переходь за посиланням: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      toast.success('Скопійовано!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Не вдалося скопіювати');
    }
  };

  const handleViber = () => {
    const encoded = encodeURIComponent(inviteText);
    window.open(`viber://forward?text=${encoded}`, '_blank');
  };

  const handleFacebook = () => {
    const encoded = encodeURIComponent(referralLink);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank', 'width=600,height=400');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-muted-foreground" />
          Запросити друга
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral link preview */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-1">Ваше посилання</p>
          <p className="text-sm font-mono break-all select-all">{referralLink}</p>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? 'Готово' : 'Копіювати'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleViber} className="w-full">
            <MessageCircle className="h-4 w-4 mr-1.5" />
            Viber
          </Button>
          <Button variant="outline" size="sm" onClick={handleFacebook} className="w-full">
            <Facebook className="h-4 w-4 mr-1.5" />
            Facebook
          </Button>
        </div>

        {/* Direct invite */}
        <Button onClick={onInviteDialogOpen} className="w-full" variant="default">
          <UserPlus className="h-4 w-4 mr-2" />
          Запросити з платформи
        </Button>
      </CardContent>
    </Card>
  );
}
