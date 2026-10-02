import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ORG_TYPES, useOrganizations } from '@/hooks/orgs/useOrganizations';
import { CreateOrganizationDialog } from '@/components/orgs/CreateOrganizationDialog';

export default function Organizations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organizations, loading } = useOrganizations();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { document.title = 'Організації — Спільнота B&C'; }, []);
  useEffect(() => {
    if (!user?.id) return;
    supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any }).then(({ data }) => setIsAdmin(data === true));
  }, [user?.id]);

  const list = organizations.filter((o) => !query || o.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 md:px-4 pt-20 pb-24 md:pb-6 grid grid-cols-12 gap-4">
        <Sidebar className="hidden lg:block col-span-3 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto" />
        <main className="col-span-12 lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Організації</h1>
            </div>
            {isAdmin && <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Створити</Button>}
          </div>
          <Input placeholder="Пошук організацій…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {loading ? <p className="text-muted-foreground text-sm">Завантаження…</p> : list.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Організацій поки немає</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.map((o) => (
                <Card key={o.id} className="p-4 cursor-pointer hover:border-primary transition-colors" onClick={() => navigate(`/organizations/${o.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {o.logo_url ? <img src={o.logo_url} alt={o.name} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{o.name}</p>
                      <Badge variant="secondary">{ORG_TYPES.find((t) => t.value === o.type)?.label}</Badge>
                    </div>
                  </div>
                  {o.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{o.description}</p>}
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
      <CreateOrganizationDialog open={open} onOpenChange={setOpen} onCreated={(id) => navigate(`/organizations/${id}`)} />
    </div>
  );
}
