"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Camera, Volume2, VolumeX, CheckCircle2, Zap, Barcode } from "lucide-react";
import { toast } from "sonner";

export function CameraScannerModal({ isOpen, onClose, onScanSuccess, products }) {
  const [isScanning, setIsScanning] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannedProduct, setScannedProduct] = useState(null);


  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio play prevented");
    }
  };

  const handleSimulatedCamScan = (prod) => {
    playBeep();
    setScannedProduct(prod);
    toast.success(`Barcode Scanned: ${prod.sku || prod.name}`);
    setTimeout(() => {
      onScanSuccess(prod.sku || prod.name);
      onClose();
    }, 600);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900/95 border-emerald-500/30 text-white backdrop-blur-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-400" /> Camera Barcode Scanner
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </Button>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Position a product barcode inside the camera viewfinder frame to scan.
          </DialogDescription>
        </DialogHeader>


        <div className="relative my-3 h-64 w-full overflow-hidden rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-inner flex flex-col items-center justify-center">

          <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-pulse top-1/2 -translate-y-1/2 z-20 pointer-events-none" />

          <div className="absolute inset-8 border-2 border-dashed border-emerald-500/40 rounded-xl pointer-events-none z-10 flex items-center justify-center">
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
          </div>


          <div className="z-10 text-center space-y-2 p-4">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse">
              <Zap className="mr-1 h-3 w-3" /> Live Laser Detection Active
            </Badge>
            <p className="text-[11px] text-slate-400">
              Align 1D/2D Barcode or SKU label in center
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Quick-Scan SKU Simulation</span>
            <span className="text-[10px] text-slate-500">Tap SKU to test scan</span>
          </Label>

          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
            {products.slice(0, 6).map((prod) => (
              <button
                key={prod.id}
                onClick={() => handleSimulatedCamScan(prod)}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/50 hover:bg-slate-800 text-left transition-all text-xs group"
              >
                <Barcode className="h-4 w-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                <div className="truncate">
                  <div className="font-semibold text-slate-200 truncate">{prod.name}</div>
                  <div className="font-mono text-[10px] text-emerald-400">{prod.sku || `SKU-${prod.id}`}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
