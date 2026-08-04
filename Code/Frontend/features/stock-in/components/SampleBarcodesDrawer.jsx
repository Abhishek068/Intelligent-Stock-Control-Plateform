"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Barcode, Printer, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function SampleBarcodesDrawer({ isOpen, onClose, products, onScanSuccess }) {
  const handleSelect = (prod) => {
    onScanSuccess(prod.sku || prod.name);
    toast.success(`Barcode Scanned: ${prod.sku || prod.name}`);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="bg-slate-900 text-white border-slate-800 w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Barcode className="h-5 w-5 text-emerald-400" /> Printable Barcode Labels
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-400">
            Click any barcode label to simulate a hardware gun scan or view product SKU barcodes.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 my-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              onClick={() => handleSelect(prod)}
              className="group cursor-pointer p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/60 hover:bg-slate-950 transition-all duration-200 shadow-md space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                  {prod.name}
                </span>
                <Badge variant="outline" className="border-slate-700 text-slate-400 text-[10px]">
                  {prod.category || "General"}
                </Badge>
              </div>

             
              <div className="flex items-center justify-center h-14 bg-white rounded-lg p-2 gap-1 overflow-hidden shadow-inner">
                <div className="flex items-center h-full gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 1, 2, 4, 2, 1, 3, 2, 4, 1, 3].map((w, idx) => (
                    <div
                      key={idx}
                      className="bg-black h-full"
                      style={{ width: `${w * 1.5}px`, marginRight: idx % 3 === 0 ? "2px" : "0px" }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-mono text-emerald-400 font-semibold">{prod.sku || `SKU-00${prod.id}`}</span>
                <span className="text-slate-400 text-[11px] group-hover:text-emerald-300 font-medium">
                  Click to Scan
                </span>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
