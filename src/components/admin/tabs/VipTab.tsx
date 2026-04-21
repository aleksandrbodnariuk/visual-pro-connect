import { VipPurchaseRequestsList } from "@/components/admin/vip/VipPurchaseRequestsList";
import { VipTiersEditor } from "@/components/admin/vip/VipTiersEditor";
import { VipManualGrant } from "@/components/admin/vip/VipManualGrant";

export function VipTab() {
  return (
    <div className="space-y-6">
      <VipPurchaseRequestsList />
      <VipTiersEditor />
      <VipManualGrant />
    </div>
  );
}