import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, Search, ArrowLeft, Loader2, Camera, Video, Music, Play, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServicePkg {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category_name: string;
  category_id: string;
  packages: ServicePkg[];
}

interface PortfolioWork {
  id: string;
  title: string;
  description: string | null;
  media_url: string;
  media_type: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
}

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [works, setWorks] = useState<PortfolioWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [worksLoading, setWorksLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("services");

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, pkgRes, catRes] = await Promise.all([
        supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("service_packages").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("categories").select("id, name"),
      ]);

      const catMap: Record<string, string> = {};
      (catRes.data || []).forEach((c: any) => {
        catMap[c.id] = c.name;
      });

      const pkgMap = new Map<string, ServicePkg[]>();
      (pkgRes.data || []).forEach((p: any) => {
        if (!pkgMap.has(p.service_id)) pkgMap.set(p.service_id, []);
        pkgMap.get(p.service_id)!.push({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
        });
      });

      const items: ServiceItem[] = (svcRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category_name: catMap[s.category_id] || "Інше",
        category_id: s.category_id,
        packages: pkgMap.get(s.id) || [],
      }));

      setServices(items);
    } catch (err) {
      console.error("Error loading service catalog:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorks = useCallback(async () => {
    setWorksLoading(true);
    try {
      // Fetch all portfolio items
      const { data: portfolioData, error: portfolioErr } = await supabase
        .from("portfolio")
        .select("*")
        .order("created_at", { ascending: false });

      if (portfolioErr) throw portfolioErr;

      if (!portfolioData || portfolioData.length === 0) {
        setWorks([]);
        return;
      }

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(portfolioData.map((p) => p.user_id))];
      const { data: profiles } = await supabase.rpc("get_safe_public_profiles_by_ids", {
        _ids: userIds,
      });

      const profileMap = new Map<string, { full_name: string; avatar_url: string | null }>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, { full_name: p.full_name || "Без імені", avatar_url: p.avatar_url });
      });

      const items: PortfolioWork[] = portfolioData.map((p) => {
        const profile = profileMap.get(p.user_id);
        return {
          id: p.id,
          title: p.title,
          description: p.description,
          media_url: p.media_url,
          media_type: p.media_type,
          created_at: p.created_at || "",
          user_id: p.user_id,
          user_name: profile?.full_name || "Без імені",
          user_avatar: profile?.avatar_url || null,
        };
      });

      setWorks(items);
    } catch (err) {
      console.error("Error loading portfolio works:", err);
    } finally {
      setWorksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      loadServices();
      loadWorks();
    }
  }, [user, authLoading, navigate, loadServices, loadWorks]);

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWorks = works.filter(
    (w) =>
      w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.user_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = new Map<string, ServiceItem[]>();
  filtered.forEach((s) => {
    if (!grouped.has(s.category_name)) grouped.set(s.category_name, []);
    grouped.get(s.category_name)!.push(s);
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (authLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center pt-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-16 sm:pt-20 pb-20 px-3 sm:px-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Каталог послуг</h1>
            <p className="text-sm text-muted-foreground">Послуги, пакети та роботи фахівців</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 mb-6">
            <TabsTrigger value="services" className="gap-1.5 text-xs sm:text-sm">
              <Package className="h-3.5 w-3.5 hidden sm:block" />
              Послуги
            </TabsTrigger>
            <TabsTrigger value="works" className="gap-1.5 text-xs sm:text-sm">
              <Image className="h-3.5 w-3.5 hidden sm:block" />
              Роботи фахівців
            </TabsTrigger>
          </TabsList>

          {/* Services tab */}
          <TabsContent value="services">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Послуг не знайдено</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Array.from(grouped.entries()).map(([catName, catServices]) => (
                  <div key={catName}>
                    <h2 className="text-lg font-semibold mb-3">{catName}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {catServices.map((svc) => (
                        <Card key={svc.id} className="overflow-hidden">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{svc.name}</CardTitle>
                            {svc.description && (
                              <p className="text-sm text-muted-foreground">{svc.description}</p>
                            )}
                          </CardHeader>
                          <CardContent>
                            {svc.packages.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Пакети не налаштовано</p>
                            ) : (
                              <div className="space-y-2">
                                {svc.packages.map((pkg) => (
                                  <div
                                    key={pkg.id}
                                    className="flex items-center justify-between p-2.5 rounded-md bg-muted/50"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{pkg.name}</p>
                                      {pkg.description && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {pkg.description}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant="secondary" className="ml-2 font-mono tabular-nums">
                                      {pkg.price} $
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Works tab */}
          <TabsContent value="works">
            {worksLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Робіт не знайдено</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredWorks.map((work) => (
                  <div key={work.id} className="group relative overflow-hidden rounded-lg">
                    <div className="aspect-square w-full overflow-hidden bg-muted">
                      {work.media_type === "audio" ? (
                        <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                          <Music className="h-12 w-12 text-primary/60" />
                        </div>
                      ) : (
                        <img
                          src={work.media_url}
                          alt={work.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                    </div>

                    {/* Media type badge */}
                    <div className="absolute left-2 top-2 rounded-full bg-black/60 p-1.5 text-white">
                      {work.media_type === "photo" && <Camera className="h-3.5 w-3.5" />}
                      {work.media_type === "video" && <Video className="h-3.5 w-3.5" />}
                      {work.media_type === "audio" && <Music className="h-3.5 w-3.5" />}
                    </div>

                    {/* Play button for video/audio */}
                    {(work.media_type === "video" || work.media_type === "audio") && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="rounded-full bg-white/20 p-2.5 backdrop-blur-sm">
                          <Play className="h-6 w-6 text-white" fill="white" />
                        </div>
                      </div>
                    )}

                    {/* Hover overlay with info */}
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-xs font-medium text-white truncate">{work.title}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={work.user_avatar || undefined} />
                          <AvatarFallback className="text-[8px]">
                            {getInitials(work.user_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-white/80 truncate">{work.user_name}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
