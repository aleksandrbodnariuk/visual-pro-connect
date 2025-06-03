
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Users, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export default function Friends() {
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    // Завантажуємо дані друзів (поки що тестові дані)
    setFriends([
      {
        id: 1,
        name: "Олександр Іванов",
        username: "@alex_ivanov",
        avatar: "",
        status: "online",
        mutualFriends: 5
      },
      {
        id: 2,
        name: "Марія Петренко",
        username: "@maria_p",
        avatar: "",
        status: "offline",
        mutualFriends: 12
      }
    ]);

    setFriendRequests([
      {
        id: 1,
        name: "Іван Сидоренко",
        username: "@ivan_s",
        avatar: "",
        mutualFriends: 3
      }
    ]);

    setSuggestions([
      {
        id: 1,
        name: "Анна Коваль",
        username: "@anna_koval",
        avatar: "",
        mutualFriends: 8
      },
      {
        id: 2,
        name: "Петро Мельник",
        username: "@petro_m",
        avatar: "",
        mutualFriends: 2
      }
    ]);
  }, []);

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Друзі</h1>
                <p className="text-gray-600">Знаходьте та спілкуйтеся з друзями</p>
              </div>

              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Пошук друзів..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Tabs defaultValue="friends" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="friends" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Друзі ({friends.length})
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Запити ({friendRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Рекомендації
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="friends">
                  <Card>
                    <CardHeader>
                      <CardTitle>Мої друзі</CardTitle>
                      <CardDescription>
                        Список ваших друзів у спільноті
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {filteredFriends.length > 0 ? (
                        <div className="grid gap-4">
                          {filteredFriends.map((friend) => (
                            <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={friend.avatar} />
                                  <AvatarFallback>
                                    {friend.name.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold">{friend.name}</h3>
                                  <p className="text-sm text-gray-600">{friend.username}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant={friend.status === 'online' ? 'default' : 'secondary'}>
                                      {friend.status === 'online' ? 'Онлайн' : 'Офлайн'}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      {friend.mutualFriends} спільних друзів
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Написати
                                </Button>
                                <Button variant="outline" size="sm">
                                  Профіль
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">
                            {searchTerm ? 'Друзів не знайдено' : 'У вас поки немає друзів'}
                          </h3>
                          <p className="text-gray-500">
                            {searchTerm 
                              ? 'Спробуйте інший пошуковий запит'
                              : 'Знайдіть нових друзів у розділі "Рекомендації"'
                            }
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="requests">
                  <Card>
                    <CardHeader>
                      <CardTitle>Запити у друзі</CardTitle>
                      <CardDescription>
                        Вхідні запити на додавання у друзі
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {friendRequests.length > 0 ? (
                        <div className="grid gap-4">
                          {friendRequests.map((request) => (
                            <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={request.avatar} />
                                  <AvatarFallback>
                                    {request.name.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold">{request.name}</h3>
                                  <p className="text-sm text-gray-600">{request.username}</p>
                                  <span className="text-xs text-gray-500">
                                    {request.mutualFriends} спільних друзів
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button size="sm">Прийняти</Button>
                                <Button variant="outline" size="sm">Відхилити</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-600 mb-2">
                            Немає нових запитів
                          </h3>
                          <p className="text-gray-500">
                            Коли хтось надішле вам запит у друзі, він з'явиться тут
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="suggestions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Рекомендації</CardTitle>
                      <CardDescription>
                        Люди, яких ви можете знати
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {suggestions.map((suggestion) => (
                          <div key={suggestion.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={suggestion.avatar} />
                                <AvatarFallback>
                                  {suggestion.name.split(' ').map((n: string) => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{suggestion.name}</h3>
                                <p className="text-sm text-gray-600">{suggestion.username}</p>
                                <span className="text-xs text-gray-500">
                                  {suggestion.mutualFriends} спільних друзів
                                </span>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button size="sm">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Додати
                              </Button>
                              <Button variant="outline" size="sm">
                                Профіль
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
