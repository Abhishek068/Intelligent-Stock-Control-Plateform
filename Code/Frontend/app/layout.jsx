import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

export const metadata = {
  title: "Stock Control System",
  description: "Intelligent Stock Control System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={cn("font-sans antialiased", "bg-slate-50 text-slate-900")}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}