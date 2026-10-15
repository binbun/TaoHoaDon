const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export interface PublicProduct {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  shortDescription: string | null;
  cabinetWidth: string | null;
  dimensions: string | null;
  unit: string;
}

export interface PublicBrand {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
  description: string | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQuery {
  search?: string;
  brand?: string;
  category?: string;
  page?: number;
}

async function get<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/public${endpoint}`);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || `Lỗi yêu cầu: ${response.statusText}`);
  }
  return body as T;
}

export function fetchProducts(query: ProductQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.brand) params.set('brand', query.brand);
  if (query.category) params.set('category', query.category);
  params.set('page', String(query.page || 1));
  return get<{ data: PublicProduct[]; pagination: Pagination }>(`/products?${params}`);
}

export async function fetchProduct(id: string) {
  return (await get<{ data: PublicProduct }>(`/products/${encodeURIComponent(id)}`)).data;
}

export async function fetchBrands() {
  return (await get<{ data: PublicBrand[] }>('/brands')).data;
}

export async function fetchCategories() {
  return (await get<{ data: string[] }>('/categories')).data;
}
