import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Globe, Eye, Users, Activity, Link2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

type Period = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';

function getDateRange(period: Period, customStart?: string, customEnd?: string) {
  const now = new Date();
  let start: Date;
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // end of today

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 86400000);
      end = customEnd ? new Date(new Date(customEnd).getTime() + 86400000) : end;
      break;
    default:
      start = new Date(now.getTime() - 30 * 86400000);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

interface AnalyticsData {
  total_pageviews: number;
  unique_visitors: number;
  total_sessions: number;
  daily_stats: { date: string; views: number; visitors: number; sessions: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  top_countries: { country: string; region: string; city: string; views: number; visitors: number }[];
  top_sources: { source: string; utm_source: string; utm_medium: string; utm_campaign: string; views: number; visitors: number }[];
}

export function AnalyticsTab() {
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period, customStart, customEnd);
      const { data: result, error } = await (supabase.rpc as any)('get_analytics_overview', {
        _start_date: start,
        _end_date: end,
        _path_filter: pathFilter || null,
        _country_filter: countryFilter || null,
      });
      if (error) {
        console.error('Analytics error:', error);
        setData(null);
      } else if (result && result.length > 0) {
        const r = result[0];
        setData({
          total_pageviews: Number(r.total_pageviews) || 0,
          unique_visitors: Number(r.unique_visitors) || 0,
          total_sessions: Number(r.total_sessions) || 0,
          daily_stats: r.daily_stats || [],
          top_pages: r.top_pages || [],
          top_countries: r.top_countries || [],
          top_sources: r.top_sources || [],
        });
      } else {
        setData({ total_pageviews: 0, unique_visitors: 0, total_sessions: 0, daily_stats: [], top_pages: [], top_countries: [], top_sources: [] });
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, customStart, customEnd]);

  const periodButtons: { value: Period; label: string }[] = [
    { value: 'today', label: 'Сьогодні' },
    { value: '7d', label: '7 днів' },
    { value: '30d', label: '30 днів' },
    { value: 'month', label: 'Місяць' },
    { value: 'year', label: 'Рік' },
    { value: 'custom', label: 'Довільний' },
  ];

  return (
    <div className="space-y-4">
      {/* Period Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {periodButtons.map((p) => (
              <Button
                key={p.value}
                variant={period === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {period === 'custom' && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-40"
              />
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-40"
              />
              <Button size="sm" onClick={loadData}>Застосувати</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Input
              placeholder="Фільтр за шляхом..."
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              className="w-48"
            />
            <Input
              placeholder="Фільтр за країною..."
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-48"
            />
            <Button size="sm" variant="outline" onClick={loadData}>
              Фільтрувати
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Завантаження аналітики...</div>
      ) : !data ? (
        <div className="text-center py-12 text-muted-foreground">Немає даних</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Перегляди</p>
                  <p className="text-2xl font-bold">{data.total_pageviews.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Унікальні відвідувачі</p>
                  <p className="text-2xl font-bold">{data.unique_visitors.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Сесії</p>
                  <p className="text-2xl font-bold">{data.total_sessions.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sub-Tabs */}
          <Tabs value={subTab} onValueChange={setSubTab}>
            <TabsList className="flex overflow-x-auto gap-1 w-full justify-start">
              <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Огляд</TabsTrigger>
              <TabsTrigger value="pages"><Eye className="h-4 w-4 mr-1" />Сторінки</TabsTrigger>
              <TabsTrigger value="geo"><Globe className="h-4 w-4 mr-1" />Географія</TabsTrigger>
              <TabsTrigger value="sources"><Link2 className="h-4 w-4 mr-1" />Джерела</TabsTrigger>
            </TabsList>

            {/* Overview Chart */}
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Перегляди по днях</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.daily_stats.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Немає даних за цей період</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data.daily_stats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="views" name="Перегляди" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                        <Area type="monotone" dataKey="visitors" name="Відвідувачі" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.15)" />
                        <Area type="monotone" dataKey="sessions" name="Сесії" stroke="hsl(280 67% 55%)" fill="hsl(280 67% 55% / 0.1)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Pages */}
            <TabsContent value="pages">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Топ сторінок</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Сторінка</TableHead>
                        <TableHead className="text-right">Перегляди</TableHead>
                        <TableHead className="text-right">Відвідувачі</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top_pages.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Немає даних</TableCell></TableRow>
                      ) : data.top_pages.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-sm max-w-[200px] truncate">{p.path}</TableCell>
                          <TableCell className="text-right">{p.views}</TableCell>
                          <TableCell className="text-right">{p.visitors}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Geo */}
            <TabsContent value="geo">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Географія відвідувачів</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.top_countries.length > 0 && (
                    <div className="mb-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.top_countries.slice(0, 10)}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="views" name="Перегляди" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Країна</TableHead>
                        <TableHead>Регіон</TableHead>
                        <TableHead>Місто</TableHead>
                        <TableHead className="text-right">Перегляди</TableHead>
                        <TableHead className="text-right">Відвідувачі</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top_countries.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Немає даних</TableCell></TableRow>
                      ) : data.top_countries.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>{c.country || '—'}</TableCell>
                          <TableCell>{c.region || '—'}</TableCell>
                          <TableCell>{c.city || '—'}</TableCell>
                          <TableCell className="text-right">{c.views}</TableCell>
                          <TableCell className="text-right">{c.visitors}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sources */}
            <TabsContent value="sources">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Джерела трафіку</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Джерело</TableHead>
                        <TableHead>UTM Source</TableHead>
                        <TableHead>UTM Medium</TableHead>
                        <TableHead>UTM Campaign</TableHead>
                        <TableHead className="text-right">Перегляди</TableHead>
                        <TableHead className="text-right">Відвідувачі</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top_sources.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Немає даних</TableCell></TableRow>
                      ) : data.top_sources.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.source}</TableCell>
                          <TableCell>{s.utm_source || '—'}</TableCell>
                          <TableCell>{s.utm_medium || '—'}</TableCell>
                          <TableCell>{s.utm_campaign || '—'}</TableCell>
                          <TableCell className="text-right">{s.views}</TableCell>
                          <TableCell className="text-right">{s.visitors}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
