"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client";

export function BulkImportModal({ open, onOpenChange, entityType = "products" }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    let content = "";
    let filename = "";

    if (entityType === "suppliers") {
      content = "name,contact_name,email,phone,lead_time_days\nAcme Logistics,John Doe,john@acme.com,+44123456789,7\nGlobal Supply Co,Jane Smith,jane@globalsupply.com,+44987654321,10";
      filename = "supplier_import_template.csv";
    } else {
      content = "sku,name,category,purchase_price,selling_price,minimum_level\nPROD-101,Sample Widget,Electronics,12.50,25.00,10\nPROD-102,Sample Gadget,Hardware,45.00,89.99,5";
      filename = "product_import_template.csv";
    }

    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a CSV file first.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const endpoint = entityType === "suppliers" ? "/suppliers/bulk-import/" : "/products/bulk_import/";
      const res = await apiClient.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(`Bulk CSV import submitted successfully!`);
      setFile(null);
      onOpenChange(false);
    } catch (err) {
      console.error("Bulk upload error:", err);
      toast.error("Failed to process CSV file upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
              <DialogTitle className="text-base font-bold text-slate-100 uppercase tracking-wider">
                Bulk CSV Data Import ({entityType})
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Download Template Button */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Need a CSV template?</span>
              <span className="text-slate-400">Download formatted template for {entityType}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadTemplate}
              className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-cyan-400" /> Template
            </Button>
          </div>

          {/* File Upload Drag & Drop Box */}
          <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center space-y-2 bg-slate-950/40">
            <Upload className="h-8 w-8 mx-auto text-slate-400" />
            <div className="text-xs font-medium text-slate-300">
              {file ? file.name : "Select or drag & drop a .CSV file here"}
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <label htmlFor="csv-file-input">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                onClick={() => document.getElementById("csv-file-input")?.click()}
              >
                Choose CSV File
              </Button>
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs text-slate-400">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading...
                </>
              ) : (
                "Import CSV Data"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
