
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileImage, FileVideo, Plus } from "lucide-react";

interface CreatePublicationModalProps {
  userId: string;
  userName: string;
}

export default function CreatePublicationModal({ userId, userName }: CreatePublicationModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target && typeof evt.target.result === "string") {
          setImagePreview(evt.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVideoFile(file);
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target && typeof evt.target.result === "string") {
          setVideoPreview(evt.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Введіть назву публікації");
      return;
    }

    if (!imageFile) {
      toast.error("Додайте зображення для публікації");
      return;
    }

    // Create a new publication object
    const newPublication = {
      id: Date.now().toString(),
      userId,
      author: userName,
      title,
      description,
      date: new Date().toISOString(),
      status: "Активний",
      imageUrl: imagePreview,
      videoUrl: videoPreview,
    };

    // Get existing posts from localStorage or initialize empty array
    const existingPosts = JSON.parse(localStorage.getItem("posts") || "[]");
    const updatedPosts = [newPublication, ...existingPosts];
    
    // Save to localStorage
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    
    // Reset form and close modal
    setTitle("");
    setDescription("");
    setImageFile(null);
    setVideoFile(null);
    setImagePreview(null);
    setVideoPreview(null);
    setOpen(false);
    
    toast.success("Публікацію успішно створено");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={16} />
          Створити публікацію
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Створення нової публікації</DialogTitle>
          <DialogDescription>
            Заповніть деталі вашої публікації. Додайте зображення та, за бажанням, відео.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Назва публікації</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введіть назву публікації"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Опис</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишіть вашу публікацію"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Зображення</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-4">
                <Label htmlFor="image-upload" className="cursor-pointer text-center">
                  <FileImage className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm">Натисніть щоб додати зображення</span>
                  <Input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </Label>
              </div>
              <div className="border rounded-md p-2 flex items-center justify-center bg-muted/40 h-[100px]">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">Перегляд зображення</span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Відео (опціонально)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center border border-dashed rounded-md p-4">
                <Label htmlFor="video-upload" className="cursor-pointer text-center">
                  <FileVideo className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm">Натисніть щоб додати відео</span>
                  <Input
                    id="video-upload"
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleVideoChange}
                  />
                </Label>
              </div>
              <div className="border rounded-md p-2 flex items-center justify-center bg-muted/40 h-[100px]">
                {videoPreview ? (
                  <video
                    src={videoPreview}
                    controls
                    className="max-h-full max-w-full"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">Перегляд відео</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit}>Опублікувати</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
