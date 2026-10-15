import type { Pagination, ProductQuery, PublicBrand, PublicProduct } from './client';

const BRANDS: PublicBrand[] = [
  { id: 'grob', name: 'GROB', code: 'GROB', color: '#1B9550', description: 'Phụ kiện tủ bếp thông minh Inox SUS304 GROB' },
  { id: 'euplus', name: 'EUPLUS', code: 'EUPLUS', color: '#0D4EA0', description: 'Phụ kiện tủ bếp & thiết bị nhà bếp EUPLUS' },
  { id: 'blum', name: 'BLUM', code: 'BLUM', color: '#FF6724', description: 'Tay nâng Aventos & bản lề cao cấp BLUM (Áo)' },
  { id: 'euroking', name: 'EUROKING', code: 'EUROKING', color: '#1C4C8F', description: 'Phụ kiện inox & tủ bếp EUROKING' },
  { id: 'kingenblu', name: 'KINGENBLU', code: 'KINGENBLU', color: '#247948', description: 'Phụ kiện tủ bếp KINGENBLU' },
];

const WIDE = ['600', '700', '800', '900'];

const FEATURES_BY_CATEGORY: Record<string, string[]> = {
  'Giá bát đĩa xoong nồi': [
    'Inox SUS304 chống gỉ, dễ vệ sinh',
    'Ray giảm chấn kéo toàn phần, đóng êm',
    'Khay hứng nước bằng nhựa ABS tháo rời',
  ],
  'Giá bát đĩa cố định tủ trên': [
    'Khung nhôm hợp kim nhẹ, chịu lực tốt',
    'Nan inox xếp bát đĩa theo từng kích cỡ',
    'Khay hứng nước có thể rút ra để vệ sinh',
  ],
  'Giá bát đĩa nâng hạ': [
    'Kéo xuống ngang tầm tay, không cần với cao',
    'Piston trợ lực, nâng hạ nhẹ nhàng',
    'Phù hợp tủ bếp trên có chiều cao lớn',
  ],
  'Giá dao thớt, gia vị': [
    'Thiết kế nhỏ gọn cho khoang tủ hẹp',
    'Ngăn đựng dao, thớt và chai lọ gia vị riêng biệt',
    'Ray giảm chấn ẩn dưới đáy',
  ],
  'Mâm xoay góc tủ': [
    'Tận dụng tối đa góc chết của tủ bếp',
    'Trục xoay chắc chắn, xoay êm 360°',
    'Mâm đáy chống trượt, có gờ giữ đồ',
  ],
  'Tủ kho phụ kiện': [
    'Nhiều tầng chứa đồ khô, chai lọ',
    'Cánh mở đồng bộ, kéo cả khung ra ngoài',
    'Khung thép sơn tĩnh điện chịu tải lớn',
  ],
  'Thùng rác thông minh': [
    'Âm tủ, đóng mở theo cánh tủ',
    'Chia ngăn phân loại rác tiện lợi',
    'Nắp kín hạn chế mùi',
  ],
  'Thùng gạo thông minh': [
    'Định lượng gạo chính xác mỗi lần lấy',
    'Kín khí, chống ẩm mốc và côn trùng',
    'Mặt gương sang trọng, dễ lau chùi',
  ],
  'Kệ góc liên hoàn': [
    'Kéo cả hai khay ra ngoài cùng lúc',
    'Giải pháp tối ưu cho góc tủ chữ L',
    'Hệ ray giảm chấn êm ái',
  ],
  'Tay nâng tủ trên': [
    'Dừng ở mọi vị trí mở',
    'Đóng êm với Blumotion tích hợp',
    'Lắp đặt và cân chỉnh nhanh không cần dụng cụ',
  ],
  'Bản lề': [
    'Giảm chấn Blumotion đóng êm',
    'Lắp tháo nhanh bằng cơ chế Clip',
    'Chịu được 200.000 lần đóng mở',
  ],
  'Ray & hộp kéo': [
    'Ray âm giảm chấn, tải trọng đến 65 kg',
    'Thành hộp mỏng, thiết kế tối giản',
    'Kéo toàn phần, dễ lấy đồ phía trong',
  ],
};

type Seed = [
  code: string,
  brand: string,
  category: string,
  name: string,
  widths: string[],
  dimensions: string | null,
  flags?: { isNew?: boolean; isBestSeller?: boolean },
];

