
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Trash2, Eye, Plus } from "lucide-react";
import { CreatePublicationButton } from "@/components/publications/CreatePublicationButton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PostsTab() {
  const [posts, setPosts] = useState<any[]>(() => {
    const storedPosts = localStorage.getItem("posts");
    return storedPosts ? JSON.parse(storedPosts) : [
      { id: "1", author: "Олександр Петренко", title: "Нова фотосесія", content: "Опис нової фотосесії для молодят", status: "Активний" },
      { id: "2", author: "Марія Коваленко", title: "Відеомонтаж кліпу", content: "Деталі про новий музичний кліп і процес монтажу", status: "Активний" },
      { id: "3", author: "Ігор Мельник", title: "Музичний реліз", content: "Інформація про випуск нового альбому", status: "На розгляді" }
    ];
  });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [editedPost, setEditedPost] = useState<any>({
    title: "",
    content: "",
    status: ""
  });

  const deletePost = (postId: string) => {
    const updatedPosts = posts.filter(post => post.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    toast.success("Публікацію видалено");
  };

  const togglePostStatus = (postId: string) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const newStatus = post.status === "Активний" ? "На розгляді" : "Активний";
        return { ...post, status: newStatus };
      }
      return post;
    });
    
    setPosts(updatedPosts);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    toast.success("Статус публікації змінено");
  };

  const handleViewPost = (post: any) => {
    setSelectedPost(post);
    setViewDialogOpen(true);
  };

  const handleEditPost = (post: any) => {
    setSelectedPost(post);
    setEditedPost({
      title: post.title,
      content: post.content || "",
      status: post.status
    });
    setEditDialogOpen(true);
  };

  const saveEditedPost = () => {
    if (!selectedPost) return;
    
    const updatedPosts = posts.map(post => {
      if (post.id === selectedPost.id) {
        return {
          ...post,
          title: editedPost.title,
          content: editedPost.content,
          status: editedPost.status
        };
      }
      return post;
    });
    
    setPosts(updatedPosts);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    setEditDialogOpen(false);
    toast.success("Публікацію оновлено");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Управління публікаціями</CardTitle>
            <CardDescription>Перегляд та модерація публікацій користувачів</CardDescription>
          </div>
          <CreatePublicationButton />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">Автор</th>
                <th className="text-left p-2">Заголовок</th>
                <th className="text-left p-2">Статус</th>
                <th className="text-left p-2">Дії</th>
              </tr>
            </thead>
            <tbody>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <tr key={post.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{post.id}</td>
                    <td className="p-2">{post.author}</td>
                    <td className="p-2">{post.title}</td>
                    <td className="p-2">
                      <Badge 
                        variant={post.status === "Активний" ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => togglePostStatus(post.id)}
                      >
                        {post.status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewPost(post)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Перегляд
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditPost(post)}
                        >
                          <PenLine className="h-4 w-4 mr-1" /> Редагувати
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Видалити
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-muted-foreground">
                    Немає публікацій
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Діалог для перегляду публікації */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedPost?.title}</DialogTitle>
              <DialogDescription>
                Автор: {selectedPost?.author}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Badge variant={selectedPost?.status === "Активний" ? "default" : "secondary"}>
                {selectedPost?.status}
              </Badge>
              <div className="text-sm mt-4 border rounded-md p-4 bg-muted/30">
                {selectedPost?.content || "Немає вмісту"}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewDialogOpen(false)}>
                Закрити
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Діалог для редагування публікації */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Редагування публікації</DialogTitle>
              <DialogDescription>
                Змініть інформацію про публікацію
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок</Label>
                <Input
                  id="title"
                  value={editedPost.title}
                  onChange={(e) => setEditedPost({...editedPost, title: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Вміст</Label>
                <Textarea
                  id="content"
                  rows={5}
                  value={editedPost.content}
                  onChange={(e) => setEditedPost({...editedPost, content: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Статус</Label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border rounded-md"
                  value={editedPost.status}
                  onChange={(e) => setEditedPost({...editedPost, status: e.target.value})}
                >
                  <option value="Активний">Активний</option>
                  <option value="На розгляді">На розгляді</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Скасувати
              </Button>
              <Button onClick={saveEditedPost}>
                Зберегти зміни
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
