"use client";

import { useEffect, useState } from "react";
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
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [jobId, setJobId] = useState(null);

  const isSupportedFile = (candidate) =>
    /\.(csv|xlsx|xls)$/i.test(candidate?.name || "");

  useEffect(() => {
    let timer;
    const poll = async (jobId) => {
      try {
        const response = await productsApi.getBulkImportStatus(jobId);
        const job = response.data;
        setProgress(job.progress || 0);
        setStatus(job.status || "");
        if (job.status === "completed") {
          toast.success(`Successfully imported ${job.imported_count} products!`);
          onSuccess();
          onOpenChange(false);
          setFile(null);
          setImporting(false);
          return;
        }
        if (job.status === "failed") {
          setErrors(job.errors || ["Failed to import products."]);
          setImporting(false);
          return;
        }
        timer = window.setTimeout(() => poll(jobId), 1500);
      } catch (error) {
        setErrors([error.message || "Unable to check import status."]);
        setImporting(false);
      }
    };
    if (jobId) poll(jobId);
    return () => window.clearTimeout(timer);
  }, [jobId, onOpenChange, onSuccess]);

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
      if (isSupportedFile(droppedFile)) {
        setFile(droppedFile);
        setErrors([]);
      } else {
        toast.error("Please upload a valid CSV or Excel file");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (isSupportedFile(selectedFile)) {
        setFile(selectedFile);
        setErrors([]);
      } else {
        toast.error("Please select a valid CSV or Excel file");
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setErrors([]);
    setProgress(0);
    setStatus("");
    setJobId(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setImporting(true);
    setErrors([]);
    try {
      const res = await productsApi.bulkImport(file);
      if (res.success) {
        setProgress(res.data?.progress || 0);
        setStatus(res.data?.status || "pending");
        setJobId(res.data?.id || null);
      } else {
        setErrors(res.errors || [res.error || "Failed to import products."]);
      }
    } catch (err) {
      if (err.details?.errors) {
        setErrors(err.details.errors);
      } else {
        setErrors([err.message || "Failed to process the import."]);
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white font-bold text-lg">Bulk Import Products</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div
            className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/20"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Drag and drop your CSV or Excel file here
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">or click to browse from files</p>
                <input
                  type="file"
                  id="product-import-upload"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => document.getElementById("product-import-upload").click()}
                  className="rounded-xl cursor-pointer"
                >
                  Choose File
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full bg-slate-100 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-200 dark:border-slate-850">
                <div className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 max-w-[280px] truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  disabled={importing}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl p-3 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-400">CSV / Excel headers required:</p>
            <p className="font-mono text-indigo-600 dark:text-indigo-400 text-[10px] break-all font-medium">sku, name, category, supplier, unit_price, minimum_level, reorder_level, barcode, description</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">* Organization scoping is auto-configured; suppliers must be created beforehand.</p>
          </div>

          {errors.length > 0 && (
            <div className="border border-rose-500/20 bg-rose-50 dark:bg-rose-500/5 text-rose-700 dark:text-rose-400 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Import Failed ({errors.length} errors)</span>
              </div>
              <ul className="text-xs font-mono max-h-[120px] overflow-y-auto list-disc pl-4 space-y-1 text-rose-600 dark:text-rose-300">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {importing && (
            <div className="space-y-2 rounded-xl border border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/5 p-3 text-sm text-indigo-700 dark:text-indigo-200">
              <div className="flex justify-between">
                <span>{status.startsWith("job:") ? "Starting import…" : status || "Uploading…"}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
            onClick={handleUpload}
            disabled={!file || importing}
          >
            {importing ? "Processing..." : "Upload and Validate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