const SEEDS: Seed[] = [
  ['EP.260', 'EUPLUS', 'Giá bát đĩa cố định tủ trên', 'Giá bát đĩa khung nhôm Inox SUS304', WIDE, '564 x 280 x 470 mm', { isBestSeller: true }],
  ['EP.120', 'EUPLUS', 'Giá bát đĩa xoong nồi', 'Giá xoong nồi bát đĩa ray giảm chấn Inox 304', WIDE, '564 x 470 x 190 mm', { isBestSeller: true }],
  ['EP.310', 'EUPLUS', 'Giá dao thớt, gia vị', 'Giá dao thớt gia vị nan dẹt Inox 304', ['300', '350', '400'], '264 x 470 x 500 mm', { isNew: true }],
  ['EP.450', 'EUPLUS', 'Giá bát đĩa nâng hạ', 'Giá bát đĩa nâng hạ tủ trên piston trợ lực', WIDE, '564 x 280 x 600 mm', { isNew: true }],
  ['EP.520', 'EUPLUS', 'Mâm xoay góc tủ', 'Mâm xoay 3/4 góc tủ Inox 304', ['800', '900'], 'Ø 710 mm', {}],
  ['EP.610', 'EUPLUS', 'Tủ kho phụ kiện', 'Tủ kho 5 tầng cánh mở đồng bộ', ['450', '600'], '410 x 490 x 1800 mm', { isBestSeller: true }],
  ['EP.710', 'EUPLUS', 'Thùng rác thông minh', 'Thùng rác âm tủ 2 ngăn phân loại', ['400', '450'], '360 x 470 x 400 mm', {}],
  ['EP.810', 'EUPLUS', 'Thùng gạo thông minh', 'Thùng gạo âm tủ mặt gương 25 kg', ['300'], '264 x 470 x 610 mm', { isNew: true }],
  ['EP.910', 'EUPLUS', 'Kệ góc liên hoàn', 'Kệ góc liên hoàn mở trái / phải', ['900'], '850 x 500 x 560 mm', {}],
  ['GR.101', 'GROB', 'Giá bát đĩa xoong nồi', 'Giá xoong nồi nan tròn Inox SUS304', WIDE, '564 x 470 x 190 mm', { isBestSeller: true }],
  ['GR.205', 'GROB', 'Giá bát đĩa cố định tủ trên', 'Giá bát đĩa cố định tủ trên nan dẹt', WIDE, '564 x 280 x 460 mm', {}],
  ['GR.330', 'GROB', 'Giá dao thớt, gia vị', 'Giá gia vị 3 tầng Inox SUS304', ['200', '250', '300'], '164 x 470 x 500 mm', { isBestSeller: true }],
  ['GR.410', 'GROB', 'Giá bát đĩa nâng hạ', 'Giá bát nâng hạ tủ trên tay kéo', ['700', '800', '900'], '664 x 280 x 600 mm', {}],
  ['GR.560', 'GROB', 'Mâm xoay góc tủ', 'Mâm xoay 1/2 góc tủ nan tròn', ['800', '900'], 'Ø 760 mm', {}],
  ['GR.620', 'GROB', 'Tủ kho phụ kiện', 'Tủ đồ khô 6 tầng ray giảm chấn', ['450', '600'], '410 x 490 x 2000 mm', { isNew: true }],
  ['BL.AVHF', 'BLUM', 'Tay nâng tủ trên', 'Tay nâng gập đôi Aventos HF', [], 'Cánh cao 480 – 1040 mm', {}],
  ['BL.AVHK', 'BLUM', 'Tay nâng tủ trên', 'Tay nâng lật lên Aventos HK-S', [], 'Cánh cao 180 – 400 mm', { isBestSeller: true }],
  ['BL.CLIP', 'BLUM', 'Bản lề', 'Bản lề Clip Top Blumotion 110°', [], 'Cốc Ø 35 mm', { isNew: true }],
  ['BL.TDBX', 'BLUM', 'Ray & hộp kéo', 'Ray hộp Tandembox Antaro', ['450', '500', '550'], 'Cao thành 83 mm', {}],
  ['BL.LGBX', 'BLUM', 'Ray & hộp kéo', 'Ray hộp Legrabox Pure', ['450', '500'], 'Cao thành 90 mm', { isNew: true }],
  ['EK.115', 'EUROKING', 'Giá bát đĩa xoong nồi', 'Giá xoong nồi Inox 304 dạng hộp', ['700', '800', '900'], '664 x 470 x 190 mm', { isBestSeller: true }],
  ['EK.225', 'EUROKING', 'Giá dao thớt, gia vị', 'Giá dao thớt đa năng Inox 304', ['300', '350', '400'], '264 x 470 x 500 mm', { isNew: true }],
  ['EK.735', 'EUROKING', 'Thùng rác thông minh', 'Thùng rác đạp chân âm tủ', ['400'], '340 x 450 x 420 mm', {}],
  ['KB.140', 'KINGENBLU', 'Giá bát đĩa xoong nồi', 'Giá bát đĩa xoong nồi đa năng', WIDE, '564 x 470 x 190 mm', { isBestSeller: true }],
  ['KB.250', 'KINGENBLU', 'Giá dao thớt, gia vị', 'Giá gia vị nan dẹt mạ crom', ['250', '300', '350'], '214 x 470 x 500 mm', {}],
  ['KB.460', 'KINGENBLU', 'Giá bát đĩa nâng hạ', 'Giá bát nâng hạ tủ trên Inox 304', WIDE, '564 x 280 x 600 mm', {}],
  ['KB.880', 'KINGENBLU', 'Thùng gạo thông minh', 'Thùng gạo âm tủ 25 kg', ['300'], '264 x 470 x 610 mm', {}],
  ['KB.290', 'KINGENBLU', 'Giá bát đĩa cố định tủ trên', 'Giá bát đĩa cố định nhôm hộp', WIDE, '564 x 280 x 470 mm', { isNew: true }],
];

