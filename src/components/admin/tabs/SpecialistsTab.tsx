import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Specialist {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  categories: string[] | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

export function SpecialistsTab() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialists = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_specialists');
        if (error) {
          console.error("Error fetching specialists:", error);
          toast.error("Помилка при завантаженні фахівців");
          return;
        }
        setSpecialists(data || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSpecialists();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Команда фахівців</CardTitle>
        <CardDescription>
          Усі користувачі з роллю «Фахівець» ({specialists.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : specialists.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Немає зареєстрованих фахівців. Призначити роль можна у вкладці «Користувачі».
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Фахівець</th>
                    <th className="text-left p-2">Категорії</th>
                    <th className="text-left p-2">Місто</th>
                  </tr>
                </thead>
                <tbody>
                  {specialists.map((spec) => (
                    <tr key={spec.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={spec.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{getInitials(spec.full_name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{spec.full_name || "Без імені"}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {spec.categories && spec.categories.length > 0 ? (
                            spec.categories.map((cat) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        {[spec.city, spec.country].filter(Boolean).join(", ") || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {specialists.map((spec) => (
                <Card key={spec.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={spec.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(spec.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{spec.full_name || "Без імені"}</p>
                      <p className="text-sm text-muted-foreground">{spec.title || "Фахівець"}</p>
                    </div>
                  </div>
                  {spec.categories && spec.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {spec.categories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                      ))}
                    </div>
                  )}
                  {(spec.city || spec.country) && (
                    <p className="text-xs text-muted-foreground">
                      📍 {[spec.city, spec.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
