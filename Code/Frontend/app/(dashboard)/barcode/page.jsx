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
  Volume2,
  VolumeX,
  Copy,
  Printer,
  Plus,
  Minus,
  Layers,
  Zap,
  Download,
  Sparkles,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function playScanAudio(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = success ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(success ? 880 : 220, ctx.currentTime);
    if (success) {
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    }
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

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

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState({});
  const [printModalOpen, setPrintModalOpen] = useState(false);

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

  const handleScanCode = useCallback(
    async (code) => {
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

        if (soundEnabled) {
          playScanAudio(true);
        }

        if (batchMode) {
          setBatchItems((prev) => {
            const current = prev[mapped.sku] || {
              sku: mapped.sku,
              name: mapped.name,
              count: 0,
              price: mapped.price,
              lastScanned: new Date().toLocaleTimeString(),
            };
            return {
              ...prev,
              [mapped.sku]: {
                ...current,
                count: current.count + 1,
                lastScanned: new Date().toLocaleTimeString(),
              },
            };
          });
        }

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

        if (soundEnabled) {
          playScanAudio(false);
        }

        toast.error(
          error instanceof ApiError ? error.message : "Product not found"
        );
      } finally {
        setIsScanning(false);
      }
    },
    [soundEnabled, batchMode]
  );

  const startCameraScan = async (targetCameraId = "") => {
    if (typeof window === "undefined" || !window.Html5Qrcode) {
      setCameraError(
        "Scanner library is still loading. Please try again in a few seconds."
      );
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

          if (!batchMode) {
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
          }
        };

        const onError = (errorMessage) => {};

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

        if (!started) {
          const backCam = availableCameras.find(
            (c) =>
              c.label.toLowerCase().includes("back") ||
              c.label.toLowerCase().includes("rear") ||
              c.label.toLowerCase().includes("environment")
          );
          const camToUse = backCam || availableCameras[0];

          if (camToUse) {
            try {
              await scanner.start(camToUse.id, config, onSuccess, onError);
              setSelectedCameraId(camToUse.id);
              started = true;
            } catch (e) {
              lastError = e;
            }
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

  const exportBatchCsv = () => {
    const items = Object.values(batchItems);
    if (!items.length) {
      toast.error("No items in batch to export");
      return;
    }
    const headers = ["SKU", "Product Name", "Count", "Unit Price", "Last Scanned"];
    const rows = items.map((i) => [
      i.sku,
      i.name,
      i.count,
      i.price || 0,
      i.lastScanned,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join(
        "\n"
      );
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `barcode_audit_batch_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Batch CSV exported successfully");
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Optical Barcode & QR Scanner
            </h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40 text-xs px-2 py-0.5 font-bold">
              Automated FEFO / FIFO
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Look up products by barcode, QR code, live camera, or image upload
            with instant audio feedback and batch audit counting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.info(`Audio feedback ${!soundEnabled ? "enabled" : "disabled"}`);
            }}
            className={`cursor-pointer rounded-xl font-bold ${
              soundEnabled
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="mr-1.5 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <VolumeX className="mr-1.5 h-4 w-4" />
            )}
            Sound {soundEnabled ? "ON" : "OFF"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBatchMode(!batchMode);
              toast.info(
                `Continuous Batch Audit mode ${!batchMode ? "enabled" : "disabled"}`
              );
            }}
            className={`cursor-pointer rounded-xl font-bold ${
              batchMode
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
            }`}
          >
            <Zap className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Batch Audit: {batchMode ? "ON" : "OFF"}
          </Button>
        </div>
      </div>

      <Card className="relative overflow-hidden glass-card border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-3xl">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() =>
                  showCamera ? stopCameraScan() : startCameraScan()
                }
                className="flex flex-col items-center justify-center rounded-2xl bg-purple-50/80 dark:bg-purple-500/10 p-5 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:scale-105 transition-all duration-200 focus:outline-none cursor-pointer border border-purple-200 dark:border-purple-500/20 min-w-[130px] shadow-sm backdrop-blur-md"
                title="Use Live Camera Scanner"
              >
                <Camera className="h-8 w-8 mb-2 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {showCamera ? "Stop Camera" : "Live Camera"}
                </span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-2xl bg-indigo-50/80 dark:bg-indigo-500/10 p-5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:scale-105 transition-all duration-200 focus:outline-none cursor-pointer border border-indigo-200 dark:border-indigo-500/20 min-w-[130px] shadow-sm backdrop-blur-md"
                title="Upload Barcode or QR Image"
              >
                <ImageIcon className="h-8 w-8 mb-2 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Upload Image
                </span>
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 text-center max-w-md font-medium">
              Use your camera, upload a barcode photo, scan with a USB handheld
              scanner (keyboard wedge), or enter SKU manually below.
            </p>

            <div className="flex w-full max-w-xl gap-3">
              <div className="relative flex-1 group">
                <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  placeholder="Scan or type barcode / SKU..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="pl-11 h-12 bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl text-base font-mono font-semibold"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleScan}
                disabled={isScanning}
                className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                {isScanning ? (
                  "Looking up..."
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" /> Lookup
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400">
                Quick Test SKUs:
              </span>
              {["SKU-001", "SKU-002", "12345678", "PROD-100"].map((sampleSku) => (
                <button
                  key={sampleSku}
                  onClick={() => {
                    setBarcodeInput(sampleSku);
                    handleScanCode(sampleSku);
                  }}
                  className="rounded-full border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-500/10 px-3 py-1 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:scale-105 transition-all font-mono font-bold cursor-pointer"
                >
                  {sampleSku}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {showCamera && (
        <Card className="border-slate-200/80 dark:border-white/10 glass-card p-6 shadow-2xl rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center p-0 relative">
            <div className="flex w-full items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-200">
                  Live Camera Scanner
                </CardTitle>
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={handleCameraChange}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    {cameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Camera ${cam.id.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={stopCameraScan}
                className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {cameraError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-rose-50 dark:bg-slate-950/60 rounded-xl border border-rose-200 dark:border-rose-500/20">
                <AlertCircle className="h-10 w-10 text-rose-600 dark:text-rose-500 mb-3" />
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-2">
                  Camera Error
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startCameraScan(selectedCameraId)}
                    className="border-slate-200 dark:border-white/10 cursor-pointer"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Retry Camera
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                    onClick={() => {
                      stopCameraScan();
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload Barcode Image
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  id="camera-reader"
                  className="w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black min-h-[260px] shadow-inner"
                ></div>
                {isCameraLoading && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-3 animate-pulse font-bold">
                    Starting optical camera engine...
                  </p>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center font-medium">
                  Position the barcode or QR code inside the target frame to
                  scan automatically.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {batchMode && (
        <Card className="border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 backdrop-blur-xl rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Zap className="h-5 w-5" /> Live Scan Batch Audit
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                Continuous inventory counting session — keep scanning to
                accumulate items
              </CardDescription>
            </div>
            {Object.keys(batchItems).length > 0 && (
              <Button
                size="sm"
                onClick={exportBatchCsv}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" /> Download Batch CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {Object.keys(batchItems).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                No items scanned in this batch yet. Start scanning SKU codes!
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {Object.values(batchItems).map((item) => (
                  <div
                    key={item.sku}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-500/20 shadow-xs"
                  >
                    <div className="truncate pr-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                        {item.sku}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 text-base font-bold px-3 py-1">
                        ×{item.count}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-2xl">
          <CardHeader className="border-b border-slate-200/80 dark:border-white/5 pb-4">
            <CardTitle className="text-slate-900 dark:text-slate-100 font-bold">Scan result</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Product details from live inventory</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!scannedProduct ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No product scanned yet</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {scannedProduct.name}
                      </h3>
                      <Badge
                        className={
                          scannedProduct.stock > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold"
                            : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold"
                        }
                      >
                        {scannedProduct.stock > 0 ? "In Stock" : "Stock Out"}
                      </Badge>
                    </div>
                    <p className="font-mono font-medium text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {scannedProduct.sku}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setScannedProduct(null)}
                    className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Separator className="bg-slate-200 dark:bg-white/10" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Stock Level
                    </p>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                      {scannedProduct.stock}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Unit Price
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                      £{Number(scannedProduct.price || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Category
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {scannedProduct.category || "—"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Barcode Graphic
                    </p>
                    <p className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-300 mt-1 truncate">
                      {scannedProduct.barcode || scannedProduct.sku || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(scannedProduct.sku);
                      toast.success("SKU copied to clipboard!");
                    }}
                    className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy SKU
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPrintModalOpen(true)}
                    className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-indigo-700 dark:text-indigo-400 rounded-xl cursor-pointer font-bold"
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" />{" "}
                    Print Bin Label
                  </Button>

                  <Link href={`/products/${scannedProduct.id}`}>
                    <Button size="sm" variant="outline" className="border-slate-200 dark:border-white/10 rounded-xl cursor-pointer">
                      View details
                    </Button>
                  </Link>

                  <Link href="/stock-in">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer">
                      Stock In
                    </Button>
                  </Link>
                  <Link href="/stock-out">
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Stock Out
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-2xl">
          <CardHeader className="border-b border-slate-200/80 dark:border-white/5 pb-4">
            <CardTitle className="text-slate-900 dark:text-slate-100 font-bold">Recent scans</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Chronological log of scanned barcodes this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {history.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No scans yet this session</p>
            )}
            {history.map((h, idx) => (
              <div
                key={`${h.sku}-${h.scannedAt}-${idx}`}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50 px-3.5 py-2.5 text-sm hover:border-indigo-300 dark:hover:border-white/10 transition-colors"
              >
                <div>
                  <p className="font-mono font-bold text-slate-900 dark:text-slate-200">
                    {h.sku}
                  </p>
                  <p className="text-xs text-slate-500">{h.scannedAt}</p>
                </div>
                {h.result === "found" ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold">
                    <CheckCircle className="mr-1 h-3 w-3 text-emerald-600 dark:text-emerald-400" />{" "}
                    {h.name || "Found"}
                  </Badge>
                ) : (
                  <Badge className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold">
                    <AlertTriangle className="mr-1 h-3 w-3 text-rose-600 dark:text-rose-400" /> Not
                    found
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Barcode Bin Label Preview
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Ready to print for thermal labels or warehouse shelf bins.
            </DialogDescription>
          </DialogHeader>

          {scannedProduct && (
            <div className="my-4 p-6 bg-white text-slate-900 rounded-xl border border-slate-300 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                STOCKSENSE INVENTORY
              </p>
              <h4 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                {scannedProduct.name}
              </h4>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">
                Category: {scannedProduct.category || "General"}
              </p>

              <div className="my-4 py-3 px-6 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center">
                <div className="flex items-center justify-center gap-1 h-12 w-48 overflow-hidden font-mono">
                  <div className="h-full w-1 bg-black" />
                  <div className="h-full w-2 bg-black" />
                  <div className="h-full w-0.5 bg-black" />
                  <div className="h-full w-3 bg-black" />
                  <div className="h-full w-1 bg-black" />
                  <div className="h-full w-1.5 bg-black" />
                  <div className="h-full w-2 bg-black" />
                  <div className="h-full w-1 bg-black" />
                  <div className="h-full w-3 bg-black" />
                  <div className="h-full w-0.5 bg-black" />
                  <div className="h-full w-2 bg-black" />
                  <div className="h-full w-1 bg-black" />
                  <div className="h-full w-2 bg-black" />
                  <div className="h-full w-1 bg-black" />
                </div>
                <p className="font-mono text-xs font-bold tracking-widest mt-1 text-slate-800">
                  *{scannedProduct.sku}*
                </p>
              </div>

              <div className="flex items-center justify-between w-full px-4 pt-2 border-t border-slate-200 text-xs font-bold text-slate-700">
                <span>SKU: {scannedProduct.sku}</span>
                <span className="text-sm text-indigo-700 font-extrabold">
                  £{Number(scannedProduct.price || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setPrintModalOpen(false)}
              className="rounded-xl cursor-pointer"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                window.print();
                toast.success("Sent to printer!");
                setPrintModalOpen(false);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer"
            >
              <Printer className="mr-2 h-4 w-4" /> Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
