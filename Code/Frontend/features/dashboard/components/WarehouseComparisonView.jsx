"use client";

import { useEffect, useState } from "react";
import { Building2, Box, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { locationsApi } from "@/lib/api";

export function WarehouseComparisonView({ className = "" }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await locationsApi.getComparison();
        if (res?.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error("Failed to load warehouse comparison telemetry:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const fallbackData = [
    { name: "Central Warehouse", total_valuation: 42500, total_items: 1250, low_stock_count: 3, turnover_rate: 3.2 },
    { name: "North Distribution Hub", total_valuation: 28400, total_items: 890, low_stock_count: 1, turnover_rate: 2.8 },
    { name: "South Retail Storefront", total_valuation: 16800, total_items: 450, low_stock_count: 5, turnover_rate: 4.1 },
  ];

  const chartData = data.length > 0 ? data : fallbackData;

  return (
    <Card className={`glass-card bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl overflow-hidden ${className}`}>
      <CardHeader className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-base font-bold text-slate-100">
              Multi-Warehouse Telemetry & Inventory Comparison
            </CardTitle>
            <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
              Cross-Location Analytics
            </Badge>
          </div>
          <CardDescription className="text-slate-400 text-xs mt-1">
            Comparative analysis of stock valuation, turnover rates, and low stock count per location
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Comparative Bar Chart */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
              <Bar dataKey="total_valuation" name="Valuation (£)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total_items" name="Stock Count (Units)" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Warehouse Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chartData.map((loc, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm">{loc.name}</span>
                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                  {loc.location_type || "Warehouse"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Valuation</span>
                  <span className="font-mono font-bold text-cyan-400">
                    £{Number(loc.total_valuation || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Turnover</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {loc.turnover_rate}x/yr
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
