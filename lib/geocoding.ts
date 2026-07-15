/**
 * Utilitário de Geocodificação utilizando a API gratuita do Nominatim (OpenStreetMap).
 * Respeita as políticas de uso do Nominatim:
 * - User-Agent descritivo obrigatório
 * - Fallbacks de busca para garantir coordenadas aproximadas
 */

interface GeocodeInput {
  cep: number;
  numero: number;
  bairro: string;
  cidade: string;
  uf: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

export async function geocodeAddress(input: GeocodeInput): Promise<{ latitude: number; longitude: number } | null> {
  const userAgent = "ScatolinImoveisApp/1.0 (contato@scatolin.com.br)";
  
  // Formatando o CEP (ex: 15385000 -> 15385-000)
  const cepStr = String(input.cep).padStart(8, "0");
  const cepFormatado = `${cepStr.slice(0, 5)}-${cepStr.slice(5)}`;

  // Lista de tentativas de busca (do mais específico ao mais genérico)
  const queries = [
    // 1. Endereço completo com Número, Bairro, Cidade, UF e CEP
    `${input.numero} ${input.bairro}, ${input.cidade} - ${input.uf}, ${cepFormatado}, Brazil`,
    // 2. Apenas Bairro, Cidade, UF e CEP
    `${input.bairro}, ${input.cidade} - ${input.uf}, ${cepFormatado}, Brazil`,
    // 3. Apenas CEP e Cidade
    `${cepFormatado}, ${input.cidade} - ${input.uf}, Brazil`,
    // 4. Apenas Cidade e UF
    `${input.cidade} - ${input.uf}, Brazil`
  ];

  for (const query of queries) {
    try {
      console.log(`[Nominatim] Tentando geocodificar: "${query}"`);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
        },
      });

      if (!response.ok) {
        console.warn(`[Nominatim] Erro na resposta HTTP: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = (await response.json()) as NominatimResult[];

      if (data && data.length > 0) {
        const result = data[0];
        const latitude = parseFloat(result.lat);
        const longitude = parseFloat(result.lon);

        if (!isNaN(latitude) && !isNaN(longitude)) {
          console.log(`[Nominatim] Sucesso! Coordenadas encontradas para "${query}": ${latitude}, ${longitude}`);
          return { latitude, longitude };
        }
      }
    } catch (error) {
      console.error(`[Nominatim] Falha ao consultar endereço "${query}":`, error);
    }

    // Delay de segurança entre tentativas para evitar rate-limiting caso ocorra muito rápido
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.warn(`[Nominatim] Não foi possível encontrar coordenadas para o imóvel: CEP ${input.cep}, Nº ${input.numero}`);
  return null;
}
