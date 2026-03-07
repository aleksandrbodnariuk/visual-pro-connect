import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Globe, Eye, Users, Activity, Link2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCountryNameUk, getFlagEmoji } from "@/lib/countryNames";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

type Period = 'today' | 'yesterday' | '7d' | '30d' | 'month' | 'year' | 'custom';

/** Compute UTC start/end for a period using Europe/Kyiv timezone */
function getDateRange(period: Period, customStart?: string, customEnd?: string) {
  // Get current date/time in Kyiv timezone
  const kyivNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
  const kyivYear = kyivNow.getFullYear();
  const kyivMonth = kyivNow.getMonth();
  const kyivDate = kyivNow.getDate();

  // Helper: create a Date in Kyiv timezone and convert to UTC ISO string
  function kyivDateToUtc(y: number, m: number, d: number): string {
    // Create a date string in Kyiv time, parse with timezone info
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T00:00:00`;
    // Use Intl to get offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    // Simple approach: create date at midnight Kyiv = subtract Kyiv offset from UTC
    // Kyiv is UTC+2 (winter) or UTC+3 (summer)
    const testDate = new Date(dateStr + '+02:00');
    const kyivStr = testDate.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' });
    const kyivParsed = new Date(kyivStr);
    // Check if midnight Kyiv aligns
    if (kyivParsed.getHours() === 0) {
      return testDate.toISOString();
    }
    // Try +03:00
    const testDate3 = new Date(dateStr + '+03:00');
    return testDate3.toISOString();
  }

  let startUtc: string;
  let endUtc: string;

  switch (period) {
    case 'today':
      startUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate);
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
      break;
    case 'yesterday':
      startUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate - 1);
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate);
      break;
    case '7d': {
      const d = new Date(kyivYear, kyivMonth, kyivDate - 6);
      startUtc = kyivDateToUtc(d.getFullYear(), d.getMonth(), d.getDate());
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
      break;
    }
    case '30d': {
      const d = new Date(kyivYear, kyivMonth, kyivDate - 29);
      startUtc = kyivDateToUtc(d.getFullYear(), d.getMonth(), d.getDate());
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
      break;
    }
    case 'month':
      startUtc = kyivDateToUtc(kyivYear, kyivMonth, 1);
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
      break;
    case 'year':
      startUtc = kyivDateToUtc(kyivYear, 0, 1);
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
      break;
    case 'custom':
      if (customStart) {
        const cs = new Date(customStart);
        startUtc = kyivDateToUtc(cs.getFullYear(), cs.getMonth(), cs.getDate());
      } else {
        const d = new Date(kyivYear, kyivMonth, kyivDate - 29);
        startUtc = kyivDateToUtc(d.getFullYear(), d.getMonth(), d.getDate());
      }
      if (customEnd) {
        const ce = new Date(customEnd);
        endUtc = kyivDateToUtc(ce.getFullYear(), ce.getMonth(), ce.getDate() + 1);
      } else {
        endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
      }
      break;
    default:
      startUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate - 29);
      endUtc = kyivDateToUtc(kyivYear, kyivMonth, kyivDate + 1);
  }

  return { start: startUtc, end: endUtc };
}

interface GeoRow {
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  views: number;
  visitors: number;
}

interface AnalyticsData {
  total_pageviews: number;
  unique_visitors: number;
  total_sessions: number;
  daily_stats: { date: string; views: number; visitors: number; sessions: number }[];
  top_pages: { path: string; views: number; visitors: number }[];
  top_countries: GeoRow[];
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
    { value: 'yesterday', label: 'Вчора' },
    { value: '7d', label: '7 днів' },
    { value: '30d', label: '30 днів' },
    { value: 'month', label: 'Місяць' },
    { value: 'year', label: 'Рік' },
    { value: 'custom', label: 'Довільний' },
  ];

  // Prepare geo chart data with Ukrainian names
  const geoChartData = (data?.top_countries || []).slice(0, 10).map((c) => ({
    name: `${getFlagEmoji(c.country_code)} ${getCountryNameUk(c.country_code)}`,
    views: c.views,
    visitors: c.visitors,
  }));

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
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
              <Button size="sm" onClick={loadData}>Застосувати</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Input placeholder="Фільтр за шляхом..." value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} className="w-48" />
            <Input placeholder="Фільтр за країною (ISO)..." value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-48" />
            <Button size="sm" variant="outline" onClick={loadData}>Фільтрувати</Button>
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
                <div className="p-2 rounded-full bg-primary/10"><Eye className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Перегляди</p>
                  <p className="text-2xl font-bold">{data.total_pageviews.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-accent"><Users className="h-5 w-5 text-accent-foreground" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Унікальні відвідувачі</p>
                  <p className="text-2xl font-bold">{data.unique_visitors.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-secondary"><Activity className="h-5 w-5 text-secondary-foreground" /></div>
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
                <CardHeader><CardTitle className="text-base">Перегляди по днях</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Топ сторінок</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Географія відвідувачів</CardTitle></CardHeader>
                <CardContent>
                  {geoChartData.length > 0 && (
                    <div className="mb-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={geoChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
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
                        <TableHead>Прапор</TableHead>
                        <TableHead>Країна</TableHead>
                        <TableHead>ISO</TableHead>
                        <TableHead>Регіон</TableHead>
                        <TableHead>Місто</TableHead>
                        <TableHead className="text-right">Перегляди</TableHead>
                        <TableHead className="text-right">Відвідувачі</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data.top_countries || []).length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Немає даних</TableCell></TableRow>
                      ) : data.top_countries.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-lg">{getFlagEmoji(c.country_code)}</TableCell>
                          <TableCell>{getCountryNameUk(c.country_code)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{c.country_code || '—'}</TableCell>
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
                <CardHeader><CardTitle className="text-base">Джерела трафіку</CardTitle></CardHeader>
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
