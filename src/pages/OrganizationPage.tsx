import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Flag, ShieldCheck, Trash2 } from 'lucide-react';
import { ORG_TYPES, orgActions, useOrganization } from '@/hooks/orgs/useOrganizations';
import { PartySection } from '@/components/party/PartySection';
import { PartyAccessPanel } from '@/components/party/PartyAccessPanel';

export default function OrganizationPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { organization, isAdmin, hasParty, loading } = useOrganization(orgId);

  useEffect(() => { if (organization) document.title = `${organization.name} — Організації`; }, [organization]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 md:px-4 pt-20 pb-24 md:pb-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/organizations')}><ArrowLeft className="h-4 w-4 mr-1" /> Організації</Button>
        {loading ? <p className="text-muted-foreground text-sm">Завантаження…</p> : !organization ? (
          <p className="text-muted-foreground">Організацію не знайдено</p>
        ) : (
          <>
            <Card className="p-4 flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {organization.logo_url ? <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold">{organization.name}</h1>
                <Badge variant="secondary">{ORG_TYPES.find((t) => t.value === organization.type)?.label}</Badge>
              </div>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (confirm('Видалити організацію з усіма даними?') && await orgActions.remove(organization.id)) navigate('/organizations');
                }}><Trash2 className="h-4 w-4 mr-1 text-destructive" /> Видалити</Button>
              )}
            </Card>

            <Tabs defaultValue={hasParty ? 'party' : 'about'}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="about">Про організацію</TabsTrigger>
                {hasParty && <TabsTrigger value="party"><Flag className="h-4 w-4 mr-1" />Партія</TabsTrigger>}
                {isAdmin && <TabsTrigger value="access"><ShieldCheck className="h-4 w-4 mr-1" />Доступи</TabsTrigger>}
              </TabsList>
              <TabsContent value="about">
                <Card className="p-4 space-y-2">
                  <p className="whitespace-pre-wrap text-sm">{organization.description || 'Опис відсутній'}</p>
                  {organization.website && <a href={organization.website} target="_blank" rel="noreferrer" className="text-primary text-sm underline">{organization.website}</a>}
                </Card>
              </TabsContent>
              {hasParty && (
                <TabsContent value="party">
                  <PartySection orgId={organization.id} canEdit={isAdmin} />
                </TabsContent>
              )}
              {isAdmin && (
                <TabsContent value="access">
                  <PartyAccessPanel orgId={organization.id} />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
