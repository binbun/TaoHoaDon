import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateQuotationTotals } from '../packages/shared/src/calculation';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu nạp dữ liệu phụ kiện tủ bếp & tủ bếp EUPLUS...');

  // Xóa sạch dữ liệu báo giá cũ để refresh mới
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.customer.deleteMany({});

  // 1. Tạo User Admin
  const passwordHash = await bcrypt.hash('123456', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@baogia.vn' },
    update: { role: 'SUPER_ADMIN' },
    create: {
      name: 'Nhà Phân Phối Bích Điều',
      email: 'admin@baogia.vn',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Đã tạo User Admin: ${adminUser.email} (Mật khẩu: 123456)`);

  const hoangBuiHash = await bcrypt.hash('Hoangbui1@', 10);
  const hoangBuiUser = await prisma.user.upsert({
    where: { email: 'hoang.bui' },
    update: {
      passwordHash: hoangBuiHash,
      role: 'SUPER_ADMIN',
    },
    create: {
      name: 'Hoàng Bùi',
      email: 'hoang.bui',
      passwordHash: hoangBuiHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`✅ Đã tạo User Super Admin: ${hoangBuiUser.email} (Mật khẩu: Hoangbui1@)`);

  // 2. Xóa sạch toàn bộ sản phẩm cũ và nạp danh mục sản phẩm chuẩn từ Catalogue GROB
  await prisma.product.deleteMany({});
  console.log('🗑️ Đã xóa sạch toàn bộ sản phẩm cũ trong cơ sở dữ liệu.');

  const { ALL_CATALOG_PRODUCTS } = await import('../packages/shared/src/data/grobProducts');
  const createdProducts: any[] = [];
  for (const prod of ALL_CATALOG_PRODUCTS) {
    const p = await prisma.product.create({
      data: prod,
    });
    createdProducts.push(p);
  }
  console.log(`✅ Đã nạp thành công tổng cộng ${createdProducts.length} sản phẩm GROB chuẩn từ Catalogue.`);

  // 3. Tạo Khách hàng / Đại lý / Dự án mẫu
  const customer1 = await prisma.customer.create({
    data: {
      companyName: 'Công ty Cổ phần Kiến Trúc & Nội Thất HomeDecor',
      contactName: 'KTS. Nguyễn Tuấn Anh',
      email: 'tuananh@homedecor.vn',
      phone: '0988 567 890',
      address: 'Biệt thự BT2-16, KĐT Ngoại Giao Đoàn, Bắc Từ Liêm, Hà Nội',
      taxCode: '0108668899',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyName: 'Xưởng Sản Xuất Tủ Bếp & Nội Thất Mộc Gia',
      contactName: 'Anh Vũ Đình Thắng',
      email: 'noithatmocgia@gmail.com',
      phone: '0912 345 678',
      address: 'Làng nghề đồ gỗ Chàng Sơn, Huyện Thạch Thất, TP. Hà Nội',
      taxCode: '0107889966',
    },
  });
  console.log(`✅ Đã tạo khách hàng: ${customer1.companyName}, ${customer2.companyName}`);

  // 4. Tạo Báo giá mẫu Phụ Kiện Tủ Bếp EUPLUS
  const quotationDate = new Date();
  const validUntil = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000); // 20 ngày sau

  const itemsInput = [
    {
      productId: createdProducts[0].id, // EV.I80 Giá bát nâng hạ
      productNameSnapshot: createdProducts[0].name,
      descriptionSnapshot: createdProducts[0].shortDescription,
      unit: createdProducts[0].unit,
      quantity: 1,
      unitPrice: createdProducts[0].price, // 2,596,320
      discount: 100000,
      vatRate: 0,
      sortOrder: 0,
    },
    {
      productId: createdProducts[3].id, // EV.80B Giá xoong nồi nan dẹt
      productNameSnapshot: createdProducts[3].name,
      descriptionSnapshot: createdProducts[3].shortDescription,
      unit: createdProducts[3].unit,
      quantity: 2,
      unitPrice: createdProducts[3].price, // 913,680 x 2 = 1,827,360
      discount: 0,
      vatRate: 0,
      sortOrder: 1,
    },
    {
      productId: createdProducts[8].id, // EV.35 Giá dao thớt nan dẹt
      productNameSnapshot: createdProducts[8].name,
      descriptionSnapshot: createdProducts[8].shortDescription,
      unit: createdProducts[8].unit,
      quantity: 1,
      unitPrice: createdProducts[8].price, // 1,004,400
      discount: 0,
      vatRate: 0,
      sortOrder: 2,
    },
    {
      productId: createdProducts[10].id, // B30.1 Thùng gạo gương
      productNameSnapshot: createdProducts[10].name,
      descriptionSnapshot: createdProducts[10].shortDescription,
      unit: createdProducts[10].unit,
      quantity: 1,
      unitPrice: createdProducts[10].price, // 813,240
      discount: 0,
      vatRate: 0,
      sortOrder: 3,
    },
  ];

  const { calculatedItems, summary } = calculateQuotationTotals(itemsInput);

  const sampleQuotation = await prisma.quotation.create({
    data: {
      quotationNumber: 'DH-2026-0001',
      customerId: customer1.id,
      quotationDate,
      validUntil,
      title: 'ĐƠN HÀNG PHỤ KIỆN TỦ BẾP INOX 304 CAO CẤP EUPLUS',
      note: '- Toàn bộ phụ kiện Inox SUS304 bảo hành hoen gỉ vĩnh viễn chính hãng EUPLUS.\n- Bảo hành ray trượt giảm chấn, cơ cấu piston nâng hạ thủy lực 02 năm đổi mới.\n- Miễn phí vận chuyển nội thành Hà Nội cho đơn hàng từ 5.000.000 ₫.',
      status: 'SENT',
      subtotal: summary.subtotal,
      discountTotal: summary.discountTotal,
      taxableTotal: summary.taxableTotal,
      vatTotal: summary.vatTotal,
      grandTotal: summary.grandTotal,
      createdBy: adminUser.id,
      items: {
        create: calculatedItems.map((item) => ({
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          descriptionSnapshot: item.descriptionSnapshot,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          vatRate: item.vatRate,
          subtotal: item.subtotal,
          taxableAmount: item.taxableAmount,
          vatAmount: item.vatAmount,
          total: item.total,
          sortOrder: item.sortOrder,
        })),
      },
    },
  });

  console.log(`✅ Đã tạo Báo giá mẫu ${sampleQuotation.quotationNumber} với tổng giá trị: ${summary.grandTotal} đ`);
  console.log('🎉 Seed database EUPLUS hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
