import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe2, Leaf, Sparkles, Home, ShieldCheck, Award } from 'lucide-react';

const BRANDS = [
  { icon: Leaf, name: 'Nutrilite™', text: 'Вітаміни й харчові добавки з рослин, вирощених на власних органічних фермах.' },
  { icon: Sparkles, name: 'Artistry™', text: 'Догляд за шкірою та декоративна косметика, створені на основі науки й природи.' },
  { icon: Home, name: 'eSpring™ · iCook™ · Amway Home™', text: 'Чиста вода, здорове приготування їжі та концентровані засоби для дому.' },
];

const VALUES = ['Свобода', 'Сім’я', 'Надія', 'Винагорода'];

/** Преміум-лист про компанію Amway для вкладки «Про організацію» бізнес-команди. */
export function AmwayPremiumLetter({ onOpenBusiness }: { onOpenBusiness?: () => void }) {
  return (
    <Card className="relative overflow-hidden p-6 md:p-10 border-primary/30">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 text-[10rem] font-serif font-bold text-primary/5 select-none">A</div>
      <div className="relative max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">Преміум-лист</p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold">Ласкаво просимо в Amway</h2>
          <div className="mx-auto h-px w-24 bg-primary/50" />
        </header>

        <p className="text-base leading-relaxed text-muted-foreground">
          Шановний партнере! Amway — це можливість будувати власну справу у своєму темпі, з підтримкою команди та
          перевіреними продуктами. Ми віримо, що успіх приходить до тих, хто вчиться, допомагає іншим і діє щодня.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          {[{ icon: Award, v: 'з 1959', l: 'року на ринку' }, { icon: Globe2, v: '100+', l: 'країн і територій' }, { icon: ShieldCheck, v: '100%', l: 'гарантія задоволення' }].map((s) => (
            <div key={s.l} className="rounded-lg border bg-muted/30 p-4">
              <s.icon className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{s.v}</p>
              <p className="text-xs text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <h3 className="font-serif text-xl font-semibold">Наші цінності</h3>
          <div className="flex flex-wrap gap-2">
            {VALUES.map((v) => <span key={v} className="rounded-full border border-primary/40 px-4 py-1.5 text-sm">{v}</span>)}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-serif text-xl font-semibold">Флагманські бренди</h3>
          <div className="space-y-3">
            {BRANDS.map((b) => (
              <div key={b.name} className="flex gap-3 rounded-lg border p-4">
                <b.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div><p className="font-medium">{b.name}</p><p className="text-sm text-muted-foreground">{b.text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-sm italic text-muted-foreground border-l-2 border-primary/50 pl-4">
          «Кожен великий бізнес починається з одного рішення — почати». З повагою, лідери команди.
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild className="min-h-[44px]"><a href="https://www.amway.ua" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Офіційний сайт Amway</a></Button>
          {onOpenBusiness && <Button variant="outline" className="min-h-[44px]" onClick={onOpenBusiness}>Відкрити бізнес-кабінет</Button>}
        </div>
      </div>
    </Card>
  );
}
