import { prisma } from "@/lib/prisma";
import { MapSearchContainer } from "@/components/public/MapSearchContainer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Buscar Imóveis | Scatolin Imóveis",
  description: "Encontre imóveis no mapa e veja as melhores oportunidades de compra e aluguel.",
};

export default async function ImoveisSearchPage() {
  const rawImoveis = await prisma.imovel.findMany({
    where: {
      publicado: true,
      NOT: {
        codigo: {
          startsWith: "LOTE-"
        }
      }
    },
    orderBy: {
      codigo: "desc"
    }
  });

  const properties = rawImoveis.map((im) => ({
    id: im.id,
    title: im.titulo || "Imóvel Scatolin",
    type: im.tipo === "CASA" ? "Casa" : im.tipo === "CONDOMINIO" ? "Apartamento" : im.tipo === "LOTE" ? "Lote" : im.tipo === "COMERCIAL" ? "Comercial" : "Rural",
    price: im.forLocacao ? (im.valorAluguel ? im.valorAluguel / 100 : 0) : (im.valorVenda ? im.valorVenda / 100 : 0),
    operation: im.forLocacao ? ("locacao" as const) : ("venda" as const),
    beds: im.quartos || 0,
    baths: im.banheiros || 0,
    parking: im.vagas || 0,
    area: im.area || 0,
    image: im.imagens?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    images: im.imagens || [],
    description: im.descricao || "",
    neighborhood: im.bairro,
    city: `${im.cidade}/${im.uf}`,
    latitude: im.latitude,
    longitude: im.longitude
  }));

  return (
    <div className="w-full bg-zinc-50">
      <MapSearchContainer initialProperties={properties} />
    </div>
  );
}
