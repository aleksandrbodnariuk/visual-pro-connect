import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceListingsManager } from "@/components/admin/marketplace/MarketplaceListingsManager";
import { MarketplaceCategoriesManager } from "@/components/admin/marketplace/MarketplaceCategoriesManager";

export function MarketplaceTab() {
  return (
    <Tabs defaultValue="listings" className="w-full">
      <TabsList>
        <TabsTrigger value="listings">Оголошення</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
      </TabsList>
      <TabsContent value="listings" className="mt-4">
        <MarketplaceListingsManager />
      </TabsContent>
      <TabsContent value="categories" className="mt-4">
        <MarketplaceCategoriesManager />
      </TabsContent>
    </Tabs>
  );
}