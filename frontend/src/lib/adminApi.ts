import { supabaseBrowser } from './supabase-browser';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/** Obtiene el access_token de la sesión activa para llamadas al backend */
async function getToken(): Promise<string> {
  const { data: { session } } = await supabaseBrowser.auth.getSession();
  return session?.access_token ?? '';
}

export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; total?: number }> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });
  const contentType = res.headers.get('content-type') ?? '';
  const json = contentType.includes('application/json')
    ? await res.json()
    : { success: false, error: (await res.text()) || `Error ${res.status}` };
  if (!res.ok || !json.success) {
    return { success: false, error: json.error ?? `Error ${res.status}` };
  }
  return json;
}

export async function adminUpload(
  path: string,
  file: File
): Promise<{ success: boolean; data?: { url: string }; error?: string }> {
  const token = await getToken();
  const form  = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}${path}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });
  return res.json();
}

// ─── Wrappers tipados ─────────────────────────────────────────────────────────

export const adminAPI = {
  getCategories: ()                            => adminFetch('/admin/categories'),
  // Productos
  getProducts:   (params?: string)           => adminFetch(`/admin/products${params ? '?' + params : ''}`),
  getProduct:    (id: string)                => adminFetch(`/admin/products/${id}`),
  createProduct: (body: object)              => adminFetch('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: object)  => adminFetch(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: string)                => adminFetch(`/admin/products/${id}`, { method: 'DELETE' }),
  uploadImage:   (id: string, file: File)    => adminUpload(`/admin/products/${id}/images`, file),
  setMainImage:  (id: string, imageId: string) => adminFetch(`/admin/products/${id}/images/${imageId}/main`, { method: 'PUT' }),
  deleteImage:   (id: string, imageId: string) => adminFetch(`/admin/products/${id}/images/${imageId}`, { method: 'DELETE' }),

  // Pedidos
  getOrders:     (params?: string)           => adminFetch(`/admin/orders${params ? '?' + params : ''}`),
  updateStatus:  (id: string, status: string)=> adminFetch(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Stock
  getStock:      ()                          => adminFetch('/admin/stock'),
  adjustStock:   (body: object)              => adminFetch('/admin/stock/adjust', { method: 'POST', body: JSON.stringify(body) }),

  // Reportes
  getReports:    (period?: string)           => adminFetch(`/admin/reports${period ? '?period=' + period : ''}`),

  // Clientes
  getClients:    (q?: string)                => adminFetch(`/admin/clients${q ? '?q=' + q : ''}`),

  // Dashboard
  getDashboard:  ()                          => adminFetch('/admin/dashboard'),
};
