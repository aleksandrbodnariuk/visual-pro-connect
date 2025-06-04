
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface LogoPreviewProps {
  previewUrl: string | null;
  isUploading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function LogoPreview({ previewUrl, isUploading, onSave, onCancel }: LogoPreviewProps) {
  if (!previewUrl) return null;

  return (
    <>
      <div className="flex justify-center mt-4 mb-4">
        <div className="p-4 border rounded-lg bg-muted/50 w-full flex items-center justify-center">
          <img 
            src={previewUrl} 
            alt="Превью логотипу" 
            className="max-h-24 object-contain"
          />
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isUploading}
        >
          <X className="mr-2 h-4 w-4" /> Скасувати
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={isUploading}
        >
          <Save className="mr-2 h-4 w-4" /> {isUploading ? 'Завантаження...' : 'Зберегти логотип'}
        </Button>
      </div>
    </>
  );
}
