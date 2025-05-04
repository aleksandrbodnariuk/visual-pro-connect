
import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogoSettings } from '@/components/settings/LogoSettings';
import { LogoUpload } from '@/components/settings/LogoUpload'; 
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { BannerUpload } from '@/components/profile/BannerUpload';
import { useAuthState } from '@/hooks/auth/useAuthState';

export default function Settings() {
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState("general");
  const { getCurrentUser } = useAuthState();
  const currentUser = getCurrentUser();

  return (
    <div className="min-h-screen pb-10">
      <Navbar />
      
      <div className="container mt-8 grid grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-3">
          <Sidebar className="sticky top-20" />
        </div>
        
        <main className="col-span-12 md:col-span-9">
          <h1 className="text-3xl font-bold mb-6">{t.settings}</h1>
          
          <Tabs 
            defaultValue="general" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-6">
              <TabsTrigger value="general">Загальні</TabsTrigger>
              <TabsTrigger value="appearance">Зовнішній вигляд</TabsTrigger>
              <TabsTrigger value="profile">Профіль</TabsTrigger>
              <TabsTrigger value="notifications">Сповіщення</TabsTrigger>
              <TabsTrigger value="privacy">Конфіденційність</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Мова</CardTitle>
                  <CardDescription>Виберіть мову інтерфейсу</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      className={`p-3 rounded-md ${language === 'uk' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                      onClick={() => setLanguage('uk')}
                    >
                      Українська
                    </button>
                    <button
                      className={`p-3 rounded-md ${language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                      onClick={() => setLanguage('en')}
                    >
                      English
                    </button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Акаунт</CardTitle>
                  <CardDescription>Налаштування вашого акаунту</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>Налаштування для вашого акаунту.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="appearance">
              <LogoSettings />
              <div className="mt-6">
                <LogoUpload />
              </div>
            </TabsContent>
            
            <TabsContent value="profile">
              <div className="grid gap-6">
                {currentUser && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Аватар профілю</CardTitle>
                        <CardDescription>Редагувати зображення профілю</CardDescription>
                      </CardHeader>
                      <CardContent className="flex justify-center py-6">
                        <AvatarUpload 
                          userId={currentUser.id} 
                          avatarUrl={currentUser.avatarUrl}
                        />
                      </CardContent>
                    </Card>
                    
                    <BannerUpload 
                      userId={currentUser.id}
                      existingBannerUrl={currentUser.bannerUrl}
                    />
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Налаштування сповіщень</CardTitle>
                  <CardDescription>Керуйте сповіщеннями, які ви отримуєте</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Налаштування сповіщень будуть доступні найближчим часом.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Конфіденційність</CardTitle>
                  <CardDescription>Керуйте налаштуваннями конфіденційності</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Налаштування конфіденційності будуть доступні найближчим часом.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
