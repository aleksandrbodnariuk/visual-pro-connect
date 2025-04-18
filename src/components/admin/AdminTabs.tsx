
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTab } from "./tabs/UsersTab";
import { ShareholdersTab } from "./tabs/ShareholdersTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { ArchivedOrdersTab } from "./tabs/ArchivedOrdersTab";
import { StockExchangeTab } from "./tabs/StockExchangeTab";
import { PostsTab } from "./tabs/PostsTab";
import { SettingsTab } from "./tabs/SettingsTab";

export function AdminTabs() {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="users">Користувачі</TabsTrigger>
        <TabsTrigger value="shareholders">Акціонери</TabsTrigger>
        <TabsTrigger value="orders">Замовлення</TabsTrigger>
        <TabsTrigger value="archived-orders">Архів замовлень</TabsTrigger>
        <TabsTrigger value="stock-exchange">Ринок акцій</TabsTrigger>
        <TabsTrigger value="posts">Публікації</TabsTrigger>
        <TabsTrigger value="settings">Налаштування</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <UsersTab />
      </TabsContent>
      
      <TabsContent value="shareholders">
        <ShareholdersTab />
      </TabsContent>
      
      <TabsContent value="orders">
        <OrdersTab />
      </TabsContent>
      
      <TabsContent value="archived-orders">
        <ArchivedOrdersTab />
      </TabsContent>
      
      <TabsContent value="stock-exchange">
        <StockExchangeTab />
      </TabsContent>
      
      <TabsContent value="posts">
        <PostsTab />
      </TabsContent>
      
      <TabsContent value="settings">
        <SettingsTab />
      </TabsContent>
    </Tabs>
  );
}
