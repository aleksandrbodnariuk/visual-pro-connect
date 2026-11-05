import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportForm } from "./SupportForm";
import { SupportTicketsList } from "./SupportTicketsList";
import { AssistantChat } from "@/components/assistant/AssistantChat";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const [activeTab, setActiveTab] = useState("ai");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setActiveTab("history");
    setRefreshKey((k) => k + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Служба підтримки</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="ai" className="flex-1">ШІ-помічник</TabsTrigger>
            <TabsTrigger value="new" className="flex-1">Нове звернення</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Мої звернення</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4 space-y-2">
            <AssistantChat source="support" />
            <button type="button" className="text-sm text-primary underline min-h-[44px]" onClick={() => setActiveTab("new")}>
              Не знайшли відповідь? Напишіть адміністратору
            </button>
          </TabsContent>

          <TabsContent value="new" className="mt-4">
            <SupportForm onCreated={handleCreated} />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <SupportTicketsList key={refreshKey} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
