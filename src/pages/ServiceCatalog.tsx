import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, ArrowLeft, Loader2 } from "lucide-react";

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

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) loadServices();
  }, [user, authLoading, navigate, loadServices]);

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category_name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = new Map<string, ServiceItem[]>();
  filtered.forEach((s) => {
    if (!grouped.has(s.category_name)) grouped.set(s.category_name, []);
    grouped.get(s.category_name)!.push(s);
  });

  if (authLoading || loading) {
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
            <p className="text-sm text-muted-foreground">Перегляд послуг та пакетів</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Пошук послуг..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
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
      </div>
    </>
  );
}
