import { Link } from 'react-router-dom';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Không tìm thấy trang');

  return (
    <>
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Không tìm thấy trang' }]} />

      <div className="container-site space-y-4 py-24 text-center">
        <p className="text-6xl font-extrabold text-primary">404</p>
        <h1 className="section-title">Không tìm thấy trang</h1>
        <p className="text-ink-muted">Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/" className="btn-primary">
            Về trang chủ
          </Link>
          <Link to="/san-pham" className="btn-outline">
            Xem tất cả sản phẩm
          </Link>
        </div>
      </div>
    </>
  );
}
