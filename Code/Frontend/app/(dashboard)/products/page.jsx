import { ProductTable } from "@/features/products/components/ProductTable";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Management"
        description="Search, filter, and manage your inventory items." />
      
      <ProductTable />
    </div>);

}