const PRODUCTS: PublicProduct[] = SEEDS.map(([code, brand, category, name, widths, dimensions, flags = {}]) => ({
  id: code.toLowerCase().replace(/\./g, '-'),
  code,
  name,
  brand,
  category,
  shortDescription: `${name} chính hãng ${brand}, bảo hành dài hạn, lắp đặt tận nơi.`,
  cabinetWidth: widths[0] ?? null,
  dimensions,
  unit: brand === 'BLUM' ? 'Cái' : 'Bộ',
  widths,
  isNew: flags.isNew,
  isBestSeller: flags.isBestSeller,
  material: brand === 'BLUM' ? 'Thép mạ, nhựa kỹ thuật' : 'Inox SUS304',
  origin: brand === 'BLUM' ? 'Áo' : 'Trung Quốc',
  warranty: brand === 'BLUM' ? 'Trọn đời' : '5 năm',
  features: FEATURES_BY_CATEGORY[category] ?? [],
}));

const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'vi'));

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export function fetchProducts(query: ProductQuery): Promise<{ data: PublicProduct[]; pagination: Pagination }> {
  let list = PRODUCTS.filter((p) => {
    if (query.brand && p.brand !== query.brand) return false;
    if (query.category && p.category !== query.category) return false;
    if (query.width && !p.widths?.includes(query.width)) return false;
    if (query.tag === 'new' && !p.isNew) return false;
    if (query.tag === 'bestseller' && !p.isBestSeller) return false;
    if (query.search) {
      const needle = normalize(query.search.trim());
      if (!normalize(`${p.name} ${p.code} ${p.brand} ${p.category}`).includes(needle)) return false;
    }
    return true;
  });

  if (query.sort === 'name-asc') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  if (query.sort === 'name-desc') list = [...list].sort((a, b) => b.name.localeCompare(a.name, 'vi'));
  if (query.sort === 'newest') list = [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));

  const limit = query.limit || 12;
  const page = Math.max(1, query.page || 1);
  const total = list.length;

  return delay({
    data: list.slice((page - 1) * limit, page * limit),
    pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}

export function fetchProduct(id: string): Promise<PublicProduct> {
  const product = PRODUCTS.find((p) => p.id === id);
  return product ? delay(product) : Promise.reject(new Error('Không tìm thấy sản phẩm'));
}

export function fetchBrands(): Promise<PublicBrand[]> {
  return delay(BRANDS, 50);
}

export function fetchCategories(): Promise<string[]> {
  return delay(CATEGORIES, 50);
}

export function fetchRelatedProducts(product: PublicProduct, limit = 4): Promise<PublicProduct[]> {
  const sameCategory = PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category);
  const sameBrand = PRODUCTS.filter((p) => p.id !== product.id && p.brand === product.brand && !sameCategory.includes(p));
  return delay([...sameCategory, ...sameBrand].slice(0, limit));
}
