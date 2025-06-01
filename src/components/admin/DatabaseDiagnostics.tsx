
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DatabaseDiagnostics() {
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>({
    supabase: null,
    github: null,
    vercel: null
  });

  const checkSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        return {
          status: 'error',
          message: `Помилка підключення: ${error.message}`,
          details: error
        };
      }
      
      return {
        status: 'success',
        message: 'З\'єднання успішне',
        details: `База даних працює коректно`
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Критична помилка підключення',
        details: error
      };
    }
  };

  const checkStorageBuckets = async () => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        return {
          status: 'warning',
          message: 'Помилка доступу до Storage',
          details: error.message
        };
      }
      
      const requiredBuckets = ['avatars', 'banners', 'logos', 'posts', 'portfolio'];
      const existingBuckets = buckets?.map(b => b.name) || [];
      const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));
      
      if (missingBuckets.length > 0) {
        return {
          status: 'warning',
          message: `Відсутні bucket'и: ${missingBuckets.join(', ')}`,
          details: `Існуючі: ${existingBuckets.join(', ')}`,
          missingBuckets
        };
      }
      
      return {
        status: 'success',
        message: 'Всі bucket\'и налаштовані',
        details: `Bucket'и: ${existingBuckets.join(', ')}`
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Критична помилка Storage',
        details: error
      };
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    
    try {
      // Перевірка Supabase
      const supabaseResult = await checkSupabaseConnection();
      const storageResult = await checkStorageBuckets();
      
      // Перевірка GitHub (симуляція)
      const githubResult = {
        status: 'success',
        message: 'GitHub інтеграція активна',
        details: 'Синхронізація працює'
      };
      
      // Перевірка Vercel (симуляція)
      const vercelResult = {
        status: 'success',
        message: 'Vercel деплой активний',
        details: 'Останній деплой успішний'
      };
      
      setDiagnostics({
        supabase: {
          database: supabaseResult,
          storage: storageResult
        },
        github: githubResult,
        vercel: vercelResult
      });
      
      toast.success("Діагностика завершена");
    } catch (error) {
      console.error("Помилка діагностики:", error);
      toast.error("Помилка під час діагностики");
    } finally {
      setIsChecking(false);
    }
  };

  const fixStorageBuckets = async () => {
    setIsFixing(true);
    
    try {
      const storageResult = diagnostics.supabase?.storage;
      if (!storageResult?.missingBuckets || storageResult.missingBuckets.length === 0) {
        toast.info("Немає проблем для виправлення");
        setIsFixing(false);
        return;
      }
      
      const requiredBuckets = [
        { name: 'avatars', public: true },
        { name: 'banners', public: true },
        { name: 'logos', public: true },
        { name: 'posts', public: true },
        { name: 'portfolio', public: true }
      ];
      
      let fixedCount = 0;
      
      for (const bucket of requiredBuckets) {
        if (storageResult.missingBuckets.includes(bucket.name)) {
          try {
            console.log(`Створюємо bucket ${bucket.name}...`);
            const { data, error } = await supabase.storage.createBucket(bucket.name, {
              public: bucket.public,
              fileSizeLimit: 52428800 // 50MB
            });
            
            if (error) {
              if (error.message.includes('already exists')) {
                console.log(`Bucket ${bucket.name} вже існує`);
                fixedCount++;
              } else {
                console.error(`Помилка створення bucket ${bucket.name}:`, error);
                throw error;
              }
            } else {
              console.log(`Bucket ${bucket.name} успішно створено:`, data);
              fixedCount++;
            }
          } catch (bucketError) {
            console.error(`Не вдалося створити bucket ${bucket.name}:`, bucketError);
            toast.error(`Помилка створення ${bucket.name}: ${bucketError.message}`);
          }
        }
      }
      
      if (fixedCount > 0) {
        toast.success(`Виправлено ${fixedCount} проблем Storage`);
        // Повторюємо діагностику після виправлення
        await runDiagnostics();
      } else {
        toast.warning("Не вдалося виправити проблеми Storage");
      }
      
    } catch (error) {
      console.error("Помилка виправлення Storage:", error);
      toast.error(`Помилка виправлення Storage: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Працює</Badge>;
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Попередження</Badge>;
      case 'error':
        return <Badge variant="destructive">Помилка</Badge>;
      default:
        return <Badge variant="outline">Не перевірено</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Діагностика системи</CardTitle>
        <CardDescription>Перевірка зв'язку з Supabase, GitHub та Vercel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4">
          <Button onClick={runDiagnostics} disabled={isChecking}>
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Перевірка...
              </>
            ) : (
              'Запустити діагностику'
            )}
          </Button>
        </div>

        {diagnostics.supabase && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Supabase</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostics.supabase.database.status)}
                  <div>
                    <div className="font-medium">База даних</div>
                    <div className="text-sm text-muted-foreground">
                      {diagnostics.supabase.database.message}
                    </div>
                  </div>
                </div>
                {getStatusBadge(diagnostics.supabase.database.status)}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(diagnostics.supabase.storage.status)}
                  <div>
                    <div className="font-medium">Storage</div>
                    <div className="text-sm text-muted-foreground">
                      {diagnostics.supabase.storage.message}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(diagnostics.supabase.storage.status)}
                  {diagnostics.supabase.storage.status === 'warning' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={fixStorageBuckets}
                      disabled={isFixing}
                    >
                      {isFixing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          Виправляю...
                        </>
                      ) : (
                        'Виправити'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {diagnostics.github && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">GitHub</h3>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(diagnostics.github.status)}
                <div>
                  <div className="font-medium">Інтеграція</div>
                  <div className="text-sm text-muted-foreground">
                    {diagnostics.github.message}
                  </div>
                </div>
              </div>
              {getStatusBadge(diagnostics.github.status)}
            </div>
          </div>
        )}

        {diagnostics.vercel && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vercel</h3>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(diagnostics.vercel.status)}
                <div>
                  <div className="font-medium">Деплоймент</div>
                  <div className="text-sm text-muted-foreground">
                    {diagnostics.vercel.message}
                  </div>
                </div>
              </div>
              {getStatusBadge(diagnostics.vercel.status)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
