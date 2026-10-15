import * as real from './client';
import * as mock from './mock';

export type { PublicProduct, PublicBrand, Pagination, ProductQuery, ProductSort } from './client';

// Mock data by default. Set VITE_USE_MOCK=false to read from /api/public.
const api = import.meta.env.VITE_USE_MOCK === 'false' ? real : mock;

export const { fetchProducts, fetchProduct, fetchBrands, fetchCategories, fetchRelatedProducts } = api;
