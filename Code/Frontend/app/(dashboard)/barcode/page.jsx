"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ScanBarcode,
  Search,
  CheckCircle,
  AlertTriangle,
  Camera,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

export default function ScannerPage() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [history, setHistory] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [html5QrCode, setHtml5QrCode] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.Html5Qrcode) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const startCameraScan = () => {
    if (typeof window === "undefined" || !window.Html5Qrcode) {
      toast.error("Scanner library is loading, please wait...");
      return;
    }
    setShowCamera(true);

    setTimeout(() => {
      try {
        const scanner = new window.Html5Qrcode("camera-reader");
        setHtml5QrCode(scanner);

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            setBarcodeInput(decodedText);
            toast.success("Code scanned successfully!");
            
            productsApi.lookup(decodedText).then((res) => {
              const product = res?.data || res;
              if (product?.id) {
                const mapped = {
                  id: product.id,
                  sku: product.sku,
                  name: product.name,
                  stock: product.stock ?? 0,
                  price: product.unit_price,
                  category: product.category_name,
                  barcode: product.barcode,
                  status: product.status,
                };
                setScannedProduct(mapped);
                setHistory((prev) => [
                  {
                    sku: decodedText,
                    scannedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
                    result: "found",
                    name: mapped.name,
                  },
                  ...prev.slice(0, 19),
                ]);
                toast.success(`Found: ${mapped.name}`);
              }
            }).catch((err) => {
              setScannedProduct(null);
              setHistory((prev) => [
                {
                  sku: decodedText,
                  scannedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
                  result: "not_found",
                },
                ...prev.slice(0, 19),
              ]);
              toast.error("Product not found");
            });

            if (scanner.isScanning) {
              scanner.stop().then(() => {
                setShowCamera(false);
                setHtml5QrCode(null);
              }).catch(console.error);
            } else {
              setShowCamera(false);
              setHtml5QrCode(null);
            }
          },
          (errorMessage) => {}
        ).catch((err) => {
          toast.error("Failed to start camera: " + err);
          setShowCamera(false);
        });
      } catch (err) {
        toast.error("Failed to initialize scanner: " + err);
        setShowCamera(false);
      }
    }, 100);
  };

  const stopCameraScan = () => {
    if (html5QrCode) {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          setShowCamera(false);
          setHtml5QrCode(null);
        }).catch((err) => {
          console.error(err);
          setShowCamera(false);
          setHtml5QrCode(null);
        });
      } else {
        setShowCamera(false);
        setHtml5QrCode(null);
      }
    } else {
      setShowCamera(false);
    }
  };

  const handleScan = async () => {
    const code = barcodeInput.trim();
    if (!code) {
      toast.error("Please enter or scan a barcode / SKU");
      return;
    }

    setIsScanning(true);
    try {
      const res = await productsApi.lookup(code);
      const product = res?.data || res;
      if (!product?.id) {
        throw new Error("not found");
      }
      const mapped = {
        id: product.id,
        sku: product.sku,
        name: product.name,
        stock: product.stock ?? 0,
        price: product.unit_price,
        category: product.category_name,
        barcode: product.barcode,
        status: product.status,
      };
      setScannedProduct(mapped);
      setHistory((prev) => [
        {
          sku: code,
          scannedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
          result: "found",
          name: mapped.name,
        },
        ...prev.slice(0, 19),
      ]);
      toast.success(`Found: ${mapped.name}`);
    } catch (error) {
      setScannedProduct(null);
      setHistory((prev) => [
        {
          sku: code,
          scannedAt: new Date().toISOString().replace("T", " ").slice(0, 19),
          result: "not_found",
        },
        ...prev.slice(0, 19),
      ]);
      toast.error(
        error instanceof ApiError ? error.message : "Product not found"
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleScan();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Barcode / QR Scanner
          </h1>
          <p className="text-slate-400">
            Look up products by barcode or SKU
          </p>
        </div>
        <Badge variant="outline" className="text-purple-600">
          <ScanBarcode className="mr-1 h-3 w-3" /> R1
        </Badge>
      </div>

      <Card className="border-purple-200/20 bg-purple-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={showCamera ? stopCameraScan : startCameraScan}
              className="rounded-full bg-purple-500/20 p-4 text-purple-400 hover:bg-purple-500/30 hover:scale-105 transition-all duration-200 focus:outline-none cursor-pointer"
              title="Click to start camera scan"
            >
              <Camera className="h-10 w-10" />
            </button>
            <p className="text-sm text-slate-400 text-center max-w-md">
              Use a USB/handheld scanner into the field below, or type a SKU /
              barcode manually.
            </p>
            <div className="flex w-full max-w-lg gap-2">
              <Input
                placeholder="Scan or type barcode / SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={handleKeyPress}
                autoFocus
              />
              <Button onClick={handleScan} disabled={isScanning}>
                {isScanning ? (
                  "Looking up..."
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Lookup
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showCamera && (
        <Card className="border-indigo-500/30 bg-slate-900/60 p-6">
          <CardContent className="flex flex-col items-center justify-center p-0 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-slate-450 hover:text-slate-200"
              onClick={stopCameraScan}
            >
              <X className="h-5 w-5" />
            </Button>
            <CardTitle className="text-base font-semibold mb-4 text-slate-200">Live Camera Scanner</CardTitle>
            <div id="camera-reader" className="w-full max-w-sm rounded-lg overflow-hidden border border-slate-800 bg-black"></div>
            <p className="text-xs text-slate-400 mt-2 text-center">Position the barcode or QR code inside the frame to scan.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Scan result</CardTitle>
            <CardDescription>Product details from live inventory</CardDescription>
          </CardHeader>
          <CardContent>
            {!scannedProduct ? (
              <p className="text-sm text-slate-400">No product scanned yet</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {scannedProduct.name}
                    </h3>
                    <p className="font-mono text-sm text-slate-400">
                      {scannedProduct.sku}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setScannedProduct(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400">Stock</p>
                    <p className="font-semibold">{scannedProduct.stock}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Price</p>
                    <p className="font-semibold">
                      £{Number(scannedProduct.price || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Category</p>
                    <p>{scannedProduct.category || "—"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Barcode</p>
                    <p className="font-mono text-xs">
                      {scannedProduct.barcode || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Link href={`/products/${scannedProduct.id}`}>
                    <Button size="sm" variant="outline">
                      View product
                    </Button>
                  </Link>
                  <Link href="/stock-in">
                    <Button size="sm">Stock In</Button>
                  </Link>
                  <Link href="/stock-out">
                    <Button size="sm" variant="secondary">
                      Stock Out
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recent scans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 && (
              <p className="text-sm text-slate-400">No scans yet this session</p>
            )}
            {history.map((h, idx) => (
              <div
                key={`${h.sku}-${h.scannedAt}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-mono">{h.sku}</p>
                  <p className="text-xs text-slate-500">{h.scannedAt}</p>
                </div>
                {h.result === "found" ? (
                  <Badge className="bg-green-600">
                    <CheckCircle className="mr-1 h-3 w-3" /> {h.name || "Found"}
                  </Badge>
                ) : (
                  <Badge className="bg-red-600">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Not found
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
