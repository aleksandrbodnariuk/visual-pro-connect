import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Handshake, UtensilsCrossed, Car, Flower2, Cake } from "lucide-react";
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

const PARTNER_CATEGORIES = [
  { icon: UtensilsCrossed, name: "Ресторани та локації" },
  { icon: Car, name: "Автомобілі та кортежі" },
  { icon: Flower2, name: "Оформлення та флористика" },
  { icon: Cake, name: "Кондитерські та феєрверки" },
];

export function StudioPartnersTab() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-muted/40 p-4">
        <h2 className="text-xl font-bold">Партнери студії</h2>
        <p className="text-sm text-muted-foreground">
          Надійні партнери, рекомендовані B&C studio для вашого свята. Розділ наповнюється.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PARTNER_CATEGORIES.map(({ icon: Icon, name }) => (
          <Card key={name}>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <Icon className="h-8 w-8 text-primary" />
              <div className="font-semibold">{name}</div>
              <span className="text-xs text-muted-foreground">Незабаром</span>
            </CardContent>
          </Card>
        ))}
      </div>
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
