import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, Flag, ShieldCheck, Trash2, Vote } from 'lucide-react';
import { CampaignsPanel } from '@/components/party/CampaignsPanel';
import { ORG_TYPES, orgActions, useOrganization } from '@/hooks/orgs/useOrganizations';
import { PartyDashboard } from '@/components/party/PartyDashboard';
import { PartySection } from '@/components/party/PartySection';
import { PartyAccessPanel } from '@/components/party/PartyAccessPanel';
import { PartyMembersRegistry } from '@/components/party/PartyMembersRegistry';
import { PartyPeoplePanel } from '@/components/party/PartyPeoplePanel';
import { PartySymbols } from '@/components/party/PartySymbols';
import { UnitOfficersPanel } from '@/components/party/UnitOfficersPanel';
import { FlagBanner } from '@/components/party/FlagBanner';
import { TeamBusinessPanel } from '@/components/team/TeamBusinessPanel';
import { Briefcase } from 'lucide-react';
import { OrgSettingsDialog } from '@/components/orgs/OrgSettingsDialog';
import { TeamMembersPanel } from '@/components/team/TeamMembersPanel';
import { AmwayPremiumLetter } from '@/components/team/AmwayPremiumLetter';

export default function OrganizationPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { organization, isAdmin, hasParty, loading, reload } = useOrganization(orgId);

  const { user } = useAuth();
  // Спостерігач без штабних прав бачить лише «Вибори» зі своєю дільницею.
  const [observerOnly, setObserverOnly] = useState(false);
  useEffect(() => {
    if (!orgId || !user?.id || isAdmin || !hasParty) { setObserverOnly(false); return; }
    const sb = supabase as any;
    Promise.all([
      sb.from('precinct_members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('user_id', user.id),
      sb.from('campaign_trainees').select('role').eq('user_id', user.id),
      sb.from('hq_managers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('user_id', user.id),
      sb.from('party_unit_officers').select('id, party_members!inner(user_id)', { count: 'exact', head: true }).eq('organization_id', orgId).eq('party_members.user_id', user.id),
    ]).then(([pm, tr, mg, of]: any[]) => {
      const roles = ((tr.data || []) as { role: string }[]).map((x) => x.role);
      const observer = (pm.count || 0) > 0 || roles.includes('observer');
      setObserverOnly(observer && !(mg.count || 0) && !(of.count || 0) && roles.every((r) => r === 'observer'));
    });
  }, [orgId, user?.id, isAdmin, hasParty]);
  const isPartyOrg = organization?.type === 'party';
  const showParty = hasParty && isPartyOrg && !observerOnly;
  const isTeam = !!organization && organization.type !== 'party';
  const [isManager, setIsManager] = useState(false);
  useEffect(() => {
    if (!orgId || !user?.id) { setIsManager(false); return; }
    (supabase as any).rpc('is_org_manager', { _org_id: orgId, _user_id: user.id }).then(({ data }: any) => setIsManager(data === true));
  }, [orgId, user?.id]);

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
            <Card className="overflow-hidden">
              <FlagBanner org={organization} canEdit={isAdmin} onChanged={reload} />
              <div className="p-4 flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {organization.logo_url ? <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-cover" /> : <Building2 className="h-8 w-8 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold">{organization.name}</h1>
                <Badge variant="secondary">{ORG_TYPES.find((t) => t.value === organization.type)?.label}</Badge>
              </div>
              {isAdmin && (
                <OrgSettingsDialog org={organization} isSiteAdmin={isAdmin} onChanged={reload} />
              )}
              </div>
            </Card>

            <Tabs key={observerOnly ? 'obs' : 'full'} defaultValue={observerOnly ? 'campaigns' : organization.type !== 'party' ? 'business' : hasParty ? 'party' : 'about'}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="about">Про організацію</TabsTrigger>
                {showParty && <TabsTrigger value="party"><Flag className="h-4 w-4 mr-1" />Партія</TabsTrigger>}
                {hasParty && isPartyOrg && <TabsTrigger value="campaigns"><Vote className="h-4 w-4 mr-1" />Вибори</TabsTrigger>}
                {isTeam && <TabsTrigger value="business"><Briefcase className="h-4 w-4 mr-1" />Бізнес-кабінет</TabsTrigger>}
                {(isAdmin || (isTeam && isManager)) && <TabsTrigger value="access"><ShieldCheck className="h-4 w-4 mr-1" />Доступи</TabsTrigger>}
              </TabsList>
              <TabsContent value="about">
                {isTeam ? <AmwayPremiumLetter /> : <div className="space-y-3">
                <Card className="p-4 space-y-2">
                  <p className="whitespace-pre-wrap text-sm">{organization.description || 'Опис відсутній'}</p>
                  {organization.website && <a href={organization.website} target="_blank" rel="noreferrer" className="text-primary text-sm underline">{organization.website}</a>}
                </Card>
                <PartySymbols org={organization} canEdit={isAdmin} onChanged={reload} />
                </div>}
              </TabsContent>
              {showParty && (
                <TabsContent value="party">
                  <Tabs defaultValue="overview">
                    <TabsList className="flex-wrap h-auto mb-2">
                      <TabsTrigger value="overview">Огляд та аналітика</TabsTrigger>
                      <TabsTrigger value="hqs">Організації</TabsTrigger>
                      <TabsTrigger value="leaders">Керівництво</TabsTrigger>
                      <TabsTrigger value="bodies">Керівні органи</TabsTrigger>
                      <TabsTrigger value="members">Члени партії</TabsTrigger>
                      <TabsTrigger value="staff">Працівники організацій</TabsTrigger>
                      <TabsTrigger value="symbols">Символіка</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview"><PartyDashboard orgId={organization.id} isAdmin={isAdmin} /></TabsContent>
                    <TabsContent value="hqs"><PartySection orgId={organization.id} canEdit={isAdmin} /></TabsContent>
                    <TabsContent value="leaders"><PartyPeoplePanel orgId={organization.id} mode="leaders" /></TabsContent>
                    <TabsContent value="bodies"><UnitOfficersPanel orgId={organization.id} canEdit={isAdmin} /></TabsContent>
                    <TabsContent value="members"><PartyMembersRegistry orgId={organization.id} canEdit={isAdmin} /></TabsContent>
                    <TabsContent value="staff"><PartyPeoplePanel orgId={organization.id} mode="members" /></TabsContent>
                    <TabsContent value="symbols"><PartySymbols org={organization} canEdit={isAdmin} onChanged={reload} /></TabsContent>
                  </Tabs>
                </TabsContent>
              )}
              {hasParty && isPartyOrg && (
                <TabsContent value="campaigns">
                  {observerOnly ? <CampaignsPanel orgId={organization.id} isAdmin={isAdmin} /> : (
                    <Tabs defaultValue="list">
                      <TabsList className="flex-wrap h-auto mb-2">
                        <TabsTrigger value="list">Виборчі кампанії</TabsTrigger>
                        <TabsTrigger value="hqs">Штаби, округи та дільниці</TabsTrigger>
                      </TabsList>
                      <TabsContent value="list"><CampaignsPanel orgId={organization.id} isAdmin={isAdmin} /></TabsContent>
                      <TabsContent value="hqs"><PartySection orgId={organization.id} canEdit={isAdmin} kind="campaign" /></TabsContent>
                    </Tabs>
                  )}
                </TabsContent>
              )}
              {isTeam && (
                <TabsContent value="business">
                  <TeamBusinessPanel orgId={organization.id} canEdit={isAdmin || isManager} />
                </TabsContent>
              )}
              {(isAdmin || (isTeam && isManager)) && (
                <TabsContent value="access">
                  {isTeam ? <TeamMembersPanel orgId={organization.id} /> : <PartyAccessPanel orgId={organization.id} />}
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
