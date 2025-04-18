
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export function PostsTab() {
  const [posts, setPosts] = useState<any[]>(() => {
    const storedPosts = localStorage.getItem("posts");
    return storedPosts ? JSON.parse(storedPosts) : [
      { id: "1", author: "Олександр Петренко", title: "Нова фотосесія", status: "Активний" },
      { id: "2", author: "Марія Коваленко", title: "Відеомонтаж кліпу", status: "Активний" },
      { id: "3", author: "Ігор Мельник", title: "Музичний реліз", status: "На розгляді" }
    ];
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Управління публікаціями</CardTitle>
        <CardDescription>Перегляд та модерація публікацій користувачів</CardDescription>
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
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" /> Перегляд
                        </Button>
                        <Button variant="outline" size="sm">
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
      </CardContent>
    </Card>
  );
}
