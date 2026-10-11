import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketplaceListingsManager } from "@/components/admin/marketplace/MarketplaceListingsManager";
import { SoftwareManager } from "@/components/marketplace/SoftwareDownloads";
import { MarketplaceCategoriesManager } from "@/components/admin/marketplace/MarketplaceCategoriesManager";

export function MarketplaceTab() {
  return (
    <Tabs defaultValue="listings" className="w-full">
      <TabsList className="h-auto w-full justify-start overflow-x-auto">
        <TabsTrigger value="listings">Оголошення</TabsTrigger>
        <TabsTrigger value="categories">Категорії</TabsTrigger>
        <TabsTrigger value="software">Програми</TabsTrigger>
      </TabsList>
      <TabsContent value="listings" className="mt-4">
        <MarketplaceListingsManager />
      </TabsContent>
      <TabsContent value="categories" className="mt-4">
        <MarketplaceCategoriesManager />
      </TabsContent>
      <TabsContent value="software" className="mt-4">
        <SoftwareManager />
      </TabsContent>
    </Tabs>
  );
}