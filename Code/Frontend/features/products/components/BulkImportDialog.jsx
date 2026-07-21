"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, X, AlertCircle, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { productsApi } from "@/lib/api";

export function BulkImportDialog({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setErrors([]);
      } else {
        toast.error("Please upload a valid .csv file");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        setErrors([]);
      } else {
        toast.error("Please select a valid .csv file");
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setErrors([]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setImporting(true);
    setErrors([]);
    try {
      const res = await productsApi.bulkImport(file);
      if (res.success) {
        toast.success(`Successfully imported ${res.count} products!`);
        onSuccess();
        onOpenChange(false);
        setFile(null);
      } else {
        setErrors(res.errors || [res.error || "Failed to import products."]);
      }
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors([err.message || "Failed to process the import."]);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all ${
              dragActive ? "border-indigo-500 bg-indigo-500/10" : "border-slate-800 hover:border-slate-700 bg-slate-900/20"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-200 mb-1">
                  Drag and drop your CSV file here
                </p>
                <p className="text-xs text-slate-400 mb-4">or click to browse from files</p>
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => document.getElementById("csv-upload").click()}
                >
                  Choose File
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full bg-slate-900/80 rounded-lg p-3 border border-slate-850">
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-indigo-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-200 max-w-[280px] truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  disabled={importing}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 bg-slate-950/40 border border-white/5 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-slate-400">CSV Template headers required:</p>
            <p className="font-mono text-indigo-400 text-[10px] break-all">sku, name, category, supplier, unit_price, minimum_level, reorder_level, barcode, description</p>
            <p className="mt-2 text-slate-400">* Organization scoping is auto-configured; suppliers must be created beforehand.</p>
          </div>

          {errors.length > 0 && (
            <div className="border border-rose-500/20 bg-rose-500/5 text-rose-400 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Import Failed ({errors.length} errors)</span>
              </div>
              <ul className="text-xs font-mono max-h-[120px] overflow-y-auto list-disc pl-4 space-y-1 text-rose-300">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleUpload}
            disabled={!file || importing}
          >
            {importing ? "Importing..." : "Upload and Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
