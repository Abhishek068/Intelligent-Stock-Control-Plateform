import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { ApiProvider } from "@/components/providers/ApiProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata = {
  title: "Stock Control System",
  description: "Intelligent Stock Control System"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={cn("font-sans antialiased selection:bg-indigo-500/30", inter.variable)} suppressHydrationWarning>
        <ApiProvider>
          {children}
        </ApiProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>);

}