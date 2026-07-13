




import { useCallback } from "react";
import { toast } from "sonner";

export function useExcelExport() {
  const exportToExcel = useCallback(async (data, filename = "report") => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success("Excel file downloaded");
    } catch (error) {
      toast.error("Failed to export Excel file");
      console.error("Excel export error:", error);
    }
  }, []);

  return { exportToExcel };
}