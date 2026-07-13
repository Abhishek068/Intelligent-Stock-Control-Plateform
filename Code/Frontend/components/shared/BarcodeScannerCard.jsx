










"use client";

import { useState } from "react";
import { Barcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const variants = {
  teal: {
    card: "border-teal-100 bg-teal-50/50",
    icon: "bg-teal-100 text-teal-600",
    title: "text-teal-900",
    subtitle: "text-teal-700",
    input: "border-teal-200 bg-white",
    button: "border-teal-200 text-teal-700"
  },
  blue: {
    card: "border-blue-100 bg-blue-50/50",
    icon: "bg-blue-100 text-blue-600",
    title: "text-blue-900",
    subtitle: "text-blue-700",
    input: "border-blue-200 bg-white",
    button: "border-blue-200 text-blue-700"
  }
};

export function BarcodeScannerCard({
  onScan,
  variant = "teal",
  title = "Barcode Quick-Scan",
  subtitle = "Scan or type barcode to select product",
  placeholder = "Enter barcode (e.g., SKU-001)"
}) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const v = variants[variant] || variants.teal;

  const handleScan = () => {
    const trimmed = barcodeInput.trim();
    if (trimmed) {
      onScan(trimmed);
      setBarcodeInput("");
    }
  };

  return (
    <Card className={v.card}>
      <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${v.icon}`}>
            <Barcode className="h-5 w-5" />
          </div>
          <div>
            <p className={`text-sm font-medium ${v.title}`}>{title}</p>
            <p className={`text-xs ${v.subtitle}`}>{subtitle}</p>
          </div>
        </div>
        <div className="flex w-full max-w-sm items-center gap-2">
          <Input
            placeholder={placeholder}
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleScan();
            }}
            className={v.input} />
          
          <Button variant="outline" className={v.button} onClick={handleScan}>
            Scan
          </Button>
        </div>
      </CardContent>
    </Card>);

}