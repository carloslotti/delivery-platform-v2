/**
 * Busca endereço por CEP usando ViaCEP (gratuito, sem API key)
 */
export async function fetchCep(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
} | null> {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;

  try {
    const r = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await r.json();
    if (data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      zip: cleaned,
    };
  } catch {
    return null;
  }
}

/**
 * Geocodifica endereço via Nominatim (OpenStreetMap, gratuito).
 * Em produção: trocar por Mapbox/Google Maps Geocoding pra precisão maior.
 */
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
    });
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'Accept-Language': 'pt-BR' },
    });
    const data = await r.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}
