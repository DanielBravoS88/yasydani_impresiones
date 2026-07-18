import type { Producto, Categoria, CreateOrderDTO, ApiResponse } from '@yasydani/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function fetcher<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error ?? `Error ${res.status}` };
    }
    return json as ApiResponse<T>;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error de red' };
  }
}

// ---- Productos ----

export async function getProducts(params?: {
  categoria?: string;
  destacado?: boolean;
  q?: string;
}): Promise<Producto[]> {
  const query = new URLSearchParams();
  if (params?.categoria) query.set('categoria', params.categoria);
  if (params?.destacado) query.set('destacado', 'true');
  if (params?.q)         query.set('q', params.q);

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await fetcher<Producto[]>(`/products${qs}`);
  return res.data ?? [];
}

export async function getProductById(id: string): Promise<Producto | null> {
  const res = await fetcher<Producto>(`/products/${encodeURIComponent(id)}`);
  return res.data ?? null;
}

// ---- Categorías ----

export async function getCategories(): Promise<Categoria[]> {
  const res = await fetcher<Categoria[]>('/categories');
  return res.data ?? [];
}

// ---- Pedidos ----

export async function createOrder(body: CreateOrderDTO) {
  return fetcher('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---- Pagos ----

export async function createMercadoPagoPreference(pedido_id: string, access_token: string) {
  return fetcher<{ preference_id: string; init_point: string }>(
    '/payments/mercadopago/create-preference',
    { method: 'POST', body: JSON.stringify({ pedido_id, access_token }) }
  );
}
