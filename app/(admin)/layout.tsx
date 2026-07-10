import { Navbar } from "@/components/Navbar";
import OfflineSyncInit from "@/components/OfflineSyncInit";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <OfflineSyncInit />
      <Navbar />
      
      {/* Main content area */}
      <main className="flex-1 pt-20 transition-all">
        <div className="max-w-7xl mx-auto p-6 md:p-8 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
