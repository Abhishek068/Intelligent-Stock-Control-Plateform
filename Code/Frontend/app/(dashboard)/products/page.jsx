import { ProductTable } from "@/components/products/ProductTable";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Product Management</h1>
        <p className="text-slate-500">Search, filter, and manage your inventory items.</p>
      </div>
      <ProductTable />
    </div>
  );
}