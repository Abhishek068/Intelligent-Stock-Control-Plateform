import { apiClient, unwrapList } from "@/lib/api/client";

export const stockApi = {
  stockIn(data) {
    return apiClient.post("/stock-in/", data);
  },

  bulkStockIn(data) {
    return apiClient.post("/stock-in/bulk-receive/", data);
  },

  stockOut(data) {
    return apiClient.post("/stock-out/", data);
  },

  bulkStockOut(data) {
    return apiClient.post("/stock-out/bulk-dispatch/", data);
  },

  adjust(data) {
    return apiClient.post("/stock-adjustments/", data);
  },

  transfer(data) {
    return apiClient.post("/stock-transfers/", data);
  },

  async listTransfers(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/stock-transfers/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  shipTransfer(id, productId) {
    return apiClient.post(`/stock-transfers/${id}/ship/`, { product_id: productId });
  },

  completeTransfer(id, productId) {
    return apiClient.post(`/stock-transfers/${id}/complete/`, { product_id: productId });
  },

  cancelTransfer(id) {
    return apiClient.post(`/stock-transfers/${id}/cancel/`);
  },

  async downloadTransferPdf(id) {
    const res = await apiClient.get(`/stock-transfers/${id}/pdf/`, { responseType: "blob" });
    const blob = new Blob([res], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Transfer-TR-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async listStockIn(productId) {
    const query = productId ? `?product=${productId}` : "";
    const res = await apiClient.get(`/stock-in/${query}`);
    return unwrapList(res);
  },

  async listStockOut(productId) {
    const query = productId ? `?product=${productId}` : "";
    const res = await apiClient.get(`/stock-out/${query}`);
    return unwrapList(res);
  },

  async listAdjustments(productId) {
    const query = productId ? `?product=${productId}` : "";
    const res = await apiClient.get(`/stock-adjustments/${query}`);
    return unwrapList(res);
  },

  async listStockTakes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/stock-takes/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  getStockTake(id) {
    return apiClient.get(`/stock-takes/${id}/`);
  },

  createStockTake(data) {
    return apiClient.post("/stock-takes/", data);
  },

  deleteStockTake(id) {
    return apiClient.delete(`/stock-takes/${id}/`);
  },

  startStockTake(id) {
    return apiClient.post(`/stock-takes/${id}/start/`);
  },

  recordStockTakeCounts(id, counts) {
    return apiClient.post(`/stock-takes/${id}/record_counts/`, { counts });
  },

  completeStockTake(id, applyAdjustments = true) {
    return apiClient.post(`/stock-takes/${id}/complete/`, {
      apply_adjustments: applyAdjustments,
    });
  },

  cancelStockTake(id) {
    return apiClient.post(`/stock-takes/${id}/cancel/`);
  },

  async listBatches(params = {}) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null))
    ).toString();
    const res = await apiClient.get(`/batches/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  triggerExpiryScan() {
    return apiClient.post("/batches/trigger_expiry_scan/");
  },

  getExpirySummary() {
    return apiClient.get("/batches/expiry_summary/");
  },

  async listSupplierReturns(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await apiClient.get(`/supplier-returns/${qs ? `?${qs}` : ""}`);
    return unwrapList(res);
  },

  getSupplierReturn(id) {
    return apiClient.get(`/supplier-returns/${id}/`);
  },

  createSupplierReturn(data) {
    return apiClient.post("/supplier-returns/", data);
  },

  shipSupplierReturn(id) {
    return apiClient.post(`/supplier-returns/${id}/ship/`);
  },

  completeSupplierReturn(id) {
    return apiClient.post(`/supplier-returns/${id}/complete/`);
  },

  cancelSupplierReturn(id) {
    return apiClient.post(`/supplier-returns/${id}/cancel/`);
  },

  downloadSupplierReturnSlip(ret) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items = ret.items || [
      {
        product_name: ret.product_name || "Returned Item",
        quantity: ret.quantity || 1,
        unit_cost: ret.unit_cost || "0.00",
        total_cost: ret.total_cost || (Number(ret.quantity || 1) * Number(ret.unit_cost || 0)).toFixed(2),
      },
    ];

    const totalValue = items.reduce((s, item) => s + (Number(item.total_cost) || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Supplier Return Advice Note #${ret.id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .ref-box { text-align: right; }
          .ref-number { font-size: 20px; font-weight: 700; color: #e11d48; font-family: monospace; }
          .badge { display: inline-block; padding: 4px 12px; background: #ffe4e6; color: #be123c; font-size: 12px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 30px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .card-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .card-value { font-size: 15px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
          th { background: #f1f5f9; text-align: left; padding: 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
          .number { font-family: monospace; font-weight: 600; }
          .total-row td { font-weight: 800; font-size: 16px; background: #f8fafc; border-top: 2px solid #0f172a; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; pt-20; }
          .sig-line { border-top: 1px solid #94a3b8; margin-top: 50px; text-align: center; font-size: 12px; color: #64748b; font-weight: 600; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Central Warehouse — Goods Return Advice</div>
            <div class="subtitle">Official Supplier Credit & Dispatch Slip</div>
          </div>
          <div class="ref-box">
            <div class="ref-number">RETURN #${ret.id}</div>
            <div class="badge" style="margin-top:6px;">${ret.status || 'SHIPPED'}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Returned To (Supplier)</div>
            <div class="card-value">${ret.supplier_name || 'Vendor Supplier'}</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">Dispatched from Central Warehouse Hub</div>
          </div>
          <div class="card">
            <div class="card-title">Return Details</div>
            <div class="card-value">Date: ${new Date().toLocaleDateString('en-GB')}</div>
            <div style="font-size:12px; color:#e11d48; font-weight:600; margin-top:4px;">Reason: ${ret.reason || 'Damaged / Defective Goods'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th style="text-align:center;">Qty Returned</th>
              <th style="text-align:right;">Unit Cost (£)</th>
              <th style="text-align:right;">Total Credit Value (£)</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td><strong>${item.product_name || ret.product_name || 'Returned Product'}</strong></td>
                <td style="text-align:center;" class="number">${item.quantity || ret.quantity || 1}</td>
                <td style="text-align:right;" class="number">£${Number(item.unit_cost || ret.unit_cost || 0).toFixed(2)}</td>
                <td style="text-align:right;" class="number">£${Number(item.total_cost || (Number(item.quantity || ret.quantity || 1) * Number(item.unit_cost || ret.unit_cost || 0))).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td colSpan="3" style="text-align:right;">Total Refund / Credit Claim:</td>
              <td style="text-align:right;" class="number">£${totalValue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="sig-line">Warehouse Manager Signature & Date</div>
          </div>
          <div>
            <div class="sig-line">Supplier Courier Receipt & Stamp</div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  },
};
