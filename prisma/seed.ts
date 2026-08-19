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

  // 2. Danh mục Sản phẩm phụ kiện tủ bếp & Tủ bếp chuẩn từ Catalogue EUPLUS
  const productsData = [
    // Giá bát nâng hạ thông minh
    {
      code: 'EV.I80',
      name: 'Giá bát nâng hạ thông minh SUS304 - KT 800',
      shortDescription: 'Cơ cấu trợ lực nâng hạ 2 tầng Inox 304 cao cấp, giảm chấn êm ái, khay hứng nước PVC.',
      unit: 'Bộ',
      price: 2596320,
      vatRate: 8,
      active: true,
    },
    {
      code: 'EV.I90',
      name: 'Giá bát nâng hạ thông minh SUS304 - KT 900',
      shortDescription: 'Cơ cấu trợ lực nâng hạ 2 tầng Inox 304 cao cấp cho khoang tủ 900mm.',
      unit: 'Bộ',
      price: 2682720,
      vatRate: 8,
      active: true,
    },
    {
      code: 'EV.I70',
      name: 'Giá bát nâng hạ thông minh SUS304 - KT 700',
      shortDescription: 'Giá bát nâng hạ trợ lực piston thủy lực, Inox 304 chuẩn bền bỉ.',
      unit: 'Bộ',
      price: 2430000,
      vatRate: 8,
      active: true,
    },
    // Giá xoong nồi & bát đĩa nan dẹt
    {
      code: 'EV.80B',
      name: 'Giá để xoong nồi nan dẹt SUS304 - KT 800',
      shortDescription: 'Nan dẹt dày dặn Inox 304 kèm ray trượt âm giảm chấn chịu tải trọng 35kg.',
      unit: 'Bộ',
      price: 913680,
      vatRate: 8,
      active: true,
    },
    {
      code: 'EV.90B',
      name: 'Giá để xoong nồi nan dẹt SUS304 - KT 900',
      shortDescription: 'Giá xoong nồi gắn cánh/âm tủ nan dẹt Inox 304, ray trượt giảm chấn cao cấp.',
      unit: 'Bộ',
      price: 930960,
      vatRate: 8,
      active: true,
    },
    {
      code: 'EV.80',
      name: 'Giá bát đĩa đa năng nan dẹt SUS304 - KT 800',
      shortDescription: 'Khay cài bát đĩa nan dẹt Inox 304 tủ dưới, kèm khay hứng nước và ray giảm chấn.',
      unit: 'Bộ',
      price: 951480,
      vatRate: 8,
      active: true,
    },
    // Giá xoong nồi & bát đĩa nan tròn
    {
      code: 'ER.80B',
      name: 'Giá để xoong nồi nan tròn SUS304 - KT 800',
      shortDescription: 'Nan tròn thanh thoát Inox 304 chống han gỉ, kèm ray âm giảm chấn.',
      unit: 'Bộ',
      price: 812160,
      vatRate: 8,
      active: true,
    },
    {
      code: 'ER.80',
      name: 'Giá bát đĩa đa năng nan tròn SUS304 - KT 800',
      shortDescription: 'Giá cài đĩa và úp bát nan tròn Inox 304 kèm khay nước.',
      unit: 'Bộ',
      price: 849960,
      vatRate: 8,
      active: true,
    },
    // Giá dao thớt & gia vị đa năng
    {
      code: 'EV.35',
      name: 'Giá dao thớt đa năng nan dẹt SUS304 - KT 350',
      shortDescription: 'Tích hợp cài dao, thớt, đũa thìa, móc muôi thìa và ray trượt giảm chấn.',
      unit: 'Bộ',
      price: 1004400,
      vatRate: 8,
      active: true,
    },
    {
      code: 'EV.30B',
      name: 'Giá gia vị chai lọ nan dẹt SUS304 - KT 300',
      shortDescription: 'Thiết kế 3 tầng nan dẹt Inox 304 để chai lọ gia vị dầu ăn gọn gàng.',
      unit: 'Bộ',
      price: 989280,
      vatRate: 8,
      active: true,
    },
    // Thùng gạo gương & thùng rác âm tủ
    {
      code: 'B30.1',
      name: 'Thùng gạo gương đen thông minh nút xoay',
      shortDescription: 'Mặt gương đen sang trọng, tự động đong gạo 150g-250g chống ẩm mốc côn trùng.',
      unit: 'Chiếc',
      price: 813240,
      vatRate: 8,
      active: true,
    },
    {
      code: 'E.30G',
      name: 'Thùng rác đôi gắn cánh âm tủ ray giảm chấn',
      shortDescription: '2 hố phân loại rác thải tự động mở nắp khi kéo cánh tủ, ray trượt giảm chấn.',
      unit: 'Bộ',
      price: 1030320,
      vatRate: 8,
      active: true,
    },
    // Mâm xoay & góc liên hoàn
    {
      code: 'EV.270.8',
      name: 'Mâm xoay 3/4 nan dẹt SUS304 - KT 800',
      shortDescription: 'Tối ưu góc chữ L tủ bếp, mở xoay 270 độ Inox 304 sáng bóng.',
      unit: 'Bộ',
      price: 1202040,
      vatRate: 8,
      active: true,
    },
    {
      code: 'EV.90R',
      name: 'Giá góc liên hoàn mở phải nan dẹt SUS304',
      shortDescription: 'Cơ cấu 4 rổ kéo liên hoàn thông minh tận dụng 100% góc chết tủ bếp.',
      unit: 'Bộ',
      price: 3835080,
      vatRate: 8,
      active: true,
    },
    // Tủ kho inox cao cấp
    {
      code: 'EV.645',
      name: 'Tủ kho 6 tầng cánh 450 nan dẹt SUS304',
      shortDescription: 'Hệ giá kho 12 rổ Inox 304 chứa đồ khô tiện nghi, khung sơn tĩnh điện cao cấp.',
      unit: 'Hệ',
      price: 4407480,
      vatRate: 8,
      active: true,
    },
    // Module Tủ bếp hoàn thiện
    {
      code: 'TB-ACRYLIC',
      name: 'Tủ bếp Acrylic bóng gương An Cường (Thùng MDF xanh chống ẩm)',
      shortDescription: 'Cánh phủ Acrylic no line bóng gương An Cường, thùng MDF lõi xanh chống ẩm tiêu chuẩn.',
      unit: 'Mét dài',
      price: 4800000,
      vatRate: 8,
      active: true,
    },
    {
      code: 'TB-INOX-CANH-KINH',
      name: 'Tủ bếp khung Inox 304 module cánh kính cường lực tràn viền',
      shortDescription: 'Thùng tủ Inox 304 chấn dập CNC chống mối mọt vĩnh viễn, cánh kính khung nhôm Anode.',
      unit: 'Mét dài',
      price: 8500000,
      vatRate: 8,
      active: true,
    },
  ];

  const createdProducts: any[] = [];
  for (const prod of productsData) {
    const p = await prisma.product.upsert({
      where: { code: prod.code },
      update: prod,
      create: prod,
    });
    createdProducts.push(p);
  }
  console.log(`✅ Đã nạp ${createdProducts.length} sản phẩm phụ kiện tủ bếp & tủ bếp EUPLUS.`);

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
      vatRate: 8,
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
      vatRate: 8,
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
      vatRate: 8,
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
      vatRate: 8,
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
