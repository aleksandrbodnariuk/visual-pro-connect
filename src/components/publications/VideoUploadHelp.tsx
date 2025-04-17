
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';

export default function VideoUploadHelp() {
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Інформація про відео завантаження</CardTitle>
        <CardDescription>
          Інформація про роботу з відео на платформі
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Обмеження при завантаженні відео</AlertTitle>
          <AlertDescription>
            <p className="mt-2">
              Завантаження відео в базову версію додатку обмежене через відсутність повноцінного відеохостингу.
            </p>
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Рекомендації для роботи з відео:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Завантажуйте відео на YouTube або Vimeo</li>
            <li>Використовуйте посилання на відео у своїх публікаціях</li>
            <li>Вставляйте відео через iframe у описах</li>
            <li>Для повноцінної роботи з відео потрібно підключення до відеохостингового сервісу</li>
          </ul>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Вимоги до відео</AlertTitle>
          <AlertDescription>
            <p className="mt-2">
              Рекомендовані формати: MP4, WebM<br />
              Максимальний розмір для локального завантаження: 10 МБ
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
