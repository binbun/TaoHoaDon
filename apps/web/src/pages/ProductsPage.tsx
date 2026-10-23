import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Layers,
  Building2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  MoreVertical,
  FileSpreadsheet,
  Tag,
  Star,
  Loader2,
} from 'lucide-react';
import { Product, formatCurrency } from '@taohoadon/shared';
import { useProducts, useDeleteProduct, useProductCategories, useToggleFavoriteProduct } from '../hooks/useProducts';
import { useBrands } from '../hooks/useBrands';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';
import { ProductFormModal } from '../components/ProductFormModal';
import { ProductExcelImportModal } from '../components/ProductExcelImportModal';
import { BrandBadge, getBrandStyle } from '../components/BrandBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../components/ui/tooltip';

const POPULAR_BRANDS = ['Tất cả', 'GROB', 'EUPLUS', 'KINGENBLU', 'BLUM', 'EUROKING'];
const PAGE_SIZE_OPTIONS = [15, 30, 50, 100, 200];

export const ProductsPage: React.FC = () => {
  const navigate = useNavigate();

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('Tất cả');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [favoriteFilter, setFavoriteFilter] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(30);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const toggleFavoriteMutation = useToggleFavoriteProduct();

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBrand, selectedCategory, activeFilter, favoriteFilter]);

  // Queries & Mutations
  const { data: responseData, isLoading } = useProducts({
    search,
    active: activeFilter === 'ALL' ? '' : activeFilter,
    brand: selectedBrand === 'Tất cả' ? undefined : selectedBrand,
    category: selectedCategory === 'ALL' ? undefined : selectedCategory,
    isFavorite: favoriteFilter ? true : undefined,
    page: currentPage,
    limit: pageSize,
  });

  const products: Product[] = useMemo(() => {
    if (!responseData) return [];
    if (Array.isArray(responseData)) return responseData;
    return responseData.data || [];
  }, [responseData]);

  const deleteMutation = useDeleteProduct();

  const { data: dbBrands = [] } = useBrands();
  const { data: serverCategories = [] } = useProductCategories();

  const brandColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbBrands.forEach((b) => {
      if (b.color) map[b.name] = b.color;
    });
    return map;
  }, [dbBrands]);

  const availableBrands = useMemo(() => {
    const list = ['Tất cả'];
    if (dbBrands && dbBrands.length > 0) {
      dbBrands.forEach((b) => {
        if (!list.includes(b.name)) list.push(b.name);
      });
    } else {
      ['GROB', 'EUPLUS', 'KINGENBLU', 'BLUM', 'EUROKING'].forEach((b) => {
        if (!list.includes(b)) list.push(b);
      });
    }
    return list;
  }, [dbBrands]);

  // Categories list from server
  const availableCategories = useMemo(() => {
    if (serverCategories && serverCategories.length > 0) {
      return serverCategories;
    }
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [serverCategories, products]);

  // Server-side Pagination calculations
  const totalItems = responseData?.pagination?.total ?? products.length;
  const totalPages = responseData?.pagination?.totalPages ?? Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  // Directly use server-paginated products
  const paginatedProducts = products;

  const openCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (deletingProductId) {
      deleteMutation.mutate(deletingProductId, {
        onSuccess: () => setDeletingProductId(null),
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-emerald-600" />
            Danh Mục Phụ Kiện & Thiết Bị ({totalItems} sản phẩm)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý giá phân phối phụ kiện Inox 304, nhôm phủ nano, bếp, hút mùi, chậu vòi...
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none justify-center border-slate-300 hover:border-[#1B9550] text-slate-700 hover:text-[#14733E] hover:bg-emerald-50/50 text-xs sm:text-sm font-semibold"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-[#1B9550]" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Nhập từ Excel
          </Button>
          <Button
            variant="primary"
            className="flex-1 sm:flex-none justify-center text-xs sm:text-sm font-bold shadow-xs shadow-[#1B9550]/20"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Thêm sản phẩm mới
          </Button>
        </div>
      </div>

      {/* Brand Tabs with Radix Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <Tabs value={selectedBrand} onValueChange={setSelectedBrand} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
            {availableBrands.map((b) => {
              const style = b === 'Tất cả' ? null : getBrandStyle(b, brandColorMap[b]);
              return (
                <TabsTrigger key={b} value={b} className="flex items-center gap-1.5">
                  {style ? (
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: style.primary }}
                    />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{b}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto shrink-0 text-xs text-slate-600 hover:text-[#1B9550] border-slate-200 hover:border-[#1B9550] bg-white font-medium"
          leftIcon={<Tag className="w-3.5 h-3.5 text-[#1B9550]" />}
          onClick={() => navigate('/brands')}
        >
          Quản lý thương hiệu
        </Button>
      </div>

      {/* Filter Toolbar with Radix Selects */}
      <Card bodyClassName="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-2 lg:col-span-5">
            <Input
              placeholder="Tìm theo mã mới, mã cũ (GP1-70, C1EC...), tên hoặc kích thước..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftElement={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          {/* Category Select */}
          <div className="lg:col-span-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Danh mục" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                {availableCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active Status Select */}
          <div className="lg:col-span-2">
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <SelectValue placeholder="Trạng thái" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Trạng thái: Tất cả</SelectItem>
                <SelectItem value="true">Đang kích hoạt</SelectItem>
                <SelectItem value="false">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Favorite Filter Button */}
          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={() => setFavoriteFilter(!favoriteFilter)}
              className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                favoriteFilter
                  ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-600'
              }`}
              title="Lọc chỉ các sản phẩm yêu thích"
            >
              <Star className={`w-3.5 h-3.5 ${favoriteFilter ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />
              <span className="whitespace-nowrap">⭐ Yêu thích</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Products Table with Radix Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : products.length > 0 ? (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã hàng</TableHead>
                  <TableHead>Hãng & Danh mục</TableHead>
                  <TableHead>Tên phụ kiện & Quy cách</TableHead>
                  <TableHead className="text-center">KT / Khoang</TableHead>
                  <TableHead className="text-center">ĐVT</TableHead>
                  <TableHead className="text-right">Đơn Giá Phân Phối (đ)</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell className="font-mono whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-xs">{prod.code}</div>
                      {prod.oldCode && (
                        <div className="text-[11px] text-slate-400 font-normal">Cũ: {prod.oldCode}</div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <BrandBadge brand={prod.brand} color={brandColorMap[prod.brand]} />
                        <span className="text-xs text-slate-600 truncate max-w-[150px]">
                          {prod.category || 'Khác'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleFavoriteMutation.mutate(prod.id)}
                          disabled={toggleFavoriteMutation.isPending && toggleFavoriteMutation.variables === prod.id}
                          title={prod.isFavorite ? 'Bỏ đánh dấu yêu thích' : 'Đánh dấu sản phẩm yêu thích'}
                          aria-label={prod.isFavorite ? 'Bỏ đánh dấu yêu thích' : 'Đánh dấu sản phẩm yêu thích'}
                          className="p-1 -my-1 rounded-full hover:bg-amber-100/80 transition-all active:scale-125 focus:outline-none flex-shrink-0"
                        >
                          {toggleFavoriteMutation.isPending && toggleFavoriteMutation.variables === prod.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          ) : prod.isFavorite ? (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500 drop-shadow-xs" />
                          ) : (
                            <Star className="w-4 h-4 text-slate-300 hover:text-amber-400 hover:fill-amber-100 transition-colors" />
                          )}
                        </button>
                        <span className="font-semibold text-slate-900 text-sm truncate">{prod.name}</span>
                      </div>
                      {prod.shortDescription && (
                        <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 ml-6">
                          {prod.shortDescription}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-600 whitespace-nowrap">
                      {prod.cabinetWidth && (
                        <div className="font-semibold text-slate-800">Tủ: {prod.cabinetWidth}mm</div>
                      )}
                      {prod.dimensions && (
                        <div className="text-[11px] text-slate-400">{prod.dimensions}</div>
                      )}
                      {!prod.cabinetWidth && !prod.dimensions && '---'}
                    </TableCell>
                    <TableCell className="text-center text-xs text-slate-600 font-medium whitespace-nowrap">
                      {prod.unit}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 whitespace-nowrap text-sm">
                      {formatCurrency(prod.price)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              aria-label="Chỉnh sửa sản phẩm"
                              onClick={() => openEditModal(prod)}
                              className="p-2 text-slate-500 hover:text-[#1B9550] hover:bg-emerald-50 rounded-lg transition-colors active:scale-95"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Chỉnh sửa sản phẩm</TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button aria-label="Thao tác khác" className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors active:scale-95">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(prod)}>
                              <Edit2 className="w-4 h-4 text-[#1B9550] mr-2" />
                              <span>Sửa thông tin</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeletingProductId(prod.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              <span>Xóa sản phẩm</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination Toolbar with Radix Select */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Hiển thị{' '}
                  <strong className="text-slate-900">
                    {totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1} -{' '}
                    {Math.min(validPage * pageSize, totalItems)}
                  </strong>{' '}
                  trong tổng số <strong className="text-slate-900">{totalItems}</strong> sản phẩm
                </span>

                <div className="flex items-center gap-1.5">
                  <span>| Số lượng / trang:</span>
                  <div className="w-24">
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(val) => {
                        setPageSize(Number(val));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs py-1 px-2.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size} dòng
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Page navigation buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={validPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang đầu"
                  aria-label="Trang đầu"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validPage <= 1}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang trước"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg">
                  Trang {validPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang sau"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Trang cuối"
                  aria-label="Trang cuối"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Không tìm thấy sản phẩm nào"
            description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc hãng/danh mục khác."
            actionText="Tạo sản phẩm mới"
            onAction={openCreateModal}
            icon={<Package className="w-10 h-10" />}
          />
        )}
      </Card>

      {/* Product Create/Edit Modal Component */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        defaultBrand={selectedBrand === 'Tất cả' ? 'GROB' : selectedBrand}
        defaultCategory={selectedCategory === 'ALL' ? '' : selectedCategory}
      />

      {/* Product Excel Bulk Import Modal */}
      <ProductExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Delete Confirmation with Radix AlertDialog */}
      <AlertDialog open={!!deletingProductId} onOpenChange={(open) => !open && !deleteMutation.isPending && setDeletingProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa sản phẩm này? Các đơn hàng cũ đã lưu bản chụp (snapshot) vẫn sẽ giữ nguyên số liệu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              isLoading={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
