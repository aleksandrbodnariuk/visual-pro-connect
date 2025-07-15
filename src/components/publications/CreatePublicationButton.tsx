import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreatePublicationModal } from "./CreatePublicationModal";

export function CreatePublicationButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  const handleSuccess = () => {
    // Оновлюємо сторінку або викликаємо callback для оновлення списку публікацій
    window.location.reload();
  };

  return (
    <>
      <Button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Створити публікацію
      </Button>
      
      <CreatePublicationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        userId={currentUser.id || 'demo-user'}
        onSuccess={handleSuccess}
      />
    </>
  );
}