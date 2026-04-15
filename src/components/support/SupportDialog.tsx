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

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const [activeTab, setActiveTab] = useState("new");
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
            <TabsTrigger value="new" className="flex-1">Нове звернення</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Мої звернення</TabsTrigger>
          </TabsList>

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
