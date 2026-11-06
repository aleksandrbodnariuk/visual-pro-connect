import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Handshake, UtensilsCrossed, Car, Flower2, Cake, Globe, Instagram, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_CATEGORIES, partnerCategoryLabel, safeUrl, type StudioPartner } from "@/lib/studioPartners";
import { useNavigate } from "react-router-dom";
import { useAssistantSettings } from "@/hooks/useAssistantSettings";

export function StudioSiteLink() {
  const { settings } = useAssistantSettings();
  const url = settings?.studio_url?.trim();
  if (!url) return null;
  return (
    <Button asChild variant="outline" className="min-h-[44px]">
      <a href={url} target="_blank" rel="noopener noreferrer">
        Офіційний сайт B&C studio <ExternalLink className="ml-2 h-4 w-4" />
      </a>
    </Button>
  );
}

const ICONS: Record<string, typeof Car> = { venue: UtensilsCrossed, transport: Car, decor: Flower2, confectionery: Cake };

export function StudioPartnersTab() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<StudioPartner[] | null>(null);
  const [cat, setCat] = useState("all");
  useEffect(() => {
    (supabase as any).from("studio_partners").select("*").eq("is_active", true).order("sort_order").order("name")
      .then(({ data }: { data: StudioPartner[] | null }) => setPartners(data ?? []));
  }, []);
  const used = PARTNER_CATEGORIES.filter((c) => partners?.some((p) => p.category === c.value));
  const shown = (partners ?? []).filter((p) => cat === "all" || p.category === cat);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <h2 className="text-xl font-bold">Партнери студії</h2>
        <p className="text-sm text-muted-foreground">Надійні партнери, рекомендовані B&C studio для вашого свята.</p>
      </div>
      {partners === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Завантаження…</p>
      ) : partners.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNER_CATEGORIES.slice(0, 4).map(({ value, label }) => {
            const Icon = ICONS[value] ?? Handshake;
            return (
              <Card key={value}><CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                <Icon className="h-8 w-8 text-primary" /><div className="font-semibold">{label}</div>
                <span className="text-xs text-muted-foreground">Незабаром</span>
              </CardContent></Card>
            );
          })}
        </div>
      ) : (
        <>
          {used.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Button size="sm" variant={cat === "all" ? "default" : "outline"} onClick={() => setCat("all")}>Усі</Button>
              {used.map((c) => (
                <Button key={c.value} size="sm" variant={cat === c.value ? "default" : "outline"} className="shrink-0" onClick={() => setCat(c.value)}>{c.label}</Button>
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => {
              const site = safeUrl(p.website_url); const insta = safeUrl(p.instagram_url);
              return (
                <Card key={p.id} className="overflow-hidden">
                  <CardContent className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.logo_url ? <img src={p.logo_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : <Handshake className="m-4 h-6 w-6 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{partnerCategoryLabel(p.category)}</div>
                      </div>
                    </div>
                    {p.discount_offer && <Badge className="w-fit">{p.discount_offer}</Badge>}
                    {p.description && <p className="line-clamp-4 text-sm text-muted-foreground">{p.description}</p>}
                    <div className="mt-auto flex flex-wrap gap-2">
                      {site && <Button asChild size="sm" variant="outline" className="min-h-11"><a href={site} target="_blank" rel="noopener noreferrer"><Globe className="mr-1 h-4 w-4" />Сайт</a></Button>}
                      {insta && <Button asChild size="sm" variant="outline" className="min-h-11"><a href={insta} target="_blank" rel="noopener noreferrer"><Instagram className="mr-1 h-4 w-4" />Instagram</a></Button>}
                      {p.phone && <Button asChild size="sm" variant="outline" className="min-h-11"><a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}><Phone className="mr-1 h-4 w-4" />{p.phone}</a></Button>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
      <Card className="border-primary/30 bg-primary/10">
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center">
          <Handshake className="h-10 w-10 shrink-0 text-primary" />
          <div className="flex-1">
            <div className="font-semibold">Стати партнером B&C studio</div>
            <p className="text-sm text-muted-foreground">
              Пропонуєте послуги для свят і подій? Напишіть нам — обговоримо умови співпраці.
            </p>
          </div>
          <Button className="min-h-[44px]" onClick={() => navigate("/messages")}>Подати заявку</Button>
        </CardContent>
      </Card>
    </div>
  );
}
