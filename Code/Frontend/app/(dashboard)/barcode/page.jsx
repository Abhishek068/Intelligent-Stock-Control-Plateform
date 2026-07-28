"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ScanBarcode,
  Search,
  CheckCircle,
  AlertTriangle,
  Camera,
  X,
  Upload,
  RefreshCw,
  AlertCircle,
  Image as ImageIcon,
  HelpCircle,
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
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  const fileInputRef = useRef(null);

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

  const handleScanCode = useCallback(async (code) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsScanning(true);
    try {
      const res = await productsApi.lookup(trimmed);
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
          sku: trimmed,
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
          sku: trimmed,
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
  }, []);

  const startCameraScan = async (targetCameraId = null) => {
    if (typeof window === "undefined" || !window.Html5Qrcode) {
      toast.error("Scanner library is loading, please wait...");
      return;
    }

    setCameraError(null);
    setShowCamera(true);
    setIsCameraLoading(true);

    setTimeout(async () => {
      try {
        const scanner = html5QrCode || new window.Html5Qrcode("camera-reader");
        if (!html5QrCode) {
          setHtml5QrCode(scanner);
        }

        if (scanner.isScanning) {
          await scanner.stop().catch(console.error);
        }

        let availableCameras = cameras;
        try {
          const deviceList = await window.Html5Qrcode.getCameras();
          if (deviceList && deviceList.length > 0) {
            availableCameras = deviceList;
            setCameras(deviceList);
          }
        } catch (camErr) {
          console.warn("Could not enumerate cameras:", camErr);
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        const onSuccess = (decodedText) => {
          setBarcodeInput(decodedText);
          toast.success("Code scanned successfully!");
          handleScanCode(decodedText);

          if (scanner.isScanning) {
            scanner
              .stop()
              .then(() => {
                setShowCamera(false);
              })
              .catch(console.error);
          } else {
            setShowCamera(false);
          }
        };

        const onError = (errorMessage) => {

        };

        let started = false;
        let lastError = null;


        if (targetCameraId) {
          try {
            await scanner.start(
              { deviceId: { exact: targetCameraId } },
              config,
              onSuccess,
              onError
            );
            setSelectedCameraId(targetCameraId);
            started = true;
          } catch (e) {
            lastError = e;
          }
        }


        if (!started && availableCameras.length > 0) {
          const backCam = availableCameras.find(
            (c) =>
              c.label.toLowerCase().includes("back") ||
              c.label.toLowerCase().includes("rear") ||
              c.label.toLowerCase().includes("environment")
          );
          const camToUse = backCam || availableCameras[0];
          try {
            await scanner.start(
              { deviceId: { exact: camToUse.id } },
              config,
              onSuccess,
              onError
            );
            setSelectedCameraId(camToUse.id);
            started = true;
          } catch (e) {
            lastError = e;
          }
        }


        if (!started) {
          try {
            await scanner.start(
              { facingMode: "environment" },
              config,
              onSuccess,
              onError
            );
            started = true;
          } catch (e) {
            lastError = e;
          }
        }


        if (!started) {
          try {
            await scanner.start(
              { facingMode: "user" },
              config,
              onSuccess,
              onError
            );
            started = true;
          } catch (e) {
            lastError = e;
          }
        }


        if (!started) {
          try {
            await scanner.start(
              { video: true },
              config,
              onSuccess,
              onError
            );
            started = true;
          } catch (e) {
            lastError = e;
          }
        }

        if (!started) {
          const errMsg = String(lastError || "Unknown error");
          const isPermissionDenied =
            errMsg.includes("NotAllowedError") ||
            errMsg.includes("Permission") ||
            errMsg.includes("denied") ||
            errMsg.includes("NotAllowed");

          if (isPermissionDenied) {
            setCameraError(
              "Camera permission denied. Please allow camera access in your browser address bar (🔒 lock icon) and click Retry, or use 'Upload Barcode Image'."
            );
          } else {
            setCameraError(
              `Could not access camera (${errMsg}). Please try selecting another camera or use 'Upload Barcode Image'.`
            );
          }
        }
      } catch (err) {
        setCameraError("Failed to initialize scanner: " + String(err));
      } finally {
        setIsCameraLoading(false);
      }
    }, 150);
  };

  const stopCameraScan = () => {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode
        .stop()
        .then(() => {
          setShowCamera(false);
          setCameraError(null);
        })
        .catch((err) => {
          console.error(err);
          setShowCamera(false);
          setCameraError(null);
        });
    } else {
      setShowCamera(false);
      setCameraError(null);
    }
  };

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startCameraScan(newId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (typeof window === "undefined" || !window.Html5Qrcode) {
      toast.error("Scanner library is loading, please wait...");
      return;
    }

    const toastId = toast.loading("Reading barcode from image...");
    try {
      const fileScanner = new window.Html5Qrcode("file-reader-hidden");
      const decodedText = await fileScanner.scanFile(file, true);
      toast.dismiss(toastId);
      toast.success("Barcode detected from image!");
      setBarcodeInput(decodedText);
      handleScanCode(decodedText);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(
        "Could not detect a barcode or QR code in this image. Please try another image or type the SKU manually."
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleScan = () => {
    handleScanCode(barcodeInput);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleScan();
  };

  return (
    <div className="space-y-6">
      <div id="file-reader-hidden" className="hidden"></div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Barcode / QR Scanner
          </h1>
          <p className="text-slate-400">
            Look up products by barcode, QR code, camera, or image upload
          </p>
        </div>
        <Badge variant="outline" className="text-purple-600">
          <ScanBarcode className="mr-1 h-3 w-3" /> R1
        </Badge>
      </div>

      <Card className="border-purple-200/20 bg-purple-500/5">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() =>
                  showCamera ? stopCameraScan() : startCameraScan()
                }
                className="flex flex-col items-center justify-center rounded-2xl bg-purple-500/20 p-4 text-purple-300 hover:bg-purple-500/30 hover:scale-105 transition-all duration-200 focus:outline-none cursor-pointer border border-purple-500/30 min-w-[110px]"
                title="Use Live Camera Scanner"
              >
                <Camera className="h-8 w-8 mb-1" />
                <span className="text-xs font-medium">
                  {showCamera ? "Stop Camera" : "Live Camera"}
                </span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl bg-indigo-500/20 p-4 text-indigo-300 hover:bg-indigo-500/30 hover:scale-105 transition-all duration-200 focus:outline-none cursor-pointer border border-indigo-500/30 min-w-[110px]"
                title="Upload Barcode or QR Image"
              >
                <ImageIcon className="h-8 w-8 mb-1" />
                <span className="text-xs font-medium">Upload Image</span>
              </button>
            </div>

            <p className="text-sm text-slate-400 text-center max-w-md">
              Use your camera, upload a barcode photo, scan with a USB handheld
              scanner, or type a SKU manually below.
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

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
              <span className="font-medium text-slate-500">Quick Test SKUs:</span>
              {["SKU-001", "SKU-002", "12345678", "PROD-100"].map((sampleSku) => (
                <button
                  key={sampleSku}
                  onClick={() => {
                    setBarcodeInput(sampleSku);
                    handleScanCode(sampleSku);
                  }}
                  className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  {sampleSku}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {showCamera && (
        <Card className="border-indigo-500/30 bg-slate-900/80 p-6">
          <CardContent className="flex flex-col items-center justify-center p-0 relative">
            <div className="flex w-full items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-slate-200">
                  Live Camera Scanner
                </CardTitle>
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={handleCameraChange}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                  >
                    {cameras.map((c, i) => (
                      <option key={c.id || i} value={c.id}>
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-slate-200"
                onClick={stopCameraScan}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {cameraError ? (
              <div className="w-full max-w-lg rounded-xl border border-red-500/30 bg-red-950/30 p-6 text-center space-y-4 my-2">
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-500/20 p-3 text-red-400">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                </div>
                <div>
                  <h4 className="text-base font-semibold text-red-200 mb-1">
                    Camera Access Unavailable
                  </h4>
                  <p className="text-sm text-red-300/90 leading-relaxed">
                    {cameraError}
                  </p>
                </div>

                <div className="rounded-lg bg-black/30 p-3 text-left text-xs text-slate-300 space-y-1.5 border border-white/5">
                  <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-purple-400" /> How to allow camera permission:
                  </p>
                  <p>1. Look at your browser address bar at the top.</p>
                  <p>2. Click the Lock icon (🔒) or Site Information icon.</p>
                  <p>3. Toggle <b>Camera</b> permission to <b>Allow</b>.</p>
                  <p>4. Click the <b>Retry Camera</b> button below.</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startCameraScan(selectedCameraId)}
                    className="border-red-500/40 text-red-200 hover:bg-red-900/40"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry Camera
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Barcode Image
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  id="camera-reader"
                  className="w-full max-w-sm rounded-lg overflow-hidden border border-slate-800 bg-black min-h-[260px]"
                ></div>
                {isCameraLoading && (
                  <p className="text-xs text-purple-400 mt-3 animate-pulse">
                    Starting camera...
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-3 text-center">
                  Position the barcode or QR code inside the frame to scan automatically.
                </p>
              </>
            )}
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

