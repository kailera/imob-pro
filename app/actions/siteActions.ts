"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  mediaUrl: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
}

export interface ReviewItem {
  id: string;
  author: string;
  role?: string;
  comment: string;
  rating: number;
  avatarUrl?: string;
}

export interface SiteConfigData {
  services: ServiceItem[];
  mediaItems: MediaItem[];
  reviews: ReviewItem[];
}

export async function getSiteConfig(): Promise<{
  success: boolean;
  data?: SiteConfigData;
  error?: string;
}> {
  try {
    if (!prisma.siteConfig) {
      return {
        success: true,
        data: {
          services: [],
          mediaItems: [],
          reviews: [],
        },
      };
    }

    const config = await prisma.siteConfig.findUnique({
      where: { id: "default" },
    });

    if (!config) {
      return {
        success: true,
        data: {
          services: [],
          mediaItems: [],
          reviews: [],
        },
      };
    }

    return {
      success: true,
      data: {
        services: (config.services as unknown as ServiceItem[]) || [],
        mediaItems: (config.mediaItems as unknown as MediaItem[]) || [],
        reviews: (config.reviews as unknown as ReviewItem[]) || [],
      },
    };
  } catch (error: any) {
    console.error("Erro ao buscar configurações do site:", error);
    return {
      success: false,
      error: error.message || "Erro ao buscar configurações do site.",
    };
  }
}

export async function updateSiteConfig(data: Partial<SiteConfigData>): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    if (!prisma.siteConfig) {
      return {
        success: false,
        error: "Modelo de banco de dados não carregado. Reinicie o servidor dev.",
      };
    }

    const existing = await prisma.siteConfig.findUnique({
      where: { id: "default" },
    });

    const updateData: any = {};
    if (data.services !== undefined) updateData.services = data.services as any;
    if (data.mediaItems !== undefined) updateData.mediaItems = data.mediaItems as any;
    if (data.reviews !== undefined) updateData.reviews = data.reviews as any;

    if (existing) {
      await prisma.siteConfig.update({
        where: { id: "default" },
        data: updateData,
      });
    } else {
      await prisma.siteConfig.create({
        data: {
          id: "default",
          services: (data.services || []) as any,
          mediaItems: (data.mediaItems || []) as any,
          reviews: (data.reviews || []) as any,
        },
      });
    }

    revalidatePath("/");
    revalidatePath("/crm/site");

    return {
      success: true,
      message: "Configurações do site salvas com sucesso!",
    };
  } catch (error: any) {
    console.error("Erro ao atualizar configurações do site:", error);
    return {
      success: false,
      error: error.message || "Erro ao atualizar configurações do site.",
    };
  }
}
