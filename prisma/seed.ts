/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Unsplash image helper
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&q=80`;

// Helper to create product + images + variants
async function createProduct(
  data: any,
  images: string[],
  variants: { size?: string; color?: string; colorCode?: string; imageUrl?: string; price?: number; stock: number; config?: string }[] = []
) {
  const { images: _, variants: __, ...productData } = data;
  const product = await prisma.product.create({ data: productData });

  // Images
  for (let i = 0; i < images.length; i++) {
    await prisma.productImage.create({
      data: { productId: product.id, url: images[i], altText: data.name, isPrimary: i === 0, sortOrder: i },
    });
  }

  // Variants
  for (const v of variants) {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        size: v.size || v.config || null,
        color: v.color || null,
        colorCode: v.colorCode || null,
        imageUrl: v.imageUrl || null,
        price: v.price || null,
        stock: v.stock,
      },
    });
  }

  console.log(`  ✓ ${data.name} (${variants.length} variants)`);
  return product;
}

// Clothing size × color variant generator
function clothingVariants(
  colors: { n: string; c: string; img: string }[],
  sizes: string[],
  stock = 15
) {
  return colors.flatMap((color) =>
    sizes.map((size) => ({
      size,
      color: color.n,
      colorCode: color.c,
      imageUrl: color.img,
      stock,
    }))
  );
}

// Shoe size × color variant generator
function shoeVariants(
  colors: { n: string; c: string; img: string }[],
  sizes: string[],
  stock = 8
) {
  return clothingVariants(colors, sizes, stock);
}

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── CLEAN ────────────────────────────────────────────────────────────────
  console.log('🗑  Cleaning old data...');
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.brand.deleteMany({});
  console.log('✓ Cleaned\n');

  // ─── USERS ────────────────────────────────────────────────────────────────
  const pw1 = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({ where: { email: 'admin@shopverse.com' }, update: {}, create: { name: 'Admin User', email: 'admin@shopverse.com', passwordHash: pw1, role: 'ADMIN', phone: '+91-9999999999' } });
  const pw2 = await bcrypt.hash('customer123', 12);
  await prisma.user.upsert({ where: { email: 'customer@test.com' }, update: {}, create: { name: 'Rahul Sharma', email: 'customer@test.com', passwordHash: pw2, role: 'CUSTOMER', phone: '+91-8888888888' } });
  console.log('✓ Users');

  // ─── 50 BRANDS ────────────────────────────────────────────────────────────
  const brandNames = [
    'Apple', 'Samsung', 'Sony', 'OnePlus', 'boAt', 'Xiaomi', 'Realme', 'Google', 'HP', 'Dell',
    'Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Skechers', 'Woodland', 'Bata', 'Crocs', 'Fila',
    'Levi\'s', 'H&M', 'Zara', 'Allen Solly', 'Peter England', 'Van Heusen', 'Jack & Jones', 'U.S. Polo', 'Tommy Hilfiger', 'Calvin Klein',
    'Prestige', 'Pigeon', 'Borosil', 'Milton', 'Hawkins',
    'Penguin Books', 'HarperCollins', 'Rupa Publications', 'Scholastic', 'Hachette',
    'Maybelline', 'Lakme', 'L\'Oreal', 'Nivea', 'The Body Shop',
    'Decathlon', 'Yonex', 'Nivia', 'Cosco', 'Fitbit',
  ];
  const brands: Record<string, any> = {};
  for (const name of brandNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    brands[slug] = await prisma.brand.create({ data: { name, slug } });
  }
  console.log(`✓ ${brandNames.length} brands`);

  // ─── 30 CATEGORIES (15 root + 15 sub) ─────────────────────────────────────
  const rootCatData = [
    { name: 'Smartphones', slug: 'smartphones', sortOrder: 1 },
    { name: 'Laptops & Computers', slug: 'laptops', sortOrder: 2 },
    { name: 'Audio & Headphones', slug: 'audio', sortOrder: 3 },
    { name: 'TVs & Displays', slug: 'tvs', sortOrder: 4 },
    { name: 'Gaming', slug: 'gaming', sortOrder: 5 },
    { name: 'Men\'s Clothing', slug: 'mens-clothing', sortOrder: 6 },
    { name: 'Women\'s Clothing', slug: 'womens-clothing', sortOrder: 7 },
    { name: 'Kids\' Clothing', slug: 'kids-clothing', sortOrder: 8 },
    { name: 'Men\'s Footwear', slug: 'mens-footwear', sortOrder: 9 },
    { name: 'Women\'s Footwear', slug: 'womens-footwear', sortOrder: 10 },
    { name: 'Home & Kitchen', slug: 'home-kitchen', sortOrder: 11 },
    { name: 'Sports & Fitness', slug: 'sports', sortOrder: 12 },
    { name: 'Books', slug: 'books', sortOrder: 13 },
    { name: 'Beauty & Grooming', slug: 'beauty', sortOrder: 14 },
    { name: 'Watches & Accessories', slug: 'watches', sortOrder: 15 },
  ];
  const cats: Record<string, any> = {};
  for (const c of rootCatData) { cats[c.slug] = await prisma.category.create({ data: c }); }

  const subCatData = [
    { name: 'T-Shirts', slug: 'mens-tshirts', parentId: cats['mens-clothing'].id, sortOrder: 1 },
    { name: 'Shirts', slug: 'mens-shirts', parentId: cats['mens-clothing'].id, sortOrder: 2 },
    { name: 'Jeans', slug: 'mens-jeans', parentId: cats['mens-clothing'].id, sortOrder: 3 },
    { name: 'Jackets', slug: 'mens-jackets', parentId: cats['mens-clothing'].id, sortOrder: 4 },
    { name: 'Dresses', slug: 'womens-dresses', parentId: cats['womens-clothing'].id, sortOrder: 1 },
    { name: 'Tops', slug: 'womens-tops', parentId: cats['womens-clothing'].id, sortOrder: 2 },
    { name: 'Ethnic Wear', slug: 'womens-ethnic', parentId: cats['womens-clothing'].id, sortOrder: 3 },
    { name: 'Sneakers', slug: 'sneakers', parentId: cats['mens-footwear'].id, sortOrder: 1 },
    { name: 'Formal Shoes', slug: 'formal-shoes', parentId: cats['mens-footwear'].id, sortOrder: 2 },
    { name: 'Fiction', slug: 'fiction', parentId: cats['books'].id, sortOrder: 1 },
    { name: 'Non-Fiction', slug: 'non-fiction', parentId: cats['books'].id, sortOrder: 2 },
    { name: 'Cookware', slug: 'cookware', parentId: cats['home-kitchen'].id, sortOrder: 1 },
    { name: 'Appliances', slug: 'appliances', parentId: cats['home-kitchen'].id, sortOrder: 2 },
    { name: 'Makeup', slug: 'makeup', parentId: cats['beauty'].id, sortOrder: 1 },
    { name: 'Skincare', slug: 'skincare', parentId: cats['beauty'].id, sortOrder: 2 },
  ];
  for (const sc of subCatData) { cats[sc.slug] = await prisma.category.create({ data: sc }); }
  console.log(`✓ ${rootCatData.length + subCatData.length} categories`);

  // ─── 100+ PRODUCTS ────────────────────────────────────────────────────────
  console.log('\n📦 Creating products...\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // SMARTPHONES (10)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', description: 'A17 Pro chip, 48MP camera system, titanium design, USB-C, always-on ProMotion display.', shortDescription: 'A17 Pro | 48MP | Titanium | USB-C', price: 159900, comparePrice: 169900, costPrice: 140000, sku: 'APL-15PM', stock: 200, categoryId: cats['smartphones'].id, brandId: brands['apple'].id, isFeatured: true, attributes: {} },
    [u('1592750475338-74b7b21085ab'), u('1510557880182-3d4d3cba35a5'), u('1591337676887-a217a6c72cfa')],
    [
      { color: 'Natural Titanium', colorCode: '#a09080', imageUrl: u('1695048065319-e6068c6c4d62'), size: '256GB', stock: 30 },
      { color: 'Natural Titanium', colorCode: '#a09080', imageUrl: u('1695048065319-e6068c6c4d62'), size: '512GB', stock: 20, price: 179900 },
      { color: 'Natural Titanium', colorCode: '#a09080', imageUrl: u('1695048065319-e6068c6c4d62'), size: '1TB', stock: 10, price: 199900 },
      { color: 'Blue Titanium', colorCode: '#394e6a', imageUrl: u('1592750475338-74b7b21085ab'), size: '256GB', stock: 25 },
      { color: 'Blue Titanium', colorCode: '#394e6a', imageUrl: u('1592750475338-74b7b21085ab'), size: '512GB', stock: 15, price: 179900 },
      { color: 'Black Titanium', colorCode: '#2d2926', imageUrl: u('1510557880182-3d4d3cba35a5'), size: '256GB', stock: 30 },
      { color: 'Black Titanium', colorCode: '#2d2926', imageUrl: u('1510557880182-3d4d3cba35a5'), size: '512GB', stock: 20, price: 179900 },
      { color: 'White Titanium', colorCode: '#f5f0eb', imageUrl: u('1591337676887-a217a6c72cfa'), size: '256GB', stock: 20 },
    ]
  );

  await createProduct(
    { name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra', description: 'Galaxy AI, titanium frame, 200MP camera, S Pen, Snapdragon 8 Gen 3.', shortDescription: 'Snapdragon 8 Gen 3 | 200MP | S Pen | AI', price: 129999, comparePrice: 139999, costPrice: 110000, sku: 'SAM-S24U', stock: 250, categoryId: cats['smartphones'].id, brandId: brands['samsung'].id, isFeatured: true, attributes: {} },
    [u('1610945265064-0e34e5519bbf'), u('1585060544812-6b45742d762f'), u('1598327105666-5b89351aff97')],
    [
      { color: 'Titanium Gray', colorCode: '#8a8a8a', imageUrl: u('1610945265064-0e34e5519bbf'), size: '256GB / 12GB', stock: 40 },
      { color: 'Titanium Gray', colorCode: '#8a8a8a', imageUrl: u('1610945265064-0e34e5519bbf'), size: '512GB / 12GB', stock: 25, price: 144999 },
      { color: 'Titanium Black', colorCode: '#1a1a1a', imageUrl: u('1585060544812-6b45742d762f'), size: '256GB / 12GB', stock: 35 },
      { color: 'Titanium Violet', colorCode: '#9b7db8', imageUrl: u('1598327105666-5b89351aff97'), size: '256GB / 12GB', stock: 30 },
      { color: 'Titanium Yellow', colorCode: '#d4b840', imageUrl: u('1511707171634-5f897ff02aa6'), size: '256GB / 12GB', stock: 20 },
    ]
  );

  await createProduct(
    { name: 'OnePlus 12 5G', slug: 'oneplus-12', description: 'Snapdragon 8 Gen 3, Hasselblad camera, 100W SUPERVOOC, 2K LTPO display.', shortDescription: 'SD 8 Gen 3 | Hasselblad | 100W | 2K', price: 64999, comparePrice: 69999, costPrice: 52000, sku: 'OP-12', stock: 200, categoryId: cats['smartphones'].id, brandId: brands['oneplus'].id, isFeatured: true, attributes: {} },
    [u('1511707171634-5f897ff02aa6'), u('1565849904461-04a58ad377e0'), u('1574944985070-8f3ebc6b79d2')],
    [
      { color: 'Flowy Emerald', colorCode: '#2e7d32', imageUrl: u('1511707171634-5f897ff02aa6'), size: '12GB / 256GB', stock: 50 },
      { color: 'Silky Black', colorCode: '#1a1a1a', imageUrl: u('1565849904461-04a58ad377e0'), size: '12GB / 256GB', stock: 50 },
      { color: 'Silky Black', colorCode: '#1a1a1a', imageUrl: u('1565849904461-04a58ad377e0'), size: '16GB / 512GB', stock: 30, price: 69999 },
    ]
  );

  await createProduct(
    { name: 'Google Pixel 8 Pro', slug: 'google-pixel-8-pro', description: 'Tensor G3, best-in-class AI camera, 7 years of updates, Super Actua display.', shortDescription: 'Tensor G3 | AI Camera | 7yr Updates', price: 106999, comparePrice: 119999, costPrice: 85000, sku: 'GOO-P8P', stock: 120, categoryId: cats['smartphones'].id, brandId: brands['google'].id, isFeatured: true, attributes: {} },
    [u('1598327105666-5b89351aff97'), u('1574944985070-8f3ebc6b79d2'), u('1580910051074-3eb694886f35')],
    [
      { color: 'Obsidian', colorCode: '#1a1a1a', imageUrl: u('1598327105666-5b89351aff97'), size: '128GB', stock: 30 },
      { color: 'Obsidian', colorCode: '#1a1a1a', imageUrl: u('1598327105666-5b89351aff97'), size: '256GB', stock: 20, price: 112999 },
      { color: 'Bay', colorCode: '#4fc3f7', imageUrl: u('1574944985070-8f3ebc6b79d2'), size: '128GB', stock: 25 },
      { color: 'Porcelain', colorCode: '#f5f0eb', imageUrl: u('1580910051074-3eb694886f35'), size: '128GB', stock: 20 },
    ]
  );

  await createProduct(
    { name: 'Xiaomi 14 Ultra', slug: 'xiaomi-14-ultra', description: 'Leica quad camera, Snapdragon 8 Gen 3, 90W wired + 50W wireless charging.', shortDescription: 'Leica Camera | SD 8 Gen 3 | 90W', price: 99999, comparePrice: 104999, costPrice: 78000, sku: 'XMI-14U', stock: 80, categoryId: cats['smartphones'].id, brandId: brands['xiaomi'].id, attributes: {} },
    [u('1574944985070-8f3ebc6b79d2'), u('1511707171634-5f897ff02aa6'), u('1580910051074-3eb694886f35')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1574944985070-8f3ebc6b79d2'), size: '16GB / 512GB', stock: 40 },
      { color: 'White', colorCode: '#f5f5f5', imageUrl: u('1580910051074-3eb694886f35'), size: '16GB / 512GB', stock: 40 },
    ]
  );

  await createProduct(
    { name: 'Samsung Galaxy A55 5G', slug: 'samsung-a55-5g', description: 'Super AMOLED 120Hz, Exynos 1480, OIS camera, IP67 water resistance.', shortDescription: 'Super AMOLED 120Hz | IP67 | 5000mAh', price: 27999, comparePrice: 32999, costPrice: 20000, sku: 'SAM-A55', stock: 300, categoryId: cats['smartphones'].id, brandId: brands['samsung'].id, attributes: {} },
    [u('1585060544812-6b45742d762f'), u('1610945265064-0e34e5519bbf'), u('1598327105666-5b89351aff97')],
    [
      { color: 'Awesome Iceblue', colorCode: '#b3e5fc', imageUrl: u('1585060544812-6b45742d762f'), size: '8GB / 128GB', stock: 80 },
      { color: 'Awesome Lilac', colorCode: '#ce93d8', imageUrl: u('1598327105666-5b89351aff97'), size: '8GB / 128GB', stock: 60 },
      { color: 'Awesome Navy', colorCode: '#1a237e', imageUrl: u('1610945265064-0e34e5519bbf'), size: '8GB / 128GB', stock: 60 },
      { color: 'Awesome Navy', colorCode: '#1a237e', imageUrl: u('1610945265064-0e34e5519bbf'), size: '8GB / 256GB', stock: 40, price: 30999 },
    ]
  );

  await createProduct(
    { name: 'iPhone 15', slug: 'iphone-15', description: 'Dynamic Island, 48MP camera, A16 Bionic, USB-C, Ceramic Shield.', shortDescription: 'A16 Bionic | 48MP | Dynamic Island | USB-C', price: 79900, comparePrice: 84900, costPrice: 65000, sku: 'APL-15', stock: 250, categoryId: cats['smartphones'].id, brandId: brands['apple'].id, attributes: {} },
    [u('1591337676887-a217a6c72cfa'), u('1592750475338-74b7b21085ab'), u('1510557880182-3d4d3cba35a5')],
    [
      { color: 'Blue', colorCode: '#4a90d9', imageUrl: u('1591337676887-a217a6c72cfa'), size: '128GB', stock: 40 },
      { color: 'Blue', colorCode: '#4a90d9', imageUrl: u('1591337676887-a217a6c72cfa'), size: '256GB', stock: 25, price: 89900 },
      { color: 'Pink', colorCode: '#f8b4c8', imageUrl: u('1592750475338-74b7b21085ab'), size: '128GB', stock: 35 },
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1510557880182-3d4d3cba35a5'), size: '128GB', stock: 40 },
      { color: 'Green', colorCode: '#aed581', imageUrl: u('1695048065319-e6068c6c4d62'), size: '128GB', stock: 30 },
    ]
  );

  await createProduct(
    { name: 'Realme GT 6T', slug: 'realme-gt-6t', description: 'Snapdragon 7+ Gen 3, 120W charging, 120Hz AMOLED, 5500mAh.', shortDescription: 'SD 7+ Gen 3 | 120W | 120Hz AMOLED', price: 21999, comparePrice: 25999, costPrice: 15000, sku: 'RM-GT6T', stock: 300, categoryId: cats['smartphones'].id, brandId: brands['realme'].id, attributes: {} },
    [u('1580910051074-3eb694886f35'), u('1574944985070-8f3ebc6b79d2')],
    [
      { color: 'Razor Green', colorCode: '#66bb6a', imageUrl: u('1580910051074-3eb694886f35'), size: '8GB / 128GB', stock: 80 },
      { color: 'Razor Green', colorCode: '#66bb6a', imageUrl: u('1580910051074-3eb694886f35'), size: '8GB / 256GB', stock: 50, price: 23999 },
      { color: 'Fluid Silver', colorCode: '#bdbdbd', imageUrl: u('1574944985070-8f3ebc6b79d2'), size: '8GB / 128GB', stock: 70 },
    ]
  );

  await createProduct(
    { name: 'Xiaomi Redmi Note 13 Pro+', slug: 'redmi-note-13-pro-plus', description: '200MP camera, Dimensity 7200, 120W HyperCharge, curved AMOLED.', shortDescription: '200MP | Dimensity 7200 | 120W | Curved AMOLED', price: 31999, comparePrice: 34999, costPrice: 22000, sku: 'XMI-RN13PP', stock: 350, categoryId: cats['smartphones'].id, brandId: brands['xiaomi'].id, attributes: {} },
    [u('1574944985070-8f3ebc6b79d2'), u('1511707171634-5f897ff02aa6')],
    [
      { color: 'Midnight Black', colorCode: '#1a1a1a', imageUrl: u('1574944985070-8f3ebc6b79d2'), size: '8GB / 256GB', stock: 100 },
      { color: 'Fusion Purple', colorCode: '#9c27b0', imageUrl: u('1511707171634-5f897ff02aa6'), size: '8GB / 256GB', stock: 80 },
      { color: 'Fusion Purple', colorCode: '#9c27b0', imageUrl: u('1511707171634-5f897ff02aa6'), size: '12GB / 512GB', stock: 50, price: 35999 },
    ]
  );

  await createProduct(
    { name: 'Samsung Galaxy Z Flip5', slug: 'samsung-z-flip5', description: 'Foldable design, Flex Window 3.4", Snapdragon 8 Gen 2, FlexCam.', shortDescription: 'Foldable | Flex Window | SD 8 Gen 2', price: 99999, comparePrice: 109999, costPrice: 80000, sku: 'SAM-ZF5', stock: 60, categoryId: cats['smartphones'].id, brandId: brands['samsung'].id, isFeatured: true, attributes: {} },
    [u('1610945265064-0e34e5519bbf'), u('1598327105666-5b89351aff97')],
    [
      { color: 'Mint', colorCode: '#80cbc4', imageUrl: u('1610945265064-0e34e5519bbf'), size: '8GB / 256GB', stock: 15 },
      { color: 'Lavender', colorCode: '#b39ddb', imageUrl: u('1598327105666-5b89351aff97'), size: '8GB / 256GB', stock: 15 },
      { color: 'Graphite', colorCode: '#424242', imageUrl: u('1585060544812-6b45742d762f'), size: '8GB / 256GB', stock: 15 },
      { color: 'Cream', colorCode: '#fff8e1', imageUrl: u('1591337676887-a217a6c72cfa'), size: '8GB / 256GB', stock: 15 },
    ]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LAPTOPS (8)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'MacBook Air M3 15"', slug: 'macbook-air-m3-15', description: 'M3 chip, 15.3" Liquid Retina, 18hr battery, fanless, MagSafe.', shortDescription: 'M3 | 15.3" Retina | 18hr | Fanless', price: 134900, comparePrice: 144900, costPrice: 115000, sku: 'APL-MBA15', stock: 150, categoryId: cats['laptops'].id, brandId: brands['apple'].id, isFeatured: true, attributes: {} },
    [u('1517336714731-489689fd1ca8'), u('1496181133206-80ce9b88a853'), u('1541807084-5c52b6b3adef')],
    [
      { color: 'Midnight', colorCode: '#1a1a2e', imageUrl: u('1517336714731-489689fd1ca8'), size: '8GB / 256GB', stock: 20 },
      { color: 'Midnight', colorCode: '#1a1a2e', imageUrl: u('1517336714731-489689fd1ca8'), size: '16GB / 512GB', stock: 15, price: 164900 },
      { color: 'Starlight', colorCode: '#f5e6d3', imageUrl: u('1496181133206-80ce9b88a853'), size: '8GB / 256GB', stock: 20 },
      { color: 'Space Gray', colorCode: '#616161', imageUrl: u('1541807084-5c52b6b3adef'), size: '8GB / 256GB', stock: 15 },
      { color: 'Space Gray', colorCode: '#616161', imageUrl: u('1541807084-5c52b6b3adef'), size: '24GB / 1TB', stock: 8, price: 199900 },
    ]
  );

  await createProduct(
    { name: 'MacBook Pro 14" M3 Pro', slug: 'macbook-pro-14-m3-pro', description: 'M3 Pro chip, Liquid Retina XDR, 18hr battery, ProMotion, 6 speakers.', shortDescription: 'M3 Pro | 14" XDR | 18hr | ProMotion', price: 199900, comparePrice: 219900, costPrice: 170000, sku: 'APL-MBP14', stock: 80, categoryId: cats['laptops'].id, brandId: brands['apple'].id, attributes: {} },
    [u('1496181133206-80ce9b88a853'), u('1517336714731-489689fd1ca8'), u('1611186871348-b1ce696e52c9')],
    [
      { color: 'Space Black', colorCode: '#1a1a1a', imageUrl: u('1496181133206-80ce9b88a853'), size: '18GB / 512GB', stock: 20 },
      { color: 'Space Black', colorCode: '#1a1a1a', imageUrl: u('1496181133206-80ce9b88a853'), size: '36GB / 1TB', stock: 10, price: 269900 },
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1517336714731-489689fd1ca8'), size: '18GB / 512GB', stock: 20 },
    ]
  );

  await createProduct(
    { name: 'Dell XPS 15', slug: 'dell-xps-15', description: 'Intel Core i7-13700H, 15.6" 3.5K OLED, 16GB DDR5, NVIDIA RTX 4050.', shortDescription: 'i7-13700H | 3.5K OLED | RTX 4050 | 16GB', price: 149990, comparePrice: 169990, costPrice: 120000, sku: 'DEL-XPS15', stock: 60, categoryId: cats['laptops'].id, brandId: brands['dell'].id, attributes: {} },
    [u('1541807084-5c52b6b3adef'), u('1496181133206-80ce9b88a853'), u('1611186871348-b1ce696e52c9')],
    [
      { color: 'Platinum Silver', colorCode: '#c0c0c0', imageUrl: u('1541807084-5c52b6b3adef'), size: '16GB / 512GB SSD', stock: 20 },
      { color: 'Platinum Silver', colorCode: '#c0c0c0', imageUrl: u('1541807084-5c52b6b3adef'), size: '32GB / 1TB SSD', stock: 10, price: 179990 },
    ]
  );

  await createProduct(
    { name: 'HP Pavilion 14', slug: 'hp-pavilion-14', description: 'AMD Ryzen 5 7530U, 14" FHD IPS, 16GB, 512GB SSD, thin & light.', shortDescription: 'Ryzen 5 | 14" FHD | 16GB | 512GB', price: 54990, comparePrice: 64990, costPrice: 40000, sku: 'HP-PAV14', stock: 120, categoryId: cats['laptops'].id, brandId: brands['hp'].id, attributes: {} },
    [u('1611186871348-b1ce696e52c9'), u('1541807084-5c52b6b3adef')],
    [
      { color: 'Natural Silver', colorCode: '#c0c0c0', imageUrl: u('1611186871348-b1ce696e52c9'), size: '8GB / 512GB', stock: 40 },
      { color: 'Natural Silver', colorCode: '#c0c0c0', imageUrl: u('1611186871348-b1ce696e52c9'), size: '16GB / 512GB', stock: 30, price: 59990 },
      { color: 'Warm Gold', colorCode: '#d4a847', imageUrl: u('1541807084-5c52b6b3adef'), size: '16GB / 512GB', stock: 20, price: 59990 },
    ]
  );

  await createProduct(
    { name: 'Samsung Galaxy Tab S9 FE', slug: 'galaxy-tab-s9-fe', description: '10.9" display, S Pen included, IP68, 8128mAh, DeX mode.', shortDescription: '10.9" | S Pen | IP68 | 8128mAh', price: 44999, comparePrice: 49999, costPrice: 36000, sku: 'SAM-TS9FE', stock: 100, categoryId: cats['laptops'].id, brandId: brands['samsung'].id, attributes: {} },
    [u('1544244015-0df4b3ffc6b0'), u('1585790050230-5ab7e49e5c16')],
    [
      { color: 'Gray', colorCode: '#808080', imageUrl: u('1544244015-0df4b3ffc6b0'), size: 'WiFi / 128GB', stock: 30 },
      { color: 'Lavender', colorCode: '#b4a7d6', imageUrl: u('1585790050230-5ab7e49e5c16'), size: 'WiFi / 128GB', stock: 25 },
      { color: 'Mint', colorCode: '#98d1c8', imageUrl: u('1561154464-82381f21c915'), size: 'WiFi / 128GB', stock: 20 },
    ]
  );

  await createProduct(
    { name: 'HP Victus 15 Gaming', slug: 'hp-victus-15-gaming', description: 'Intel i5-13420H, RTX 4050, 15.6" FHD 144Hz, 16GB DDR5.', shortDescription: 'i5-13420H | RTX 4050 | 144Hz | 16GB', price: 72990, comparePrice: 84990, costPrice: 58000, sku: 'HP-VIC15', stock: 50, categoryId: cats['laptops'].id, brandId: brands['hp'].id, attributes: {} },
    [u('1496181133206-80ce9b88a853'), u('1611186871348-b1ce696e52c9')],
    [
      { color: 'Performance Blue', colorCode: '#1565c0', imageUrl: u('1496181133206-80ce9b88a853'), size: '16GB / 512GB', stock: 25 },
      { color: 'Mica Silver', colorCode: '#9e9e9e', imageUrl: u('1611186871348-b1ce696e52c9'), size: '16GB / 1TB', stock: 15, price: 79990 },
    ]
  );

  await createProduct(
    { name: 'Dell Inspiron 15 3000', slug: 'dell-inspiron-15', description: 'Intel Core i3-1215U, 15.6" FHD, 8GB RAM, 512GB SSD, everyday productivity.', shortDescription: 'i3-1215U | 15.6" FHD | 8GB | 512GB', price: 36990, comparePrice: 44990, costPrice: 28000, sku: 'DEL-INS15', stock: 100, categoryId: cats['laptops'].id, brandId: brands['dell'].id, attributes: {} },
    [u('1541807084-5c52b6b3adef'), u('1611186871348-b1ce696e52c9')],
    [
      { color: 'Carbon Black', colorCode: '#1a1a1a', imageUrl: u('1541807084-5c52b6b3adef'), size: '8GB / 512GB', stock: 50 },
      { color: 'Platinum Silver', colorCode: '#c0c0c0', imageUrl: u('1611186871348-b1ce696e52c9'), size: '8GB / 512GB', stock: 30 },
    ]
  );

  await createProduct(
    { name: 'Apple iPad Air M2', slug: 'ipad-air-m2', description: 'M2 chip, 11" Liquid Retina, Apple Pencil Pro support, landscape camera.', shortDescription: 'M2 | 11" Retina | Pencil Pro | WiFi 6E', price: 69900, comparePrice: 74900, costPrice: 55000, sku: 'APL-IPAM2', stock: 80, categoryId: cats['laptops'].id, brandId: brands['apple'].id, attributes: {} },
    [u('1544244015-0df4b3ffc6b0'), u('1585790050230-5ab7e49e5c16'), u('1561154464-82381f21c915')],
    [
      { color: 'Space Gray', colorCode: '#616161', imageUrl: u('1544244015-0df4b3ffc6b0'), size: '128GB', stock: 20 },
      { color: 'Starlight', colorCode: '#f5e6d3', imageUrl: u('1585790050230-5ab7e49e5c16'), size: '128GB', stock: 15 },
      { color: 'Blue', colorCode: '#5c6bc0', imageUrl: u('1561154464-82381f21c915'), size: '128GB', stock: 15 },
      { color: 'Purple', colorCode: '#9575cd', imageUrl: u('1544244015-0df4b3ffc6b0'), size: '256GB', stock: 10, price: 79900 },
    ]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO (6)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Sony WH-1000XM5', slug: 'sony-wh-1000xm5', description: 'Industry-leading ANC, LDAC, 30hr battery, multipoint, ultra-light.', shortDescription: 'Best ANC | 30hr | LDAC | 250g', price: 29990, comparePrice: 34990, costPrice: 22000, sku: 'SNY-XM5', stock: 300, categoryId: cats['audio'].id, brandId: brands['sony'].id, isFeatured: true, attributes: {} },
    [u('1505740420928-5e560c06d30e'), u('1583394838336-acd977736f90'), u('1546435770-a3e426bf59b7')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1505740420928-5e560c06d30e'), stock: 100 },
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1583394838336-acd977736f90'), stock: 80 },
      { color: 'Midnight Blue', colorCode: '#1a237e', imageUrl: u('1546435770-a3e426bf59b7'), stock: 60 },
    ]
  );

  await createProduct(
    { name: 'Apple AirPods Pro 2', slug: 'airpods-pro-2', description: 'H2 chip, 2x ANC, Adaptive Transparency, Personalized Spatial Audio, USB-C.', shortDescription: 'H2 | 2x ANC | USB-C | Spatial Audio', price: 24900, comparePrice: 26900, costPrice: 19000, sku: 'APL-APP2', stock: 200, categoryId: cats['audio'].id, brandId: brands['apple'].id, attributes: {} },
    [u('1606220588913-b3aacb4d2f46'), u('1590658268037-6bf12f032f55')],
    [{ color: 'White', colorCode: '#f5f5f5', imageUrl: u('1606220588913-b3aacb4d2f46'), stock: 200 }]
  );

  await createProduct(
    { name: 'boAt Airdopes 141', slug: 'boat-airdopes-141', description: '42hr playback, IPX4, ENx noise cancellation, low latency gaming mode.', shortDescription: '42hr | IPX4 | ENx | Gaming Mode', price: 1299, comparePrice: 2990, costPrice: 500, sku: 'BOAT-141', stock: 1000, categoryId: cats['audio'].id, brandId: brands['boat'].id, attributes: {} },
    [u('1590658268037-6bf12f032f55'), u('1606220588913-b3aacb4d2f46'), u('1572569511254-d8f925fe2cbb')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1590658268037-6bf12f032f55'), stock: 300 },
      { color: 'White', colorCode: '#f5f5f5', imageUrl: u('1606220588913-b3aacb4d2f46'), stock: 200 },
      { color: 'Blue', colorCode: '#1565c0', imageUrl: u('1572569511254-d8f925fe2cbb'), stock: 150 },
      { color: 'Green', colorCode: '#2e7d32', imageUrl: u('1590658268037-6bf12f032f55'), stock: 100 },
    ]
  );

  await createProduct(
    { name: 'boAt Rockerz 550', slug: 'boat-rockerz-550', description: '50mm drivers, 20hr playback, physical noise isolation, foldable design.', shortDescription: '50mm | 20hr | Noise Isolation | Foldable', price: 1799, comparePrice: 3490, costPrice: 700, sku: 'BOAT-R550', stock: 500, categoryId: cats['audio'].id, brandId: brands['boat'].id, attributes: {} },
    [u('1583394838336-acd977736f90'), u('1505740420928-5e560c06d30e')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1583394838336-acd977736f90'), stock: 150 },
      { color: 'Red', colorCode: '#e53935', imageUrl: u('1505740420928-5e560c06d30e'), stock: 100 },
      { color: 'Blue', colorCode: '#1565c0', imageUrl: u('1546435770-a3e426bf59b7'), stock: 80 },
    ]
  );

  await createProduct(
    { name: 'Sony WF-1000XM5', slug: 'sony-wf-1000xm5', description: 'World\'s smallest ANC earbuds, LDAC, speak-to-chat, 24hr with case.', shortDescription: 'Smallest ANC | LDAC | 24hr | Foam Tips', price: 19990, comparePrice: 24990, costPrice: 14000, sku: 'SNY-WF5', stock: 150, categoryId: cats['audio'].id, brandId: brands['sony'].id, attributes: {} },
    [u('1572569511254-d8f925fe2cbb'), u('1590658268037-6bf12f032f55')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1572569511254-d8f925fe2cbb'), stock: 80 },
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1590658268037-6bf12f032f55'), stock: 70 },
    ]
  );

  await createProduct(
    { name: 'Samsung Galaxy Buds3 Pro', slug: 'galaxy-buds3-pro', description: 'Blade lights, 2-way speakers, 360 Audio, ANC, interpreter mode.', shortDescription: '360 Audio | ANC | Interpreter | IP57', price: 18999, comparePrice: 21999, costPrice: 13000, sku: 'SAM-GB3P', stock: 120, categoryId: cats['audio'].id, brandId: brands['samsung'].id, attributes: {} },
    [u('1606220588913-b3aacb4d2f46'), u('1572569511254-d8f925fe2cbb')],
    [
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1606220588913-b3aacb4d2f46'), stock: 60 },
      { color: 'White', colorCode: '#f5f5f5', imageUrl: u('1572569511254-d8f925fe2cbb'), stock: 60 },
    ]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TVs (3)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Samsung 55" Crystal 4K Smart TV', slug: 'samsung-55-crystal-4k', description: 'Crystal UHD 4K, PurColor, HDR, Tizen OS, Alexa & Google built-in.', shortDescription: '55" 4K | Crystal Processor | Smart TV', price: 47990, comparePrice: 64900, costPrice: 38000, sku: 'SAM-55CU', stock: 50, categoryId: cats['tvs'].id, brandId: brands['samsung'].id, attributes: {} },
    [u('1593359677879-a4bb92f829d1'), u('1461151304267-38535e780c79')],
    [
      { size: '43 inch', stock: 20, price: 35990 },
      { size: '55 inch', stock: 25 },
      { size: '65 inch', stock: 15, price: 67990 },
    ]
  );

  await createProduct(
    { name: 'Sony Bravia 55" 4K Google TV', slug: 'sony-bravia-55', description: 'Cognitive Processor XR, Triluminos Pro, Dolby Vision Atmos, Google TV.', shortDescription: 'XR Processor | Triluminos | Dolby Vision', price: 74990, comparePrice: 89990, costPrice: 60000, sku: 'SNY-BR55', stock: 30, categoryId: cats['tvs'].id, brandId: brands['sony'].id, attributes: {} },
    [u('1461151304267-38535e780c79'), u('1593359677879-a4bb92f829d1')],
    [{ size: '55 inch', stock: 15 }, { size: '65 inch', stock: 10, price: 99990 }]
  );

  await createProduct(
    { name: 'Xiaomi Smart TV X 43"', slug: 'xiaomi-smart-tv-x-43', description: '4K Dolby Vision, 30W Dolby Audio, Patchwall, Chromecast built-in.', shortDescription: '43" 4K | Dolby Vision | 30W Audio', price: 25999, comparePrice: 32999, costPrice: 18000, sku: 'XMI-TVX43', stock: 60, categoryId: cats['tvs'].id, brandId: brands['xiaomi'].id, attributes: {} },
    [u('1593359677879-a4bb92f829d1'), u('1558888401-3cc1de77652d')],
    [{ size: '43 inch', stock: 30 }, { size: '50 inch', stock: 20, price: 31999 }, { size: '55 inch', stock: 10, price: 37999 }]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GAMING (3)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Sony PlayStation 5 Slim', slug: 'ps5-slim', description: 'Slimmer PS5, 1TB SSD, 4K 120fps, DualSense, Ray Tracing, PS4 backward compat.', shortDescription: '1TB SSD | 4K 120fps | DualSense | Ray Tracing', price: 49990, comparePrice: 54990, costPrice: 40000, sku: 'SNY-PS5S', stock: 60, categoryId: cats['gaming'].id, brandId: brands['sony'].id, isFeatured: true, attributes: {} },
    [u('1606144042614-b2417e99c4e3'), u('1621259182978-fbf93132d53d')],
    [
      { color: 'White', colorCode: '#f5f5f5', imageUrl: u('1606144042614-b2417e99c4e3'), size: 'Disc Edition', stock: 20 },
      { color: 'White', colorCode: '#f5f5f5', imageUrl: u('1606144042614-b2417e99c4e3'), size: 'Digital Edition', stock: 15, price: 44990 },
      { color: 'Midnight Black', colorCode: '#1a1a1a', imageUrl: u('1621259182978-fbf93132d53d'), size: 'Disc Edition', stock: 15 },
    ]
  );

  await createProduct(
    { name: 'Xbox Series X', slug: 'xbox-series-x', description: '12 teraflops GPU, 4K 120fps, 1TB custom SSD, Xbox Game Pass.', shortDescription: '12 TFLOPS | 4K 120fps | 1TB SSD | Game Pass', price: 49990, comparePrice: 54990, costPrice: 40000, sku: 'MS-XSX', stock: 40, categoryId: cats['gaming'].id, brandId: brands['sony'].id, attributes: {} },
    [u('1621259182978-fbf93132d53d'), u('1606144042614-b2417e99c4e3')],
    [{ color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1621259182978-fbf93132d53d'), stock: 40 }]
  );

  await createProduct(
    { name: 'Nintendo Switch OLED', slug: 'nintendo-switch-oled', description: '7" OLED screen, wide adjustable stand, 64GB storage, enhanced audio.', shortDescription: '7" OLED | 64GB | Enhanced Audio | Dock', price: 34999, comparePrice: 39999, costPrice: 27000, sku: 'NIN-SWOLED', stock: 50, categoryId: cats['gaming'].id, brandId: brands['sony'].id, attributes: {} },
    [u('1578303512597-81e6cc155b3e'), u('1606144042614-b2417e99c4e3')],
    [
      { color: 'White', colorCode: '#f5f5f5', imageUrl: u('1578303512597-81e6cc155b3e'), stock: 25 },
      { color: 'Neon Red/Blue', colorCode: '#e53935', imageUrl: u('1606144042614-b2417e99c4e3'), stock: 25 },
    ]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MEN'S CLOTHING (12)
  // ═══════════════════════════════════════════════════════════════════════════
  const mensSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const jeansSizes = ['28', '30', '32', '34', '36', '38'];

  await createProduct(
    { name: 'Nike Dri-FIT Running T-Shirt', slug: 'nike-drifit-tshirt', description: 'Lightweight Dri-FIT moisture-wicking tee with mesh back panel and reflective swoosh.', shortDescription: 'Dri-FIT | Mesh Back | Reflective', price: 1795, comparePrice: 2495, costPrice: 800, sku: 'NK-DFT', stock: 500, categoryId: cats['mens-clothing'].id, brandId: brands['nike'].id, attributes: {} },
    [u('1521572163474-6864f9cf17ab'), u('1583743814966-8936f5b7be1a'), u('1562157873-818bc0726f68')],
    clothingVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1521572163474-6864f9cf17ab') },
      { n: 'White', c: '#f5f5f5', img: u('1583743814966-8936f5b7be1a') },
      { n: 'Navy', c: '#1a237e', img: u('1562157873-818bc0726f68') },
      { n: 'Red', c: '#e53935', img: u('1521572163474-6864f9cf17ab') },
    ], mensSizes, 12)
  );

  await createProduct(
    { name: 'Adidas Originals Trefoil Tee', slug: 'adidas-trefoil-tee', description: 'Classic Trefoil logo, soft cotton jersey, ribbed crew neck, regular fit.', shortDescription: 'Trefoil Logo | Cotton | Regular Fit', price: 1999, comparePrice: 2599, costPrice: 900, sku: 'AD-TRF', stock: 400, categoryId: cats['mens-clothing'].id, brandId: brands['adidas'].id, attributes: {} },
    [u('1583743814966-8936f5b7be1a'), u('1521572163474-6864f9cf17ab')],
    clothingVariants([
      { n: 'White/Black', c: '#f5f5f5', img: u('1583743814966-8936f5b7be1a') },
      { n: 'Black/White', c: '#1a1a1a', img: u('1521572163474-6864f9cf17ab') },
      { n: 'Navy', c: '#1a237e', img: u('1562157873-818bc0726f68') },
    ], mensSizes, 15)
  );

  await createProduct(
    { name: 'Levi\'s 511 Slim Fit Jeans', slug: 'levis-511-slim', description: 'Classic slim fit with stretch denim, sits below waist, 5-pocket styling.', shortDescription: 'Slim | Stretch Denim | 5-Pocket', price: 2799, comparePrice: 3999, costPrice: 1500, sku: 'LEV-511', stock: 600, categoryId: cats['mens-clothing'].id, brandId: brands['levi-s'].id, attributes: {} },
    [u('1542272604-787c3835535d'), u('1541099649105-f69ad21f3246'), u('1475178626620-a4d074967571')],
    clothingVariants([
      { n: 'Dark Indigo', c: '#1a237e', img: u('1542272604-787c3835535d') },
      { n: 'Black', c: '#1a1a1a', img: u('1541099649105-f69ad21f3246') },
      { n: 'Light Blue', c: '#64b5f6', img: u('1475178626620-a4d074967571') },
    ], jeansSizes, 15)
  );

  await createProduct(
    { name: 'Allen Solly Formal Shirt', slug: 'allen-solly-formal-shirt', description: 'Premium cotton, regular fit, button-down collar, wrinkle-resistant.', shortDescription: 'Cotton | Regular Fit | Wrinkle-Resistant', price: 1499, comparePrice: 2199, costPrice: 700, sku: 'AS-FS', stock: 600, categoryId: cats['mens-clothing'].id, brandId: brands['allen-solly'].id, attributes: {} },
    [u('1596755094514-f87e34085b2c'), u('1602810318383-e386cc2a3ccf'), u('1594938298603-c8148c4dae35')],
    clothingVariants([
      { n: 'White', c: '#f5f5f5', img: u('1596755094514-f87e34085b2c') },
      { n: 'Light Blue', c: '#90caf9', img: u('1602810318383-e386cc2a3ccf') },
      { n: 'Pink', c: '#f48fb1', img: u('1594938298603-c8148c4dae35') },
      { n: 'Lavender', c: '#b39ddb', img: u('1596755094514-f87e34085b2c') },
    ], mensSizes, 15)
  );

  await createProduct(
    { name: 'Peter England Polo T-Shirt', slug: 'peter-england-polo', description: 'Classic polo with contrast collar, pique cotton, embroidered logo.', shortDescription: 'Pique Cotton | Contrast Collar | Logo', price: 1299, comparePrice: 1799, costPrice: 550, sku: 'PE-POLO', stock: 400, categoryId: cats['mens-clothing'].id, brandId: brands['peter-england'].id, attributes: {} },
    [u('1521572163474-6864f9cf17ab'), u('1583743814966-8936f5b7be1a')],
    clothingVariants([
      { n: 'Navy', c: '#1a237e', img: u('1521572163474-6864f9cf17ab') },
      { n: 'White', c: '#f5f5f5', img: u('1583743814966-8936f5b7be1a') },
      { n: 'Olive', c: '#558b2f', img: u('1562157873-818bc0726f68') },
    ], mensSizes, 12)
  );

  await createProduct(
    { name: 'Puma Men\'s Graphic Hoodie', slug: 'puma-graphic-hoodie', description: 'Kangaroo pocket, ribbed cuffs, drawcord hood, Cat logo on chest.', shortDescription: 'Cotton Blend | Kangaroo Pocket | Cat Logo', price: 2499, comparePrice: 3499, costPrice: 1200, sku: 'PM-HOOD', stock: 300, categoryId: cats['mens-clothing'].id, brandId: brands['puma'].id, attributes: {} },
    [u('1556821840-3a63f95609a7'), u('1578768079052-aa76e52ff62e'), u('1614975059251-992f11792b9f')],
    clothingVariants([
      { n: 'Gray Heather', c: '#9e9e9e', img: u('1556821840-3a63f95609a7') },
      { n: 'Black', c: '#1a1a1a', img: u('1578768079052-aa76e52ff62e') },
      { n: 'Navy', c: '#1a237e', img: u('1614975059251-992f11792b9f') },
    ], mensSizes, 10)
  );

  await createProduct(
    { name: 'Zara Textured Blazer', slug: 'zara-textured-blazer', description: 'Textured weave, notched lapels, flap pockets, single-button, slim fit.', shortDescription: 'Textured | Notched Lapels | Slim Fit', price: 4990, comparePrice: 6990, costPrice: 2500, sku: 'ZR-BLZ', stock: 200, categoryId: cats['mens-clothing'].id, brandId: brands['zara'].id, attributes: {} },
    [u('1507003211169-0a1dd7228f2d'), u('1594938298603-c8148c4dae35')],
    clothingVariants([
      { n: 'Navy Blue', c: '#1a237e', img: u('1507003211169-0a1dd7228f2d') },
      { n: 'Charcoal', c: '#424242', img: u('1594938298603-c8148c4dae35') },
      { n: 'Black', c: '#1a1a1a', img: u('1507003211169-0a1dd7228f2d') },
    ], ['S', 'M', 'L', 'XL'], 8)
  );

  await createProduct(
    { name: 'H&M Slim Fit Chinos', slug: 'hm-slim-chinos', description: 'Stretch cotton twill, zip fly, side pockets, tapered legs.', shortDescription: 'Slim | Stretch Cotton | Tapered', price: 1299, comparePrice: 1799, costPrice: 600, sku: 'HM-CHN', stock: 500, categoryId: cats['mens-clothing'].id, brandId: brands['h-m'].id, attributes: {} },
    [u('1473966968600-fa801b869a1a'), u('1506629082955-511b1aa562c8')],
    clothingVariants([
      { n: 'Beige', c: '#d4c5a9', img: u('1473966968600-fa801b869a1a') },
      { n: 'Black', c: '#1a1a1a', img: u('1506629082955-511b1aa562c8') },
      { n: 'Olive', c: '#558b2f', img: u('1473966968600-fa801b869a1a') },
      { n: 'Navy', c: '#1a237e', img: u('1506629082955-511b1aa562c8') },
    ], jeansSizes, 12)
  );

  await createProduct(
    { name: 'Tommy Hilfiger Crew Neck Sweater', slug: 'tommy-crew-sweater', description: 'Premium cotton, flag logo, ribbed trims, classic crew neck fit.', shortDescription: 'Premium Cotton | Flag Logo | Crew Neck', price: 5999, comparePrice: 7999, costPrice: 3000, sku: 'TH-CRW', stock: 150, categoryId: cats['mens-clothing'].id, brandId: brands['tommy-hilfiger'].id, attributes: {} },
    [u('1556821840-3a63f95609a7'), u('1614975059251-992f11792b9f')],
    clothingVariants([
      { n: 'Desert Sky', c: '#1a237e', img: u('1556821840-3a63f95609a7') },
      { n: 'Primary Red', c: '#e53935', img: u('1614975059251-992f11792b9f') },
      { n: 'Light Grey', c: '#bdbdbd', img: u('1578768079052-aa76e52ff62e') },
    ], mensSizes, 8)
  );

  await createProduct(
    { name: 'Jack & Jones Denim Jacket', slug: 'jack-jones-denim-jacket', description: 'Classic denim jacket with button closure, chest pockets, side pockets.', shortDescription: 'Denim | Button Closure | Chest Pockets', price: 2999, comparePrice: 4299, costPrice: 1500, sku: 'JJ-DNM', stock: 180, categoryId: cats['mens-clothing'].id, brandId: brands['jack-jones'].id, attributes: {} },
    [u('1542272604-787c3835535d'), u('1475178626620-a4d074967571')],
    clothingVariants([
      { n: 'Mid Blue', c: '#42a5f5', img: u('1542272604-787c3835535d') },
      { n: 'Dark Blue', c: '#1565c0', img: u('1475178626620-a4d074967571') },
      { n: 'Black', c: '#1a1a1a', img: u('1541099649105-f69ad21f3246') },
    ], mensSizes, 8)
  );

  await createProduct(
    { name: 'U.S. Polo Assn Striped T-Shirt', slug: 'us-polo-striped-tee', description: 'Classic striped polo-inspired t-shirt, breathable cotton, USPA logo.', shortDescription: 'Striped | Cotton | USPA Logo', price: 999, comparePrice: 1599, costPrice: 400, sku: 'USPA-ST', stock: 350, categoryId: cats['mens-clothing'].id, brandId: brands['u-s-polo'].id, attributes: {} },
    [u('1521572163474-6864f9cf17ab'), u('1562157873-818bc0726f68')],
    clothingVariants([
      { n: 'Navy/White', c: '#1a237e', img: u('1521572163474-6864f9cf17ab') },
      { n: 'Red/White', c: '#e53935', img: u('1562157873-818bc0726f68') },
    ], mensSizes, 15)
  );

  await createProduct(
    { name: 'Calvin Klein Slim Fit Shirt', slug: 'ck-slim-shirt', description: 'Premium cotton blend, slim fit, spread collar, CK monogram on cuff.', shortDescription: 'Slim Fit | Premium Cotton | CK Monogram', price: 3999, comparePrice: 5499, costPrice: 2000, sku: 'CK-SLM', stock: 150, categoryId: cats['mens-clothing'].id, brandId: brands['calvin-klein'].id, attributes: {} },
    [u('1596755094514-f87e34085b2c'), u('1602810318383-e386cc2a3ccf')],
    clothingVariants([
      { n: 'White', c: '#f5f5f5', img: u('1596755094514-f87e34085b2c') },
      { n: 'Black', c: '#1a1a1a', img: u('1602810318383-e386cc2a3ccf') },
      { n: 'Sky Blue', c: '#90caf9', img: u('1596755094514-f87e34085b2c') },
    ], mensSizes, 8)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // WOMEN'S CLOTHING (10)
  // ═══════════════════════════════════════════════════════════════════════════
  const womensSizes = ['XS', 'S', 'M', 'L', 'XL'];

  await createProduct(
    { name: 'Zara Satin Midi Dress', slug: 'zara-satin-midi', description: 'Elegant satin midi, V-neck, spaghetti straps, side slit, back zip.', shortDescription: 'Satin | V-Neck | Midi | Side Slit', price: 3990, comparePrice: 5490, costPrice: 1800, sku: 'ZR-SMD', stock: 300, categoryId: cats['womens-clothing'].id, brandId: brands['zara'].id, isFeatured: true, attributes: {} },
    [u('1595777457583-95e059d581b8'), u('1572804013309-59a88b7e92f1'), u('1496747611176-843222e1e57c')],
    clothingVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1595777457583-95e059d581b8') },
      { n: 'Burgundy', c: '#800020', img: u('1572804013309-59a88b7e92f1') },
      { n: 'Emerald', c: '#2e7d32', img: u('1496747611176-843222e1e57c') },
      { n: 'Navy', c: '#1a237e', img: u('1515886657613-9f3515b0c78f') },
    ], womensSizes, 8)
  );

  await createProduct(
    { name: 'H&M Floral Wrap Top', slug: 'hm-floral-wrap', description: 'Viscose wrap top, floral print, V-neck, puff sleeves, smocked cuffs.', shortDescription: 'Wrap | Floral | Puff Sleeves', price: 1499, comparePrice: 1999, costPrice: 650, sku: 'HM-FWT', stock: 300, categoryId: cats['womens-clothing'].id, brandId: brands['h-m'].id, attributes: {} },
    [u('1564584217132-2271feaeb3c5'), u('1434389677669-e08b4cda3a74')],
    clothingVariants([
      { n: 'Pink Floral', c: '#f48fb1', img: u('1564584217132-2271feaeb3c5') },
      { n: 'Blue Floral', c: '#64b5f6', img: u('1434389677669-e08b4cda3a74') },
      { n: 'Yellow Floral', c: '#ffd54f', img: u('1564584217132-2271feaeb3c5') },
    ], womensSizes, 12)
  );

  await createProduct(
    { name: 'Levi\'s 721 High Rise Skinny', slug: 'levis-721-skinny', description: 'High rise skinny with advanced stretch, sits above waist, 5-pocket.', shortDescription: 'High Rise | Skinny | Advanced Stretch', price: 3199, comparePrice: 4299, costPrice: 1600, sku: 'LEV-721', stock: 400, categoryId: cats['womens-clothing'].id, brandId: brands['levi-s'].id, attributes: {} },
    [u('1541099649105-f69ad21f3246'), u('1542272604-787c3835535d'), u('1475178626620-a4d074967571')],
    clothingVariants([
      { n: 'Cast Shadows', c: '#37474f', img: u('1541099649105-f69ad21f3246') },
      { n: 'Black Sheep', c: '#1a1a1a', img: u('1542272604-787c3835535d') },
      { n: 'Light Wash', c: '#90caf9', img: u('1475178626620-a4d074967571') },
    ], ['24', '26', '28', '30', '32'], 12)
  );

  await createProduct(
    { name: 'Puma Women\'s Running Jacket', slug: 'puma-women-jacket', description: 'dryCELL, reflective elements, thumbholes, zippered pockets.', shortDescription: 'dryCELL | Reflective | Thumbholes', price: 3499, comparePrice: 4999, costPrice: 1700, sku: 'PM-WRJ', stock: 200, categoryId: cats['womens-clothing'].id, brandId: brands['puma'].id, attributes: {} },
    [u('1515886657613-9f3515b0c78f'), u('1483985988355-763728e1935b')],
    clothingVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1515886657613-9f3515b0c78f') },
      { n: 'Pink', c: '#ec407a', img: u('1483985988355-763728e1935b') },
      { n: 'Purple', c: '#7b1fa2', img: u('1515886657613-9f3515b0c78f') },
    ], womensSizes, 8)
  );

  await createProduct(
    { name: 'Allen Solly Women Formal Trousers', slug: 'allen-solly-women-trousers', description: 'Slim fit formal stretch trousers, flat front, polished finish.', shortDescription: 'Slim | Stretch | Formal', price: 1799, comparePrice: 2499, costPrice: 800, sku: 'AS-WFT', stock: 300, categoryId: cats['womens-clothing'].id, brandId: brands['allen-solly'].id, attributes: {} },
    [u('1594938298603-c8148c4dae35'), u('1506629082955-511b1aa562c8')],
    clothingVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1594938298603-c8148c4dae35') },
      { n: 'Navy', c: '#1a237e', img: u('1506629082955-511b1aa562c8') },
      { n: 'Beige', c: '#d4c5a9', img: u('1594938298603-c8148c4dae35') },
    ], ['26', '28', '30', '32', '34'], 10)
  );

  await createProduct(
    { name: 'H&M Oversized Hoodie', slug: 'hm-oversized-hoodie-women', description: 'Soft sweatshirt fabric, lined drawstring hood, kangaroo pocket, dropped shoulders.', shortDescription: 'Oversized | Soft Fleece | Kangaroo Pocket', price: 1799, comparePrice: 2299, costPrice: 800, sku: 'HM-WOH', stock: 250, categoryId: cats['womens-clothing'].id, brandId: brands['h-m'].id, attributes: {} },
    [u('1614975059251-992f11792b9f'), u('1556821840-3a63f95609a7')],
    clothingVariants([
      { n: 'Grey Marl', c: '#9e9e9e', img: u('1614975059251-992f11792b9f') },
      { n: 'Black', c: '#1a1a1a', img: u('1556821840-3a63f95609a7') },
      { n: 'Cream', c: '#fff8e1', img: u('1578768079052-aa76e52ff62e') },
    ], womensSizes, 10)
  );

  await createProduct(
    { name: 'Van Heusen Women Blazer', slug: 'van-heusen-women-blazer', description: 'Structured single-breasted blazer, notch collar, two-button, welt pockets.', shortDescription: 'Structured | Single-Breasted | Notch Collar', price: 3999, comparePrice: 5999, costPrice: 2000, sku: 'VH-WBZ', stock: 150, categoryId: cats['womens-clothing'].id, brandId: brands['van-heusen'].id, attributes: {} },
    [u('1507003211169-0a1dd7228f2d'), u('1594938298603-c8148c4dae35')],
    clothingVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1507003211169-0a1dd7228f2d') },
      { n: 'Navy', c: '#1a237e', img: u('1594938298603-c8148c4dae35') },
    ], womensSizes, 8)
  );

  await createProduct(
    { name: 'Zara Printed Pleated Skirt', slug: 'zara-pleated-skirt', description: 'Flowing pleated midi skirt, elastic waist, lined, bold print.', shortDescription: 'Pleated | Midi | Elastic Waist', price: 2490, comparePrice: 3490, costPrice: 1100, sku: 'ZR-PLS', stock: 200, categoryId: cats['womens-clothing'].id, brandId: brands['zara'].id, attributes: {} },
    [u('1496747611176-843222e1e57c'), u('1595777457583-95e059d581b8')],
    clothingVariants([
      { n: 'Floral', c: '#ec407a', img: u('1496747611176-843222e1e57c') },
      { n: 'Abstract', c: '#5c6bc0', img: u('1595777457583-95e059d581b8') },
    ], womensSizes, 10)
  );

  await createProduct(
    { name: 'Nike Women Dri-FIT Leggings', slug: 'nike-women-leggings', description: 'High-waisted Dri-FIT leggings, 7/8 length, hidden pocket, flat seams.', shortDescription: 'Dri-FIT | High Waist | 7/8 Length | Pocket', price: 2495, comparePrice: 3295, costPrice: 1100, sku: 'NK-WLG', stock: 300, categoryId: cats['womens-clothing'].id, brandId: brands['nike'].id, attributes: {} },
    [u('1515886657613-9f3515b0c78f'), u('1483985988355-763728e1935b')],
    clothingVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1515886657613-9f3515b0c78f') },
      { n: 'Dark Grey', c: '#424242', img: u('1483985988355-763728e1935b') },
      { n: 'Navy', c: '#1a237e', img: u('1515886657613-9f3515b0c78f') },
    ], womensSizes, 12)
  );

  await createProduct(
    { name: 'Lakme Cotton Kurti', slug: 'lakme-cotton-kurti', description: 'Printed cotton A-line kurti, mandarin collar, 3/4 sleeves, side slits.', shortDescription: 'Cotton | A-Line | 3/4 Sleeves', price: 999, comparePrice: 1499, costPrice: 400, sku: 'LKM-KRT', stock: 400, categoryId: cats['womens-clothing'].id, brandId: brands['lakme'].id, attributes: {} },
    [u('1564584217132-2271feaeb3c5'), u('1434389677669-e08b4cda3a74')],
    clothingVariants([
      { n: 'Blue Print', c: '#42a5f5', img: u('1564584217132-2271feaeb3c5') },
      { n: 'Green Print', c: '#66bb6a', img: u('1434389677669-e08b4cda3a74') },
      { n: 'Maroon Print', c: '#c62828', img: u('1564584217132-2271feaeb3c5') },
    ], ['S', 'M', 'L', 'XL', 'XXL'], 12)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // KIDS' CLOTHING (3)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'H&M Kids Cotton T-Shirt 3-Pack', slug: 'hm-kids-3pack', description: '3 round-necked t-shirts, soft cotton jersey, assorted colors.', shortDescription: '3-Pack | Cotton | Assorted', price: 899, comparePrice: 1299, costPrice: 400, sku: 'HM-K3P', stock: 400, categoryId: cats['kids-clothing'].id, brandId: brands['h-m'].id, attributes: {} },
    [u('1503944583220-79d8926ad5e2'), u('1519238263530-99bdd11ffa6d')],
    [
      { size: '2-4Y', stock: 50 }, { size: '4-6Y', stock: 60 }, { size: '6-8Y', stock: 60 },
      { size: '8-10Y', stock: 50 }, { size: '10-12Y', stock: 40 },
    ]
  );

  await createProduct(
    { name: 'Puma Kids Tracksuit Set', slug: 'puma-kids-tracksuit', description: 'Zip jacket + jogger, cotton blend, Cat logo, elastic waistband.', shortDescription: 'Jacket + Jogger | Cotton | Cat Logo', price: 2199, comparePrice: 2999, costPrice: 1000, sku: 'PM-KTS', stock: 200, categoryId: cats['kids-clothing'].id, brandId: brands['puma'].id, attributes: {} },
    [u('1503944583220-79d8926ad5e2'), u('1471286174890-9c112ffca5b4')],
    clothingVariants([
      { n: 'Navy', c: '#1a237e', img: u('1503944583220-79d8926ad5e2') },
      { n: 'Black', c: '#1a1a1a', img: u('1471286174890-9c112ffca5b4') },
    ], ['4-5Y', '6-7Y', '8-9Y', '10-12Y'], 10)
  );

  await createProduct(
    { name: 'Adidas Kids Lite Racer Shoes', slug: 'adidas-kids-racer', description: 'Cloudfoam cushioning, mesh upper, slip-on, lightweight.', shortDescription: 'Cloudfoam | Mesh | Slip-On | Light', price: 2799, comparePrice: 3499, costPrice: 1400, sku: 'AD-KLR', stock: 300, categoryId: cats['kids-clothing'].id, brandId: brands['adidas'].id, attributes: {} },
    [u('1542291026-7eec264c27ff'), u('1549298916-b41d501d3772')],
    shoeVariants([
      { n: 'Royal Blue', c: '#1565c0', img: u('1542291026-7eec264c27ff') },
      { n: 'Pink', c: '#f48fb1', img: u('1549298916-b41d501d3772') },
      { n: 'Black', c: '#1a1a1a', img: u('1542291026-7eec264c27ff') },
    ], ['UK 10K', 'UK 11K', 'UK 12K', 'UK 13K', 'UK 1', 'UK 2'])
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MEN'S FOOTWEAR (8)
  // ═══════════════════════════════════════════════════════════════════════════
  const mensShoeSizes = ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'];

  await createProduct(
    { name: 'Nike Air Jordan 1 Mid', slug: 'nike-jordan-1-mid', description: 'Iconic silhouette, leather upper, Air-Sole cushioning, herringbone outsole.', shortDescription: 'Leather | Air-Sole | Iconic | Mid-Top', price: 10795, comparePrice: 12695, costPrice: 6000, sku: 'NK-AJ1M', stock: 300, categoryId: cats['mens-footwear'].id, brandId: brands['nike'].id, isFeatured: true, attributes: {} },
    [u('1542291026-7eec264c27ff'), u('1460353581641-37baddab0fa2'), u('1549298916-b41d501d3772')],
    shoeVariants([
      { n: 'Bred Toe', c: '#b71c1c', img: u('1542291026-7eec264c27ff') },
      { n: 'Shadow', c: '#616161', img: u('1460353581641-37baddab0fa2') },
      { n: 'University Blue', c: '#42a5f5', img: u('1549298916-b41d501d3772') },
    ], mensShoeSizes, 8)
  );

  await createProduct(
    { name: 'Adidas Ultraboost 23', slug: 'adidas-ultraboost-23', description: 'BOOST midsole, Primeknit+ upper, Continental rubber, Linear Energy Push.', shortDescription: 'BOOST | Primeknit+ | Continental', price: 16999, comparePrice: 19999, costPrice: 10000, sku: 'AD-UB23', stock: 250, categoryId: cats['mens-footwear'].id, brandId: brands['adidas'].id, attributes: {} },
    [u('1549298916-b41d501d3772'), u('1542291026-7eec264c27ff'), u('1595950653106-6c9ebd614d3a')],
    shoeVariants([
      { n: 'Core Black', c: '#1a1a1a', img: u('1549298916-b41d501d3772') },
      { n: 'Cloud White', c: '#f5f5f5', img: u('1542291026-7eec264c27ff') },
      { n: 'Carbon', c: '#424242', img: u('1595950653106-6c9ebd614d3a') },
    ], mensShoeSizes, 8)
  );

  await createProduct(
    { name: 'Puma RS-X Sneakers', slug: 'puma-rsx', description: 'Retro-futuristic chunky sneaker, RS cushioning, mesh & leather upper.', shortDescription: 'RS Cushioning | Chunky | Retro', price: 7999, comparePrice: 9999, costPrice: 4000, sku: 'PM-RSX', stock: 200, categoryId: cats['mens-footwear'].id, brandId: brands['puma'].id, attributes: {} },
    [u('1595950653106-6c9ebd614d3a'), u('1542291026-7eec264c27ff')],
    shoeVariants([
      { n: 'White/Blue', c: '#1565c0', img: u('1595950653106-6c9ebd614d3a') },
      { n: 'Black/Red', c: '#b71c1c', img: u('1542291026-7eec264c27ff') },
    ], mensShoeSizes, 10)
  );

  await createProduct(
    { name: 'Woodland Hiking Boots', slug: 'woodland-hiking-boots', description: 'Genuine leather, anti-skid rubber sole, cushioned insole, water-resistant.', shortDescription: 'Leather | Anti-Skid | Water-Resistant', price: 4495, comparePrice: 5995, costPrice: 2200, sku: 'WL-HKB', stock: 200, categoryId: cats['mens-footwear'].id, brandId: brands['woodland'].id, attributes: {} },
    [u('1520639888713-7851133b1ed0'), u('1606107557195-0e29a4b5b4aa'), u('1608256246200-53e635b5b65f')],
    shoeVariants([
      { n: 'Olive Green', c: '#558b2f', img: u('1520639888713-7851133b1ed0') },
      { n: 'Brown', c: '#5d4037', img: u('1606107557195-0e29a4b5b4aa') },
      { n: 'Tan', c: '#bcaaa4', img: u('1608256246200-53e635b5b65f') },
    ], mensShoeSizes, 8)
  );

  await createProduct(
    { name: 'Bata Formal Oxford Shoes', slug: 'bata-formal-oxford', description: 'Polished synthetic leather, lace-up, cushioned footbed, TPR sole.', shortDescription: 'Oxford | Cushioned | Formal | Durable', price: 1799, comparePrice: 2499, costPrice: 800, sku: 'BT-FOX', stock: 300, categoryId: cats['mens-footwear'].id, brandId: brands['bata'].id, attributes: {} },
    [u('1614252235316-8c857d38b5f4'), u('1520639888713-7851133b1ed0')],
    shoeVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1614252235316-8c857d38b5f4') },
      { n: 'Brown', c: '#5d4037', img: u('1520639888713-7851133b1ed0') },
    ], mensShoeSizes, 12)
  );

  await createProduct(
    { name: 'New Balance 574', slug: 'new-balance-574', description: 'Classic 574, ENCAP midsole, suede/mesh upper, timeless design.', shortDescription: 'ENCAP | Suede/Mesh | Classic 574', price: 7999, comparePrice: 9499, costPrice: 4500, sku: 'NB-574', stock: 180, categoryId: cats['mens-footwear'].id, brandId: brands['new-balance'].id, attributes: {} },
    [u('1460353581641-37baddab0fa2'), u('1595950653106-6c9ebd614d3a')],
    shoeVariants([
      { n: 'Grey/White', c: '#9e9e9e', img: u('1460353581641-37baddab0fa2') },
      { n: 'Navy/Red', c: '#1a237e', img: u('1595950653106-6c9ebd614d3a') },
      { n: 'Black', c: '#1a1a1a', img: u('1460353581641-37baddab0fa2') },
    ], mensShoeSizes, 8)
  );

  await createProduct(
    { name: 'Skechers Go Walk 7', slug: 'skechers-go-walk-7', description: 'Ultra Go cushioning, Air-Cooled Memory Foam, machine washable, slip-on.', shortDescription: 'Ultra Go | Memory Foam | Washable | Slip-On', price: 5499, comparePrice: 6999, costPrice: 3000, sku: 'SK-GW7', stock: 200, categoryId: cats['mens-footwear'].id, brandId: brands['skechers'].id, attributes: {} },
    [u('1549298916-b41d501d3772'), u('1460353581641-37baddab0fa2')],
    shoeVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1549298916-b41d501d3772') },
      { n: 'Navy', c: '#1a237e', img: u('1460353581641-37baddab0fa2') },
      { n: 'Charcoal', c: '#424242', img: u('1549298916-b41d501d3772') },
    ], mensShoeSizes, 10)
  );

  await createProduct(
    { name: 'Crocs Classic Clog', slug: 'crocs-classic-clog', description: 'Lightweight, waterproof, ventilation ports, pivoting heel straps.', shortDescription: 'Croslite | Waterproof | Ventilation | Iconic', price: 3495, comparePrice: 4495, costPrice: 1500, sku: 'CRC-CLG', stock: 400, categoryId: cats['mens-footwear'].id, brandId: brands['crocs'].id, attributes: {} },
    [u('1595950653106-6c9ebd614d3a'), u('1542291026-7eec264c27ff')],
    shoeVariants([
      { n: 'Black', c: '#1a1a1a', img: u('1595950653106-6c9ebd614d3a') },
      { n: 'White', c: '#f5f5f5', img: u('1542291026-7eec264c27ff') },
      { n: 'Navy', c: '#1a237e', img: u('1595950653106-6c9ebd614d3a') },
      { n: 'Army Green', c: '#558b2f', img: u('1542291026-7eec264c27ff') },
    ], ['M4/W6', 'M5/W7', 'M6/W8', 'M7/W9', 'M8/W10', 'M9/W11', 'M10/W12'], 8)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // WOMEN'S FOOTWEAR (4)
  // ═══════════════════════════════════════════════════════════════════════════
  const womensShoeSizes = ['UK 3', 'UK 4', 'UK 5', 'UK 6', 'UK 7', 'UK 8'];

  await createProduct(
    { name: 'Nike Air Max 270 Women', slug: 'nike-air-max-270-women', description: 'Biggest heel Air unit, breathable mesh, foam midsole.', shortDescription: 'Max Air | Mesh | Foam Midsole', price: 12995, comparePrice: 14995, costPrice: 7500, sku: 'NK-WAM270', stock: 250, categoryId: cats['womens-footwear'].id, brandId: brands['nike'].id, attributes: {} },
    [u('1542291026-7eec264c27ff'), u('1460353581641-37baddab0fa2'), u('1549298916-b41d501d3772')],
    shoeVariants([
      { n: 'Barely Rose', c: '#f8bbd0', img: u('1542291026-7eec264c27ff') },
      { n: 'White/Black', c: '#f5f5f5', img: u('1460353581641-37baddab0fa2') },
      { n: 'Pale Ivory', c: '#fffde7', img: u('1549298916-b41d501d3772') },
    ], womensShoeSizes, 8)
  );

  await createProduct(
    { name: 'Adidas Stan Smith Women', slug: 'adidas-stan-smith-women', description: 'Iconic tennis-inspired sneaker, Primegreen upper, OrthoLite sockliner.', shortDescription: 'Primegreen | OrthoLite | Tennis-Inspired', price: 7999, comparePrice: 9999, costPrice: 4500, sku: 'AD-SSW', stock: 200, categoryId: cats['womens-footwear'].id, brandId: brands['adidas'].id, attributes: {} },
    [u('1460353581641-37baddab0fa2'), u('1595950653106-6c9ebd614d3a')],
    shoeVariants([
      { n: 'White/Green', c: '#2e7d32', img: u('1460353581641-37baddab0fa2') },
      { n: 'White/Pink', c: '#ec407a', img: u('1595950653106-6c9ebd614d3a') },
    ], womensShoeSizes, 10)
  );

  await createProduct(
    { name: 'Bata Women Sandals', slug: 'bata-women-sandals', description: 'Cushioned footbed, slip-on, elegant design, TPR outsole.', shortDescription: 'Cushioned | Slip-On | Elegant | Comfort', price: 1299, comparePrice: 1799, costPrice: 500, sku: 'BT-WSL', stock: 300, categoryId: cats['womens-footwear'].id, brandId: brands['bata'].id, attributes: {} },
    [u('1549298916-b41d501d3772'), u('1542291026-7eec264c27ff')],
    shoeVariants([
      { n: 'Gold', c: '#d4a847', img: u('1549298916-b41d501d3772') },
      { n: 'Black', c: '#1a1a1a', img: u('1542291026-7eec264c27ff') },
      { n: 'Silver', c: '#c0c0c0', img: u('1549298916-b41d501d3772') },
    ], womensShoeSizes, 10)
  );

  await createProduct(
    { name: 'Fila Disruptor 2 Women', slug: 'fila-disruptor-2', description: 'Chunky platform sneaker, synthetic leather upper, EVA midsole, retro design.', shortDescription: 'Platform | Chunky | Retro | EVA Midsole', price: 5999, comparePrice: 7999, costPrice: 3000, sku: 'FL-DSR2', stock: 150, categoryId: cats['womens-footwear'].id, brandId: brands['fila'].id, attributes: {} },
    [u('1595950653106-6c9ebd614d3a'), u('1542291026-7eec264c27ff')],
    shoeVariants([
      { n: 'White', c: '#f5f5f5', img: u('1595950653106-6c9ebd614d3a') },
      { n: 'Pink', c: '#f48fb1', img: u('1542291026-7eec264c27ff') },
    ], womensShoeSizes, 10)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME & KITCHEN (6)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Prestige Gas Stove 3 Burner', slug: 'prestige-gas-3b', description: 'Toughened glass top, 3 brass burners, Svachh liftable, ISI certified.', shortDescription: '3 Burners | Glass Top | Svachh | ISI', price: 4299, comparePrice: 5999, costPrice: 2500, sku: 'PR-GS3', stock: 100, categoryId: cats['home-kitchen'].id, brandId: brands['prestige'].id, attributes: {} },
    [u('1556909114-f6e7ad7d3136'), u('1556909172-8b57fbb8a5a0')],
    [{ color: 'Black Glass', colorCode: '#1a1a1a', imageUrl: u('1556909114-f6e7ad7d3136'), stock: 50 }, { color: 'White Glass', colorCode: '#f5f5f5', imageUrl: u('1556909172-8b57fbb8a5a0'), stock: 50 }]
  );

  await createProduct(
    { name: 'Pigeon Non-Stick Cookware 7 Pcs', slug: 'pigeon-nonstick-7pc', description: '7-piece set: kadhai, fry pan, tawa, saucepan with lids. PFOA-free.', shortDescription: '7 Pieces | Non-Stick | PFOA-Free', price: 1499, comparePrice: 2499, costPrice: 700, sku: 'PGN-NS7', stock: 150, categoryId: cats['home-kitchen'].id, brandId: brands['pigeon'].id, attributes: {} },
    [u('1556909172-8b57fbb8a5a0'), u('1584568694244-14fbdf83bd30')],
    [{ color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1556909172-8b57fbb8a5a0'), stock: 80 }, { color: 'Red', colorCode: '#e53935', imageUrl: u('1584568694244-14fbdf83bd30'), stock: 50 }]
  );

  await createProduct(
    { name: 'Borosil Stainless Steel Flask 1L', slug: 'borosil-flask-1l', description: 'Vacuum insulated, 24hr hot/cold, BPA-free, leak-proof.', shortDescription: 'Vacuum | 24hr | BPA-Free | 1L', price: 999, comparePrice: 1499, costPrice: 450, sku: 'BR-FL1', stock: 200, categoryId: cats['home-kitchen'].id, brandId: brands['borosil'].id, attributes: {} },
    [u('1584568694244-14fbdf83bd30'), u('1556909114-f6e7ad7d3136')],
    [
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1584568694244-14fbdf83bd30'), stock: 60 },
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1556909114-f6e7ad7d3136'), stock: 50 },
      { color: 'Blue', colorCode: '#1565c0', imageUrl: u('1584568694244-14fbdf83bd30'), stock: 40 },
    ]
  );

  await createProduct(
    { name: 'Milton Thermosteel 500ml', slug: 'milton-thermosteel-500', description: 'Double-walled vacuum insulated, 24hr retention, food-grade stainless steel.', shortDescription: 'Vacuum | 24hr | SS | 500ml', price: 649, comparePrice: 999, costPrice: 300, sku: 'MLT-TS5', stock: 300, categoryId: cats['home-kitchen'].id, brandId: brands['milton'].id, attributes: {} },
    [u('1584568694244-14fbdf83bd30'), u('1556909172-8b57fbb8a5a0')],
    [
      { color: 'Steel', colorCode: '#c0c0c0', imageUrl: u('1584568694244-14fbdf83bd30'), stock: 100 },
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1556909172-8b57fbb8a5a0'), stock: 80 },
      { color: 'Red', colorCode: '#e53935', imageUrl: u('1584568694244-14fbdf83bd30'), stock: 60 },
    ]
  );

  await createProduct(
    { name: 'Hawkins Contura Pressure Cooker 3L', slug: 'hawkins-contura-3l', description: 'Hard anodized, Contura shape, even cooking, patented gasket.', shortDescription: 'Hard Anodized | Contura | 3L | Even Cooking', price: 2150, comparePrice: 2750, costPrice: 1200, sku: 'HWK-CC3', stock: 120, categoryId: cats['home-kitchen'].id, brandId: brands['hawkins'].id, attributes: {} },
    [u('1556909172-8b57fbb8a5a0'), u('1556909114-f6e7ad7d3136')],
    [{ size: '3 Litre', stock: 50 }, { size: '5 Litre', stock: 40, price: 2850 }]
  );

  await createProduct(
    { name: 'Prestige Electric Kettle 1.5L', slug: 'prestige-kettle-1-5l', description: 'Stainless steel, auto cut-off, concealed element, 1500W.', shortDescription: '1.5L | 1500W | Auto Cut-Off | SS', price: 849, comparePrice: 1195, costPrice: 400, sku: 'PR-EK15', stock: 250, categoryId: cats['home-kitchen'].id, brandId: brands['prestige'].id, attributes: {} },
    [u('1584568694244-14fbdf83bd30'), u('1556909114-f6e7ad7d3136')],
    [{ color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1584568694244-14fbdf83bd30'), stock: 100 }, { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1556909114-f6e7ad7d3136'), stock: 80 }]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS & FITNESS (5)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Decathlon Resistance Bands Set', slug: 'decathlon-bands', description: '5 latex bands (5-50 lbs), carry bag, door anchor, ankle straps.', shortDescription: '5 Bands | 5-50 lbs | Full Kit', price: 999, comparePrice: 1499, costPrice: 400, sku: 'DC-RBS', stock: 300, categoryId: cats['sports'].id, brandId: brands['decathlon'].id, attributes: {} },
    [u('1517836357463-d25dfeac3438'), u('1571902943202-507ec2618e8f')],
    [{ color: 'Multi-Color Set', colorCode: '#ff9800', imageUrl: u('1517836357463-d25dfeac3438'), stock: 300 }]
  );

  await createProduct(
    { name: 'Decathlon Yoga Mat 8mm', slug: 'decathlon-yoga-mat', description: 'Anti-slip textured, alignment guides, lightweight, carry strap included.', shortDescription: '8mm | Anti-Slip | Alignment Guide | Strap', price: 799, comparePrice: 999, costPrice: 350, sku: 'DC-YM8', stock: 400, categoryId: cats['sports'].id, brandId: brands['decathlon'].id, attributes: {} },
    [u('1576678927484-cc907957088c'), u('1517836357463-d25dfeac3438')],
    [
      { color: 'Purple', colorCode: '#7b1fa2', imageUrl: u('1576678927484-cc907957088c'), stock: 100 },
      { color: 'Blue', colorCode: '#1565c0', imageUrl: u('1517836357463-d25dfeac3438'), stock: 80 },
      { color: 'Pink', colorCode: '#ec407a', imageUrl: u('1576678927484-cc907957088c'), stock: 60 },
      { color: 'Green', colorCode: '#2e7d32', imageUrl: u('1517836357463-d25dfeac3438'), stock: 50 },
    ]
  );

  await createProduct(
    { name: 'Nike Brasilia Gym Duffel', slug: 'nike-brasilia-duffel', description: 'Shoe compartment, padded strap, multiple pockets, 41L.', shortDescription: 'Shoe Compartment | 41L | Padded Strap', price: 2695, comparePrice: 3495, costPrice: 1300, sku: 'NK-BDF', stock: 150, categoryId: cats['sports'].id, brandId: brands['nike'].id, attributes: {} },
    [u('1553062407-98eeb64c6a62'), u('1571902943202-507ec2618e8f')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1553062407-98eeb64c6a62'), stock: 60 },
      { color: 'Navy', colorCode: '#1a237e', imageUrl: u('1571902943202-507ec2618e8f'), stock: 40 },
      { color: 'Gray', colorCode: '#757575', imageUrl: u('1553062407-98eeb64c6a62'), stock: 30 },
    ]
  );

  await createProduct(
    { name: 'Fitbit Charge 6', slug: 'fitbit-charge-6', description: 'Advanced health tracker, GPS, stress management, 7-day battery.', shortDescription: 'GPS | Stress Mgmt | 7-Day Battery | SpO2', price: 14999, comparePrice: 17999, costPrice: 10000, sku: 'FB-CH6', stock: 80, categoryId: cats['sports'].id, brandId: brands['fitbit'].id, attributes: {} },
    [u('1524592094714-0f0654e20314'), u('1546868871-af0de0ae72be')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1524592094714-0f0654e20314'), stock: 30 },
      { color: 'Champagne Gold', colorCode: '#d4a847', imageUrl: u('1546868871-af0de0ae72be'), stock: 25 },
      { color: 'Coral', colorCode: '#ff8a65', imageUrl: u('1524592094714-0f0654e20314'), stock: 20 },
    ]
  );

  await createProduct(
    { name: 'Nivia Football Storm Size 5', slug: 'nivia-football-storm', description: 'Machine stitched, PVC material, butyl bladder, FIFA quality.', shortDescription: 'Machine Stitched | PVC | Butyl | Size 5', price: 599, comparePrice: 899, costPrice: 250, sku: 'NV-FBS5', stock: 200, categoryId: cats['sports'].id, brandId: brands['nivia'].id, attributes: {} },
    [u('1571902943202-507ec2618e8f'), u('1517836357463-d25dfeac3438')],
    [
      { color: 'White/Blue', colorCode: '#1565c0', imageUrl: u('1571902943202-507ec2618e8f'), stock: 80 },
      { color: 'White/Orange', colorCode: '#ff9800', imageUrl: u('1517836357463-d25dfeac3438'), stock: 60 },
    ]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKS (6)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Atomic Habits', slug: 'atomic-habits', description: 'Tiny Changes, Remarkable Results. #1 NYT bestseller by James Clear.', shortDescription: '#1 NYT Bestseller | Self-Help | 320 Pages', price: 499, comparePrice: 799, costPrice: 200, sku: 'BK-AH', stock: 600, categoryId: cats['books'].id, brandId: brands['penguin-books'].id, isFeatured: true, attributes: { author: 'James Clear', pages: '320' } },
    [u('1512820790803-83ca734da794'), u('1544947950-fa07a98d237f')],
    [{ size: 'Paperback', stock: 300 }, { size: 'Hardcover', stock: 100, price: 899 }]
  );

  await createProduct(
    { name: 'Sapiens: A Brief History', slug: 'sapiens', description: 'Yuval Noah Harari\'s groundbreaking narrative of humanity.', shortDescription: 'Bestseller | History | 498 Pages', price: 399, comparePrice: 599, costPrice: 180, sku: 'BK-SAP', stock: 500, categoryId: cats['books'].id, brandId: brands['harpercollins'].id, attributes: { author: 'Yuval Noah Harari', pages: '498' } },
    [u('1544947950-fa07a98d237f'), u('1512820790803-83ca734da794')],
    [{ size: 'Paperback', stock: 300 }, { size: 'Hardcover', stock: 100, price: 799 }]
  );

  await createProduct(
    { name: 'Psychology of Money', slug: 'psychology-of-money', description: '19 short stories on wealth, greed, and happiness by Morgan Housel.', shortDescription: 'Finance | 19 Stories | 256 Pages', price: 350, comparePrice: 499, costPrice: 150, sku: 'BK-POM', stock: 500, categoryId: cats['books'].id, brandId: brands['harpercollins'].id, attributes: { author: 'Morgan Housel', pages: '256' } },
    [u('1543002588-bfa74002ed7e'), u('1544947950-fa07a98d237f')],
    [{ size: 'Paperback', stock: 300 }, { size: 'Hardcover', stock: 100, price: 699 }]
  );

  await createProduct(
    { name: 'The Alchemist', slug: 'the-alchemist', description: 'Paulo Coelho\'s magical fable about following your dream.', shortDescription: 'Classic Fiction | Inspirational | 197 Pages', price: 299, comparePrice: 399, costPrice: 120, sku: 'BK-ALC', stock: 700, categoryId: cats['books'].id, brandId: brands['harpercollins'].id, attributes: { author: 'Paulo Coelho', pages: '197' } },
    [u('1512820790803-83ca734da794'), u('1543002588-bfa74002ed7e')],
    [{ size: 'Paperback', stock: 400 }, { size: 'Hardcover', stock: 100, price: 599 }]
  );

  await createProduct(
    { name: 'Rich Dad Poor Dad', slug: 'rich-dad-poor-dad', description: 'Robert Kiyosaki\'s personal finance classic. What the rich teach their kids.', shortDescription: 'Finance Classic | Robert Kiyosaki | 336 Pages', price: 399, comparePrice: 599, costPrice: 180, sku: 'BK-RDPD', stock: 500, categoryId: cats['books'].id, brandId: brands['penguin-books'].id, attributes: { author: 'Robert T. Kiyosaki', pages: '336' } },
    [u('1544947950-fa07a98d237f'), u('1543002588-bfa74002ed7e')],
    [{ size: 'Paperback', stock: 300 }, { size: 'Hardcover', stock: 100, price: 799 }]
  );

  await createProduct(
    { name: 'Ikigai: The Japanese Secret', slug: 'ikigai', description: 'The Japanese secret to a long and happy life by Hector Garcia.', shortDescription: 'Self-Help | Japanese Wisdom | 208 Pages', price: 349, comparePrice: 499, costPrice: 150, sku: 'BK-IKG', stock: 400, categoryId: cats['books'].id, brandId: brands['penguin-books'].id, attributes: { author: 'Hector Garcia', pages: '208' } },
    [u('1543002588-bfa74002ed7e'), u('1512820790803-83ca734da794')],
    [{ size: 'Paperback', stock: 250 }, { size: 'Hardcover', stock: 80, price: 649 }]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // BEAUTY & GROOMING (5)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Maybelline Fit Me Foundation', slug: 'maybelline-fit-me', description: 'Matte + poreless finish, dermatologist tested, SPF 22.', shortDescription: 'Matte | Poreless | SPF 22 | 30ml', price: 499, comparePrice: 599, costPrice: 200, sku: 'MB-FMF', stock: 500, categoryId: cats['beauty'].id, brandId: brands['maybelline'].id, attributes: {} },
    [u('1596462502278-27bfdc403348'), u('1631730486784-5e7e45e1dce7')],
    [
      { color: '115 Ivory', colorCode: '#f5e6d3', imageUrl: u('1596462502278-27bfdc403348'), stock: 60 },
      { color: '128 Warm Nude', colorCode: '#d4a574', imageUrl: u('1631730486784-5e7e45e1dce7'), stock: 80 },
      { color: '220 Natural Beige', colorCode: '#c8a882', imageUrl: u('1596462502278-27bfdc403348'), stock: 100 },
      { color: '310 Sun Beige', colorCode: '#a07850', imageUrl: u('1631730486784-5e7e45e1dce7'), stock: 60 },
      { color: '330 Toffee', colorCode: '#8b6b4a', imageUrl: u('1596462502278-27bfdc403348'), stock: 40 },
    ]
  );

  await createProduct(
    { name: 'Lakme Absolute Matte Lipstick', slug: 'lakme-matte-lipstick', description: 'Ultra-matte finish, intense color payoff, comfortable wear.', shortDescription: 'Ultra-Matte | Long-Lasting | Intense Color', price: 650, comparePrice: 850, costPrice: 250, sku: 'LK-AML', stock: 400, categoryId: cats['beauty'].id, brandId: brands['lakme'].id, attributes: {} },
    [u('1631730486784-5e7e45e1dce7'), u('1596462502278-27bfdc403348')],
    [
      { color: 'Crimson Touch', colorCode: '#c62828', imageUrl: u('1631730486784-5e7e45e1dce7'), stock: 80 },
      { color: 'Nude Mist', colorCode: '#d4a574', imageUrl: u('1596462502278-27bfdc403348'), stock: 80 },
      { color: 'Berry Bold', colorCode: '#880e4f', imageUrl: u('1631730486784-5e7e45e1dce7'), stock: 60 },
      { color: 'Coral Wink', colorCode: '#ff8a65', imageUrl: u('1596462502278-27bfdc403348'), stock: 50 },
    ]
  );

  await createProduct(
    { name: 'L\'Oreal Paris Serum', slug: 'loreal-serum', description: 'Hyaluronic acid, 1.5% pure concentration, plumps skin, reduces wrinkles.', shortDescription: 'Hyaluronic Acid | Anti-Wrinkle | 30ml', price: 999, comparePrice: 1299, costPrice: 450, sku: 'LOR-SRM', stock: 200, categoryId: cats['beauty'].id, brandId: brands['l-oreal'].id, attributes: {} },
    [u('1522335789203-aabd1fc54bc9'), u('1596462502278-27bfdc403348')],
    [{ size: '15ml', stock: 80 }, { size: '30ml', stock: 80 }, { size: '50ml', stock: 40, price: 1699 }]
  );

  await createProduct(
    { name: 'Nivea Men All-in-One Face Wash', slug: 'nivea-men-face-wash', description: '10x Vitamin C, oil control, dark spot reduction, 100ml.', shortDescription: 'Vitamin C | Oil Control | Dark Spots | 100ml', price: 199, comparePrice: 299, costPrice: 80, sku: 'NV-MFW', stock: 500, categoryId: cats['beauty'].id, brandId: brands['nivea'].id, attributes: {} },
    [u('1596462502278-27bfdc403348'), u('1522335789203-aabd1fc54bc9')],
    [{ size: '50ml', stock: 150 }, { size: '100ml', stock: 200 }, { size: '150ml', stock: 100, price: 279 }]
  );

  await createProduct(
    { name: 'The Body Shop Tea Tree Face Wash', slug: 'body-shop-tea-tree', description: 'Community Trade tea tree oil, daily face wash, blemish-fighting.', shortDescription: 'Tea Tree | Blemish-Fighting | 250ml', price: 745, comparePrice: 995, costPrice: 350, sku: 'TBS-TTW', stock: 150, categoryId: cats['beauty'].id, brandId: brands['the-body-shop'].id, attributes: {} },
    [u('1522335789203-aabd1fc54bc9'), u('1596462502278-27bfdc403348')],
    [{ size: '150ml', stock: 80 }, { size: '250ml', stock: 70 }]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // WATCHES & ACCESSORIES (4)
  // ═══════════════════════════════════════════════════════════════════════════

  await createProduct(
    { name: 'Apple Watch Series 9', slug: 'apple-watch-9', description: 'S9 chip, Double Tap, always-on Retina, blood O2, ECG, crash detection.', shortDescription: 'S9 | Double Tap | Blood O2 | ECG', price: 44900, comparePrice: 49900, costPrice: 36000, sku: 'APL-AW9', stock: 100, categoryId: cats['watches'].id, brandId: brands['apple'].id, isFeatured: true, attributes: {} },
    [u('1524592094714-0f0654e20314'), u('1546868871-af0de0ae72be'), u('1523275335684-37898b6baf30')],
    [
      { color: 'Midnight', colorCode: '#1a1a2e', imageUrl: u('1524592094714-0f0654e20314'), size: '41mm', stock: 15 },
      { color: 'Midnight', colorCode: '#1a1a2e', imageUrl: u('1524592094714-0f0654e20314'), size: '45mm', stock: 15 },
      { color: 'Starlight', colorCode: '#f5e6d3', imageUrl: u('1546868871-af0de0ae72be'), size: '41mm', stock: 12 },
      { color: 'Starlight', colorCode: '#f5e6d3', imageUrl: u('1546868871-af0de0ae72be'), size: '45mm', stock: 12 },
      { color: 'Product Red', colorCode: '#e53935', imageUrl: u('1523275335684-37898b6baf30'), size: '45mm', stock: 8 },
    ]
  );

  await createProduct(
    { name: 'Samsung Galaxy Watch6 Classic', slug: 'galaxy-watch6-classic', description: 'Rotating bezel, sapphire crystal, BioActive sensor, Wear OS.', shortDescription: 'Rotating Bezel | Sapphire | BioActive', price: 34999, comparePrice: 39999, costPrice: 25000, sku: 'SAM-GW6C', stock: 80, categoryId: cats['watches'].id, brandId: brands['samsung'].id, attributes: {} },
    [u('1546868871-af0de0ae72be'), u('1524592094714-0f0654e20314')],
    [
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1546868871-af0de0ae72be'), size: '43mm', stock: 15 },
      { color: 'Black', colorCode: '#1a1a1a', imageUrl: u('1546868871-af0de0ae72be'), size: '47mm', stock: 15 },
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1524592094714-0f0654e20314'), size: '43mm', stock: 12 },
      { color: 'Silver', colorCode: '#c0c0c0', imageUrl: u('1524592094714-0f0654e20314'), size: '47mm', stock: 12 },
    ]
  );

  await createProduct(
    { name: 'Fitbit Versa 4', slug: 'fitbit-versa-4', description: 'GPS, daily readiness score, 6+ day battery, Google apps, Alexa.', shortDescription: 'GPS | 6+ Day Battery | Google | Alexa', price: 19999, comparePrice: 22999, costPrice: 14000, sku: 'FB-V4', stock: 60, categoryId: cats['watches'].id, brandId: brands['fitbit'].id, attributes: {} },
    [u('1523275335684-37898b6baf30'), u('1524592094714-0f0654e20314')],
    [
      { color: 'Graphite', colorCode: '#424242', imageUrl: u('1523275335684-37898b6baf30'), stock: 20 },
      { color: 'Waterfall Blue', colorCode: '#4fc3f7', imageUrl: u('1524592094714-0f0654e20314'), stock: 15 },
      { color: 'Pink Sand', colorCode: '#f8bbd0', imageUrl: u('1523275335684-37898b6baf30'), stock: 15 },
    ]
  );

  await createProduct(
    { name: 'Tommy Hilfiger Leather Belt', slug: 'tommy-leather-belt', description: 'Genuine leather, classic buckle, flag logo detail, reversible.', shortDescription: 'Genuine Leather | Reversible | Flag Logo', price: 2999, comparePrice: 4499, costPrice: 1500, sku: 'TH-BLT', stock: 200, categoryId: cats['watches'].id, brandId: brands['tommy-hilfiger'].id, attributes: {} },
    [u('1553062407-98eeb64c6a62'), u('1524592094714-0f0654e20314')],
    [
      { color: 'Black/Brown', colorCode: '#1a1a1a', imageUrl: u('1553062407-98eeb64c6a62'), size: 'S (28-30)', stock: 30 },
      { color: 'Black/Brown', colorCode: '#1a1a1a', imageUrl: u('1553062407-98eeb64c6a62'), size: 'M (32-34)', stock: 40 },
      { color: 'Black/Brown', colorCode: '#1a1a1a', imageUrl: u('1553062407-98eeb64c6a62'), size: 'L (36-38)', stock: 30 },
    ]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // COUPONS
  // ═══════════════════════════════════════════════════════════════════════════
  await prisma.coupon.upsert({ where: { code: 'WELCOME10' }, update: {}, create: { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrderAmount: 500, maxDiscount: 200, usageLimit: 1000 } });
  await prisma.coupon.upsert({ where: { code: 'FLAT500' }, update: {}, create: { code: 'FLAT500', type: 'FIXED', value: 500, minOrderAmount: 2000, usageLimit: 500 } });
  await prisma.coupon.upsert({ where: { code: 'SUMMER25' }, update: {}, create: { code: 'SUMMER25', type: 'PERCENTAGE', value: 25, minOrderAmount: 1000, maxDiscount: 1000, usageLimit: 200 } });
  console.log('✓ Coupons');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
