"use client";

import { useState } from "react";
import {
  ScanBarcode,
  Search,
  Package,
  CheckCircle,
  AlertTriangle,
  Camera,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";


const mockProducts = [
  { id: "1", sku: "SKU-001", name: "Wireless Mouse", stock: 12, price: 24.99, category: "Electronics", location: "A-3" },
  { id: "2", sku: "SKU-002", name: "USB-C Cable (2m)", stock: 5, price: 9.99, category: "Cables", location: "B-2" },
  { id: "3", sku: "SKU-003", name: "Desk Monitor Stand", stock: 8, price: 89.0, category: "Furniture", location: "C-1" },
];

const scanHistory = [
  { sku: "SKU-001", scannedAt: "2026-07-05 10:30:15", result: "found" },
  { sku: "SKU-002", scannedAt: "2026-07-05 10:28:42", result: "found" },
  { sku: "SKU-999", scannedAt: "2026-07-05 10:25:10", result: "not_found" },
];

export default function ScannerPage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState(scanHistory);

  const handleScan = () => {
    if (!barcodeInput.trim()) {
      toast.error("Please enter or scan a barcode");
      return;
    }

    setIsScanning(true);
    
    setTimeout(() => {
      const found = mockProducts.find((p) =>
        p.sku.toLowerCase() === barcodeInput.trim().toLowerCase() ||
        p.barcode === barcodeInput.trim()
      );

      setScannedProduct(found || null);

     
      setHistory([
        {
          sku: barcodeInput.trim(),
          scannedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
          result: found ? "found" : "not_found",
        },
        ...history,
      ]);

      if (found) {
        toast.success(`✅ Found: ${found.name}`);
      } else {
        toast.error("❌ Product not found");
      }
      setIsScanning(false);
    }, 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Barcode / QR Scanner
          </h1>
          <p className="text-slate-500">Scan products to instantly retrieve details (R1)</p>
        </div>
        <Badge variant="outline" className="text-purple-600">
          <ScanBarcode className="mr-1 h-3 w-3" /> R1
        </Badge>
      </div>

      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-purple-100 p-4 text-purple-600">
              <Camera className="h-10 w-10" />
            </div>
            <p className="text-center text-sm text-purple-700">
              Position barcode or QR code in front of camera, or type the code below
            </p>
            <div className="flex w-full max-w-2xl items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Enter barcode (e.g., SKU-001 or 8901234567890)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="border-purple-200 bg-white pl-9 focus-visible:ring-purple-500"
                  disabled={isScanning}
                />
              </div>
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isScanning ? "Scanning..." : <><ScanBarcode className="mr-2 h-4 w-4" /> Scan</>}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Result */}
      {scannedProduct && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-800">
                <CheckCircle className="mr-2 inline h-4 w-4 text-green-600" />
                Product Found
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400"
                onClick={() => setScannedProduct(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 bg-teal-100">
                  <AvatarFallback className="text-xl text-teal-700">
                    {scannedProduct.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{scannedProduct.name}</h3>
                  <p className="text-sm text-slate-500">{scannedProduct.sku}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Stock</p>
                  <p className="font-medium">{scannedProduct.stock} units</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Price</p>
                  <p className="font-medium">£{scannedProduct.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Category</p>
                  <p className="font-medium">{scannedProduct.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-medium">{scannedProduct.location}</p>
                </div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-green-300 text-green-700">
                View Product
              </Button>
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                Stock In
              </Button>
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700">
                Stock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

     
      {scannedProduct === null && barcodeInput && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <p className="font-medium">Product Not Found</p>
                <p className="text-sm">No product matches barcode: <strong>{barcodeInput}</strong></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

   
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Scan History</CardTitle>
          <CardDescription>Recently scanned barcodes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs">{item.sku}</span>
                  <Badge
                    variant={item.result === "found" ? "default" : "destructive"}
                    className={item.result === "found" ? "bg-green-500" : ""}
                  >
                    {item.result === "found" ? "✅ Found" : "❌ Not Found"}
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">{item.scannedAt}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}