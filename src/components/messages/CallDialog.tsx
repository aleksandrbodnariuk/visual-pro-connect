import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useCall } from "@/context/CallContext";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CallDialog() {
  const { call, acceptCall, declineCall, endCall, toggleMute, toggleSpeaker } = useCall();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (call?.status === "active") {
      const i = setInterval(() => setTick(t => t + 1), 1000);
      return () => clearInterval(i);
    }
  }, [call?.status]);

  if (!call) return null;

  const elapsed = call.startedAt ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;
  void tick; // re-render trigger

  const initials = call.peer.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusText =
    call.status === "incoming" ? "Вхідний дзвінок..." :
    call.status === "outgoing" ? "Виклик..." :
    call.status === "active" ? fmt(elapsed) :
    "";

  return (
    <Dialog open onOpenChange={() => { /* prevent close-by-overlay */ }}>
      <DialogContent
        className="max-w-sm text-center [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={call.peer.avatarUrl} alt={call.peer.name} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>

          <div>
            <h2 className="text-xl font-semibold">{call.peer.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{statusText}</p>
          </div>

          <div className="flex items-center gap-4 mt-2">
            {call.status === "incoming" ? (
              <>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-14 w-14 rounded-full"
                  onClick={declineCall}
                  title="Відхилити"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  size="icon"
                  className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700"
                  onClick={acceptCall}
                  title="Прийняти"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <>
                {call.status === "active" && (
                  <>
                    <Button
                      size="icon"
                      variant={call.muted ? "default" : "secondary"}
                      className="h-14 w-14 rounded-full"
                      onClick={toggleMute}
                      title={call.muted ? "Увімкнути мікрофон" : "Вимкнути мікрофон"}
                    >
                      {call.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </Button>
                    <Button
                      size="icon"
                      variant={call.speakerOn ? "secondary" : "default"}
                      className="h-14 w-14 rounded-full"
                      onClick={toggleSpeaker}
                      title={call.speakerOn ? "Вимкнути гучний зв'язок" : "Увімкнути гучний зв'язок"}
                    >
                      {call.speakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                    </Button>
                  </>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-14 w-14 rounded-full"
                  onClick={endCall}
                  title="Завершити"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}