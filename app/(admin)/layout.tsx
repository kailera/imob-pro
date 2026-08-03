import { Navbar } from "@/components/shared/Navbar";
import OfflineSyncInit from "@/components/shared/OfflineSyncInit";
import { PWAProvider } from "@/components/shared/PWAProvider";
import { Metadata, Viewport } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Imob Pro",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#004777",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { ativo: true },
  });

  if (!user?.ativo) {
    notFound();
  }

  return (
    <PWAProvider>
      <div className="min-h-screen flex flex-col">
        <OfflineSyncInit />
        <Navbar />

        {/* Main content area */}
        <main className="min-w-0 flex-1 pt-20 transition-all">
          <div className="max-w-7xl mx-auto p-6 md:p-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </PWAProvider>
  );
}
