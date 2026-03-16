import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Unsplash image helper - real product photos
const u = (id: string) => `https://images.unsplash.com/photo-${id}?w=600&h=600&fit=crop&q=80`;

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── USERS ──────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shopverse.com' },
    update: {},
    create: { name: 'Admin User', email: 'admin@shopverse.com', passwordHash: adminPassword, role: 'ADMIN', phone: '+91-9999999999' },
  });

  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: { name: 'Rahul Sharma', email: 'customer@test.com', passwordHash: customerPassword, role: 'CUSTOMER', phone: '+91-8888888888' },
  });

  // Claude - the AI that built this app :)
  const claudePassword = await bcrypt.hash('claude123', 12);
  await prisma.user.upsert({
    where: { email: 'claude@anthropic.com' },
    update: {},
    create: { name: 'Claude (AI Developer)', email: 'claude@anthropic.com', passwordHash: claudePassword, role: 'ADMIN', phone: '+91-0000000000' },
  });

  console.log('✓ Users created');

  // ─── BRANDS ─────────────────────────────────────────────────────────────────
  const brandData = [
    { name: 'Apple', slug: 'apple' }, { name: 'Samsung', slug: 'samsung' },
    { name: 'Nike', slug: 'nike' }, { name: 'Adidas', slug: 'adidas' },
    { name: 'Puma', slug: 'puma' }, { name: 'Sony', slug: 'sony' },
    { name: 'Boat', slug: 'boat' }, { name: 'OnePlus', slug: 'oneplus' },
    { name: 'Levis', slug: 'levis' }, { name: 'H&M', slug: 'hm' },
    { name: 'Zara', slug: 'zara' }, { name: 'Allen Solly', slug: 'allen-solly' },
    { name: 'Peter England', slug: 'peter-england' },
    { name: 'Prestige', slug: 'prestige' }, { name: 'Pigeon', slug: 'pigeon' },
    { name: 'Penguin', slug: 'penguin-books' }, { name: 'HarperCollins', slug: 'harpercollins' },
    { name: 'Yonex', slug: 'yonex' }, { name: 'Decathlon', slug: 'decathlon' },
    { name: 'Woodland', slug: 'woodland' }, { name: 'Bata', slug: 'bata' },
    { name: 'Crocs', slug: 'crocs' }, { name: 'Realme', slug: 'realme' },
  ];

  const brands: Record<string, any> = {};
  for (const b of brandData) {
    brands[b.slug] = await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b });
  }
  console.log(`✓ ${brandData.length} brands created`);

  // ─── CATEGORIES ─────────────────────────────────────────────────────────────
  const catData = [
    { name: 'Electronics', slug: 'electronics', description: 'Smartphones, laptops, gadgets & accessories', sortOrder: 1 },
    { name: 'Clothing - Men', slug: 'clothing-men', description: "Men's fashion & apparel", sortOrder: 2 },
    { name: 'Clothing - Women', slug: 'clothing-women', description: "Women's fashion & apparel", sortOrder: 3 },
    { name: 'Clothing - Kids', slug: 'clothing-kids', description: "Boys & girls clothing", sortOrder: 4 },
    { name: 'Shoes & Footwear', slug: 'shoes', description: 'Shoes, sneakers, sandals & more', sortOrder: 5 },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Kitchen appliances, cookware & home essentials', sortOrder: 6 },
    { name: 'Sports & Fitness', slug: 'sports', description: 'Sports equipment, gym gear & fitness accessories', sortOrder: 7 },
    { name: 'Books', slug: 'books', description: 'Fiction, non-fiction, academic & more', sortOrder: 8 },
    { name: 'Beauty & Personal Care', slug: 'beauty', description: 'Skincare, haircare & grooming', sortOrder: 9 },
    { name: 'Toys & Games', slug: 'toys', description: 'Toys, board games & puzzles', sortOrder: 10 },
  ];

  const cats: Record<string, any> = {};
  for (const c of catData) {
    cats[c.slug] = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  // Sub-categories
  const subCats = [
    { name: 'Smartphones', slug: 'smartphones', parentId: cats['electronics'].id, sortOrder: 1 },
    { name: 'Laptops', slug: 'laptops', parentId: cats['electronics'].id, sortOrder: 2 },
    { name: 'Headphones', slug: 'headphones', parentId: cats['electronics'].id, sortOrder: 3 },
    { name: 'T-Shirts', slug: 'mens-tshirts', parentId: cats['clothing-men'].id, sortOrder: 1 },
    { name: 'Shirts', slug: 'mens-shirts', parentId: cats['clothing-men'].id, sortOrder: 2 },
    { name: 'Jeans', slug: 'mens-jeans', parentId: cats['clothing-men'].id, sortOrder: 3 },
    { name: 'Dresses', slug: 'womens-dresses', parentId: cats['clothing-women'].id, sortOrder: 1 },
    { name: 'Tops', slug: 'womens-tops', parentId: cats['clothing-women'].id, sortOrder: 2 },
    { name: 'Sarees', slug: 'womens-sarees', parentId: cats['clothing-women'].id, sortOrder: 3 },
    { name: 'Running Shoes', slug: 'running-shoes', parentId: cats['shoes'].id, sortOrder: 1 },
    { name: 'Casual Shoes', slug: 'casual-shoes', parentId: cats['shoes'].id, sortOrder: 2 },
    { name: 'Sandals', slug: 'sandals', parentId: cats['shoes'].id, sortOrder: 3 },
  ];

  for (const sc of subCats) {
    await prisma.category.upsert({ where: { slug: sc.slug }, update: {}, create: sc });
  }
  console.log(`✓ ${catData.length} categories + ${subCats.length} sub-categories created`);

  // ─── PRODUCTS ───────────────────────────────────────────────────────────────

  const products = [
    // ── ELECTRONICS ──
    {
      name: 'iPhone 15 Pro Max 256GB', slug: 'iphone-15-pro-max',
      description: 'The most powerful iPhone ever with A17 Pro chip, titanium design, and 48MP camera system. Features an always-on ProMotion display, USB-C connectivity, and up to 29 hours of video playback.',
      shortDescription: 'A17 Pro chip | 48MP Camera | Titanium Design | 256GB',
      price: 159900, comparePrice: 169900, costPrice: 140000, sku: 'IPH-15PM-256', stock: 50,
      categoryId: cats['electronics'].id, brandId: brands['apple'].id, isFeatured: true,
      attributes: { color: 'Natural Titanium', storage: '256GB', display: '6.7 inch Super Retina XDR' },
      images: [u('1592750475338-74b7b21085ab'), u('1510557880182-3d4d3cba35a5'), u('1591337676887-a217a6c72cfa'), u('1695048065319-e6068c6c4d62')],
    },
    {
      name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-galaxy-s24-ultra',
      description: 'Galaxy AI is here. Built with titanium, the Galaxy S24 Ultra features a 200MP camera, S Pen, Snapdragon 8 Gen 3 processor, and a stunning 6.8-inch QHD+ AMOLED display.',
      shortDescription: 'Snapdragon 8 Gen 3 | 200MP Camera | S Pen | 256GB',
      price: 129999, comparePrice: 139999, costPrice: 110000, sku: 'SAM-S24U-256', stock: 75,
      categoryId: cats['electronics'].id, brandId: brands['samsung'].id, isFeatured: true,
      attributes: { color: 'Titanium Gray', storage: '256GB', display: '6.8 inch Dynamic AMOLED 2X' },
      images: [u('1610945265064-0e34e5519bbf'), u('1585060544812-6b45742d762f'), u('1598327105666-5b89351aff97'), u('1511707171634-5f897ff02aa6')],
    },
    {
      name: 'OnePlus 12 5G', slug: 'oneplus-12-5g',
      description: 'Flagship killer with Snapdragon 8 Gen 3, Hasselblad camera, 100W SUPERVOOC charging, and a beautiful 2K LTPO display.',
      shortDescription: 'Snapdragon 8 Gen 3 | Hasselblad Camera | 100W Charging',
      price: 64999, comparePrice: 69999, sku: 'OP-12-256', stock: 100,
      categoryId: cats['electronics'].id, brandId: brands['oneplus'].id, isFeatured: true,
      attributes: { color: 'Flowy Emerald', storage: '256GB' },
      images: [u('1511707171634-5f897ff02aa6'), u('1565849904461-04a58ad377e0'), u('1574944985070-8f3ebc6b79d2')],
    },
    {
      name: 'Realme GT 6T', slug: 'realme-gt-6t',
      description: 'Performance beast with Snapdragon 7+ Gen 3, 120W fast charging, and a 120Hz AMOLED display at an incredible price.',
      shortDescription: 'Snapdragon 7+ Gen 3 | 120W Charging | 120Hz AMOLED',
      price: 21999, comparePrice: 25999, sku: 'RM-GT6T-128', stock: 150,
      categoryId: cats['electronics'].id, brandId: brands['realme'].id,
      attributes: { color: 'Razor Green', storage: '128GB' },
      images: [u('1598327105666-5b89351aff97'), u('1580910051074-3eb694886f35'), u('1574944985070-8f3ebc6b79d2')],
    },
    {
      name: 'Sony WH-1000XM5 Headphones', slug: 'sony-wh-1000xm5',
      description: 'Industry-leading noise canceling headphones with Auto NC Optimizer, exceptional sound quality with LDAC, 30-hour battery life, and ultra-comfortable design.',
      shortDescription: 'Industry-leading ANC | 30hr Battery | LDAC',
      price: 29990, comparePrice: 34990, sku: 'SNY-WH1000XM5', stock: 200,
      categoryId: cats['electronics'].id, brandId: brands['sony'].id, isFeatured: true,
      attributes: { color: 'Black', type: 'Over-ear', connectivity: 'Bluetooth 5.3' },
      images: [u('1505740420928-5e560c06d30e'), u('1583394838336-acd977736f90'), u('1546435770-a3e426bf59b7'), u('1484704849700-f032a568e944')],
    },
    {
      name: 'boAt Rockerz 450 Bluetooth Headphone', slug: 'boat-rockerz-450',
      description: 'Wireless headphone with 40mm drivers, up to 15 hours playback, padded ear cushions, and foldable design.',
      shortDescription: '40mm Drivers | 15hr Battery | Foldable',
      price: 1299, comparePrice: 2990, sku: 'BOAT-RZ450', stock: 500,
      categoryId: cats['electronics'].id, brandId: brands['boat'].id,
      attributes: { color: 'Luscious Black' },
      images: [u('1583394838336-acd977736f90'), u('1524678606370-a47ad25cb82a'), u('1487215078519-e21cc028cb29')],
    },
    {
      name: 'Apple MacBook Air M3', slug: 'macbook-air-m3',
      description: 'Supercharged by the M3 chip. 13.6-inch Liquid Retina display, 18-hour battery life, 8GB unified memory, fanless design.',
      shortDescription: 'M3 Chip | 13.6" Retina | 18hr Battery | 256GB SSD',
      price: 114900, comparePrice: 119900, sku: 'APL-MBA-M3', stock: 30,
      categoryId: cats['electronics'].id, brandId: brands['apple'].id, isFeatured: true,
      attributes: { color: 'Midnight', ram: '8GB', storage: '256GB SSD' },
      images: [u('1496181133206-80ce9b88a853'), u('1517336714731-489689fd1ca8'), u('1541807084-5c52b6b3adef'), u('1611186871348-b1ce696e52c9')],
    },

    // ── CLOTHING - MEN ──
    {
      name: 'Levis 501 Original Fit Jeans', slug: 'levis-501-jeans',
      description: 'The original jean. Sit at waist, regular fit through thigh, straight leg. Button fly. 100% cotton.',
      shortDescription: 'Straight Fit | 100% Cotton | Button Fly',
      price: 3499, comparePrice: 4999, sku: 'LEV-501-32', stock: 120,
      categoryId: cats['clothing-men'].id, brandId: brands['levis'].id, isFeatured: true,
      attributes: { size: ['30', '32', '34', '36'], color: 'Medium Indigo', material: '100% Cotton' },
      images: [u('1542272604-787c3835535d'), u('1541099649105-f69ad21f3246'), u('1582552938357-32b906df40cb'), u('1475178626620-a4d074967571')],
    },
    {
      name: 'Allen Solly Regular Fit Formal Shirt', slug: 'allen-solly-formal-shirt',
      description: 'Classic formal shirt in premium cotton blend. Perfect for office wear. Spread collar, full sleeves.',
      shortDescription: 'Regular Fit | Cotton Blend | Spread Collar',
      price: 1799, comparePrice: 2499, sku: 'AS-SHIRT-WH-M', stock: 200,
      categoryId: cats['clothing-men'].id, brandId: brands['allen-solly'].id,
      attributes: { size: ['S', 'M', 'L', 'XL', 'XXL'], color: 'White', material: 'Cotton Blend' },
      images: [u('1596755094514-f87e34085b2c'), u('1602810318383-e386cc2a3ccf'), u('1598033129183-c4f50c736c10')],
    },
    {
      name: 'H&M Oversized Graphic T-Shirt', slug: 'hm-oversized-tshirt',
      description: 'Relaxed-fit T-shirt in soft cotton jersey with a printed design. Dropped shoulders, ribbed neckline.',
      shortDescription: 'Oversized Fit | 100% Cotton | Graphic Print',
      price: 999, comparePrice: 1499, sku: 'HM-TS-GR-L', stock: 300,
      categoryId: cats['clothing-men'].id, brandId: brands['hm'].id,
      attributes: { size: ['S', 'M', 'L', 'XL'], color: 'Black', material: '100% Cotton' },
      images: [u('1521572163474-6864f9cf17ab'), u('1583743814966-8936f5b7be1a'), u('1576566588028-4147f3842f27')],
    },
    {
      name: 'Peter England Polo T-Shirt', slug: 'peter-england-polo',
      description: 'Classic polo t-shirt with contrast tipping. Made from premium cotton pique fabric.',
      shortDescription: 'Cotton Pique | Contrast Tipping | Regular Fit',
      price: 1299, comparePrice: 1799, sku: 'PE-POLO-NV-M', stock: 180,
      categoryId: cats['clothing-men'].id, brandId: brands['peter-england'].id,
      attributes: { size: ['S', 'M', 'L', 'XL'], color: 'Navy Blue' },
      images: [u('1625910513413-5e1d5d16b8b9'), u('1581655353564-df123a1eb820'), u('1586363104862-3a5e2ab60d99')],
    },

    // ── CLOTHING - WOMEN ──
    {
      name: 'Zara Floral Midi Dress', slug: 'zara-floral-midi-dress',
      description: 'Beautiful floral print midi dress with V-neck, puff sleeves, and a flattering A-line silhouette. Perfect for brunch or evening outings.',
      shortDescription: 'Floral Print | V-Neck | Puff Sleeves | A-Line',
      price: 3990, comparePrice: 5490, sku: 'ZARA-DRESS-FL-M', stock: 60,
      categoryId: cats['clothing-women'].id, brandId: brands['zara'].id, isFeatured: true,
      attributes: { size: ['XS', 'S', 'M', 'L'], color: 'Multicolor Floral' },
      images: [u('1595777457583-95e059d581b8'), u('1572804013309-59a88b7e92f1'), u('1585487000160-6ebcfceb0d44'), u('1496747611176-843222e1e57c')],
    },
    {
      name: 'H&M Ribbed Crop Top', slug: 'hm-ribbed-crop-top',
      description: 'Short, fitted top in soft ribbed jersey. Round neckline, short sleeves. Great for casual and layering.',
      shortDescription: 'Ribbed Jersey | Crop Length | Short Sleeves',
      price: 699, comparePrice: 999, sku: 'HM-CROP-BK-S', stock: 250,
      categoryId: cats['clothing-women'].id, brandId: brands['hm'].id,
      attributes: { size: ['XS', 'S', 'M', 'L'], color: 'Black' },
      images: [u('1564584217132-2271feaeb3c5'), u('1434389677669-e08b4cda3a74'), u('1515886657613-9f3515b0c78f')],
    },
    {
      name: 'Levis High Rise Skinny Jeans Women', slug: 'levis-high-rise-skinny-women',
      description: 'Figure-flattering high rise skinny jeans with stretch denim. Slim through hip and thigh.',
      shortDescription: 'High Rise | Skinny Fit | Stretch Denim',
      price: 3999, comparePrice: 4999, sku: 'LEV-HRS-WM-28', stock: 100,
      categoryId: cats['clothing-women'].id, brandId: brands['levis'].id,
      attributes: { size: ['26', '28', '30', '32'], color: 'Dark Wash' },
      images: [u('1541099649105-f69ad21f3246'), u('1475178626620-a4d074967571'), u('1582552938357-32b906df40cb')],
    },
    {
      name: 'Zara Embroidered Kurti', slug: 'embroidered-kurti',
      description: 'Beautiful cotton kurti with intricate embroidery work. A-line silhouette, 3/4 sleeves, perfect for festive occasions.',
      shortDescription: 'Cotton | Embroidered | A-Line | 3/4 Sleeves',
      price: 1899, comparePrice: 2499, sku: 'KURTI-EMB-GR-M', stock: 80,
      categoryId: cats['clothing-women'].id, brandId: brands['zara'].id,
      attributes: { size: ['S', 'M', 'L', 'XL'], color: 'Green' },
      images: [u('1583391733956-6657e4e6fd94'), u('1610030469983-3cc0e7622e9c'), u('1594040226829-7f251ab46d80'), u('1583391733956-3750e0ff4e8b')],
    },

    // ── CLOTHING - KIDS ──
    {
      name: 'H&M Boys Dinosaur Print T-Shirt', slug: 'hm-boys-dino-tshirt',
      description: 'Fun dinosaur print t-shirt for boys in soft cotton. Comfortable and colorful for everyday wear.',
      shortDescription: 'Dino Print | 100% Cotton | Regular Fit',
      price: 499, comparePrice: 799, sku: 'HM-KIDS-DINO-8', stock: 200,
      categoryId: cats['clothing-kids'].id, brandId: brands['hm'].id,
      attributes: { size: ['4-5Y', '6-7Y', '8-9Y', '10-11Y'], color: 'Blue' },
      images: [u('1519238263530-99bdd11ffa6d'), u('1518831959646-742c3a14ebf7'), u('1471286174890-9c112ffca5b4')],
    },
    {
      name: 'Girls Floral Frock with Belt', slug: 'girls-floral-frock',
      description: 'Adorable floral frock for girls with a matching belt. Cotton blend fabric, comfortable for parties and outings.',
      shortDescription: 'Floral Print | With Belt | Cotton Blend',
      price: 799, comparePrice: 1299, sku: 'KIDS-FROCK-FL-6', stock: 150,
      categoryId: cats['clothing-kids'].id, brandId: brands['hm'].id,
      attributes: { size: ['3-4Y', '5-6Y', '7-8Y', '9-10Y'], color: 'Pink Floral' },
      images: [u('1518831959646-742c3a14ebf7'), u('1524678714210-9917a6c85b34'), u('1519238263530-99bdd11ffa6d')],
    },
    {
      name: 'Boys Jogger Pants Set', slug: 'boys-jogger-set',
      description: 'Comfortable jogger set with hoodie and track pants. Fleece-lined for warmth. Great for outdoor play.',
      shortDescription: 'Hoodie + Jogger | Fleece-lined | Comfortable',
      price: 1299, comparePrice: 1999, sku: 'KIDS-JOG-GY-8', stock: 100,
      categoryId: cats['clothing-kids'].id, brandId: brands['hm'].id,
      attributes: { size: ['4-5Y', '6-7Y', '8-9Y', '10-11Y'], color: 'Grey' },
      images: [u('1471286174890-9c112ffca5b4'), u('1519238263530-99bdd11ffa6d'), u('1518831959646-742c3a14ebf7')],
    },

    // ── SHOES & FOOTWEAR ──
    {
      name: 'Nike Air Max 270', slug: 'nike-air-max-270',
      description: 'The Nike Air Max 270 delivers visible Air cushioning under every step with the largest Max Air unit yet for a super-soft ride.',
      shortDescription: 'Max Air Unit | Lightweight | Breathable Mesh',
      price: 12995, comparePrice: 15495, sku: 'NIK-AM270-BW', stock: 120,
      categoryId: cats['shoes'].id, brandId: brands['nike'].id, isFeatured: true,
      attributes: { sizes: ['7', '8', '9', '10', '11'], color: 'Black/White' },
      images: [u('1542291026-7eec264c27ff'), u('1460353581641-37baddab0fa2'), u('1549298916-b41d501d3772'), u('1600185365926-3a2ce3228680')],
    },
    {
      name: 'Adidas Ultraboost 22', slug: 'adidas-ultraboost-22',
      description: 'Responsive BOOST midsole delivers incredible energy return. Primeknit+ upper hugs your foot. Continental rubber outsole.',
      shortDescription: 'BOOST Midsole | Primeknit+ | Continental Rubber',
      price: 16999, comparePrice: 19999, sku: 'ADI-UB22-BLK', stock: 90,
      categoryId: cats['shoes'].id, brandId: brands['adidas'].id, isFeatured: true,
      attributes: { sizes: ['7', '8', '9', '10', '11', '12'], color: 'Core Black' },
      images: [u('1556906781-9a412961c28c'), u('1595950653106-6c9ebd614d3a'), u('1608231387042-66d1773070a5'), u('1539185441755-769473a23570')],
    },
    {
      name: 'Puma RS-X Reinvention', slug: 'puma-rsx-reinvention',
      description: 'Retro-inspired chunky sneaker with RS cushioning technology. Bold color blocking and a thick sole.',
      shortDescription: 'RS Cushioning | Chunky Sole | Retro Style',
      price: 8999, comparePrice: 10999, sku: 'PUMA-RSX-WH', stock: 80,
      categoryId: cats['shoes'].id, brandId: brands['puma'].id,
      attributes: { sizes: ['7', '8', '9', '10', '11'], color: 'White/Red' },
      images: [u('1608379743498-a8e8e8a13ab5'), u('1551107696-a4b0c5a0d9a2'), u('1595950653106-6c9ebd614d3a')],
    },
    {
      name: 'Woodland Classic Leather Boots', slug: 'woodland-leather-boots',
      description: 'Rugged outdoor boots with genuine leather upper, EVA midsole, and durable rubber outsole. Water-resistant.',
      shortDescription: 'Genuine Leather | Water Resistant | Durable',
      price: 4495, comparePrice: 5995, sku: 'WDL-BOOT-TN', stock: 60,
      categoryId: cats['shoes'].id, brandId: brands['woodland'].id,
      attributes: { sizes: ['7', '8', '9', '10', '11'], color: 'Tan Brown' },
      images: [u('1608256246200-53e635b5b65f'), u('1605812860427-4024433a70fd'), u('1638953228902-bcac3a0f9641')],
    },
    {
      name: 'Crocs Classic Clog', slug: 'crocs-classic-clog',
      description: 'The iconic Crocs clog with Croslite foam for lightweight comfort. Ventilation holes for breathability. Easy to clean.',
      shortDescription: 'Croslite Foam | Lightweight | Easy Clean',
      price: 2995, comparePrice: 3995, sku: 'CROCS-CLOG-BK', stock: 300,
      categoryId: cats['shoes'].id, brandId: brands['crocs'].id,
      attributes: { sizes: ['6', '7', '8', '9', '10', '11'], color: 'Black' },
      images: [u('1603808033192-082d6919d3e1'), u('1595341888016-a392ef81b7de'), u('1543163521-1bf539c55dd2')],
    },
    {
      name: 'Bata Formal Derby Shoes', slug: 'bata-formal-derby',
      description: 'Classic formal derby shoes in synthetic leather. Cushioned insole for all-day comfort. Perfect for office.',
      shortDescription: 'Synthetic Leather | Cushioned | Formal',
      price: 1999, comparePrice: 2999, sku: 'BATA-DERBY-BK', stock: 100,
      categoryId: cats['shoes'].id, brandId: brands['bata'].id,
      attributes: { sizes: ['7', '8', '9', '10', '11'], color: 'Black' },
      images: [u('1614252235316-8c857d38b5f4'), u('1533867617858-e7b97e060509'), u('1449505278894-297fdb3edbc1')],
    },

    // ── HOME & KITCHEN ──
    {
      name: 'Prestige Electric Kettle 1.5L', slug: 'prestige-electric-kettle',
      description: 'Stainless steel electric kettle with 1500W power, auto shut-off, dry boil protection, and cool-touch handle.',
      shortDescription: '1.5L | 1500W | Auto Shut-off | Stainless Steel',
      price: 899, comparePrice: 1299, sku: 'PRST-KETTLE-15', stock: 200,
      categoryId: cats['home-kitchen'].id, brandId: brands['prestige'].id,
      attributes: { capacity: '1.5L', power: '1500W', material: 'Stainless Steel' },
      images: [u('1556909114-f6e7ad7d3136'), u('1570222094714-4281d9860900'), u('1517142089942-ba376ce32a2e')],
    },
    {
      name: 'Pigeon Non-Stick Cookware Set 3pc', slug: 'pigeon-cookware-set',
      description: 'Complete cookware set with non-stick tawa, kadai, and frying pan. PFOA-free coating, compatible with gas stoves.',
      shortDescription: '3 Piece Set | Non-Stick | PFOA Free',
      price: 1499, comparePrice: 2499, sku: 'PIG-COOK-3PC', stock: 100,
      categoryId: cats['home-kitchen'].id, brandId: brands['pigeon'].id,
      attributes: { pieces: '3', coating: 'Non-stick PFOA Free' },
      images: [u('1556909172-8b57fbb8a5a0'), u('1584990347449-39a21493d02b'), u('1590794056226-79ef935baaa1'), u('1583241475880-083f84372725')],
    },
    {
      name: 'Prestige Mixer Grinder 750W', slug: 'prestige-mixer-grinder',
      description: '750W powerful motor with 3 stainless steel jars. Overload protection, sturdy base, multi-purpose blades.',
      shortDescription: '750W Motor | 3 Jars | Overload Protection',
      price: 3499, comparePrice: 4999, sku: 'PRST-MIX-750', stock: 50,
      categoryId: cats['home-kitchen'].id, brandId: brands['prestige'].id, isFeatured: true,
      attributes: { power: '750W', jars: '3' },
      images: [u('1570222094714-4281d9860900'), u('1585659722983-3a675dabf23d'), u('1556909114-f6e7ad7d3136')],
    },
    {
      name: 'Stainless Steel Water Bottle 1L', slug: 'steel-water-bottle',
      description: 'Double-wall vacuum insulated stainless steel bottle. Keeps drinks hot 12hrs / cold 24hrs. Leak-proof cap.',
      shortDescription: 'Vacuum Insulated | Hot 12hr Cold 24hr | 1 Litre',
      price: 599, comparePrice: 999, sku: 'SS-BOTTLE-1L', stock: 400,
      categoryId: cats['home-kitchen'].id, brandId: brands['pigeon'].id,
      attributes: { capacity: '1L', material: 'Stainless Steel 304' },
      images: [u('1602143407151-7111542de6e8'), u('1523362628745-0c100150b504'), u('1536939459926-301728717817')],
    },

    // ── SPORTS & FITNESS ──
    {
      name: 'Yonex Badminton Racket Nanoray', slug: 'yonex-nanoray-racket',
      description: 'Professional badminton racket with isometric head shape, nanomesh graphite shaft, and pre-strung at 22lbs.',
      shortDescription: 'Graphite Shaft | Isometric Head | Pre-strung',
      price: 2999, comparePrice: 3999, sku: 'YNX-NANORAY', stock: 80,
      categoryId: cats['sports'].id, brandId: brands['yonex'].id,
      attributes: { weight: '85g', grip: 'G4' },
      images: [u('1554068865-24cecd4e34b8'), u('1626224583764-f87db24ac1f3'), u('1587280501635-68a0e82cd5ff')],
    },
    {
      name: 'Decathlon Yoga Mat 5mm', slug: 'decathlon-yoga-mat',
      description: 'Non-slip yoga mat with 5mm cushioning. Lightweight, portable, and easy to clean. Includes carry strap.',
      shortDescription: '5mm Thick | Non-Slip | Carry Strap Included',
      price: 799, comparePrice: 1199, sku: 'DCT-YOGA-5MM', stock: 250,
      categoryId: cats['sports'].id, brandId: brands['decathlon'].id,
      attributes: { thickness: '5mm', material: 'TPE' },
      images: [u('1544367567738-f13e0e1a4883'), u('1518611012118-696072aa579a'), u('1506126613408-eca07ce68773')],
    },
    {
      name: 'Adidas Football Tango', slug: 'adidas-football-tango',
      description: 'Training football with machine-stitched construction, durable TPU cover, and butyl bladder for air retention.',
      shortDescription: 'Size 5 | Machine Stitched | Durable TPU',
      price: 1499, comparePrice: 1999, sku: 'ADI-FB-TANGO', stock: 150,
      categoryId: cats['sports'].id, brandId: brands['adidas'].id,
      attributes: { size: '5', material: 'TPU' },
      images: [u('1614632537197-38a17061c2bd'), u('1552667466-07770ae110d0'), u('1575361204480-aadea25e6e68')],
    },
    {
      name: 'Decathlon Adjustable Dumbbell Set 10kg', slug: 'decathlon-dumbbell-set',
      description: '10kg adjustable dumbbell set with chrome-plated bars and rubber-coated weight plates. Perfect for home gym.',
      shortDescription: '10kg Total | Adjustable | Chrome Plated',
      price: 2499, comparePrice: 3499, sku: 'DCT-DUMB-10KG', stock: 70,
      categoryId: cats['sports'].id, brandId: brands['decathlon'].id, isFeatured: true,
      attributes: { weight: '10kg', plates: '4x1.25kg + 4x1.0kg' },
      images: [u('1534438327276-14e5300c3a48'), u('1517836357463-d25dfeac3438'), u('1526506118085-60ce8714f8c5')],
    },
    {
      name: 'Nike Dri-FIT Training Shorts', slug: 'nike-dri-fit-shorts',
      description: 'Lightweight training shorts with Dri-FIT moisture-wicking technology. Elastic waistband with drawcord.',
      shortDescription: 'Dri-FIT | Moisture Wicking | Lightweight',
      price: 1795, comparePrice: 2495, sku: 'NIK-SHORT-BK-M', stock: 200,
      categoryId: cats['sports'].id, brandId: brands['nike'].id,
      attributes: { size: ['S', 'M', 'L', 'XL'], color: 'Black' },
      images: [u('1562886877-abe0cf8b23b3'), u('1517466787929-bc90951d0974'), u('1571902943202-507ec2618e8f')],
    },

    // ── BOOKS ──
    {
      name: 'Atomic Habits by James Clear', slug: 'atomic-habits',
      description: 'An easy and proven way to build good habits and break bad ones. #1 New York Times bestseller with over 15 million copies sold worldwide.',
      shortDescription: '#1 NYT Bestseller | Self-Help | Paperback',
      price: 399, comparePrice: 599, sku: 'BOOK-AH-PB', stock: 500,
      categoryId: cats['books'].id, brandId: brands['penguin-books'].id, isFeatured: true,
      attributes: { format: 'Paperback', pages: '320', language: 'English' },
      images: [u('1544947950-fa07a98d237f'), u('1512820790803-83ca734da794'), u('1543002588-bfa74002ed7f')],
    },
    {
      name: 'The Psychology of Money', slug: 'psychology-of-money',
      description: 'Timeless lessons on wealth, greed, and happiness by Morgan Housel. 19 short stories exploring the strange ways people think about money.',
      shortDescription: 'Morgan Housel | Finance | Paperback',
      price: 349, comparePrice: 499, sku: 'BOOK-POM-PB', stock: 400,
      categoryId: cats['books'].id, brandId: brands['harpercollins'].id,
      attributes: { format: 'Paperback', pages: '256', language: 'English' },
      images: [u('1553729459-afe14108a159'), u('1512820790803-83ca734da794'), u('1544947950-fa07a98d237f')],
    },
    {
      name: 'Rich Dad Poor Dad', slug: 'rich-dad-poor-dad',
      description: 'Robert Kiyosaki\'s personal finance classic. Learn what the rich teach their kids about money that the poor and middle class do not.',
      shortDescription: 'Robert Kiyosaki | Personal Finance | Paperback',
      price: 299, comparePrice: 499, sku: 'BOOK-RDPD-PB', stock: 350,
      categoryId: cats['books'].id, brandId: brands['penguin-books'].id,
      attributes: { format: 'Paperback', pages: '336', language: 'English' },
      images: [u('1512820790803-83ca734da794'), u('1543002588-bfa74002ed7f'), u('1553729459-afe14108a159')],
    },
    {
      name: 'Ikigai: The Japanese Secret to a Long and Happy Life', slug: 'ikigai-book',
      description: 'Discover the Japanese concept of Ikigai — the happiness of always being busy. Practical tips for finding purpose and joy.',
      shortDescription: 'Japanese Wisdom | Self-Help | Paperback',
      price: 249, comparePrice: 399, sku: 'BOOK-IKIGAI-PB', stock: 300,
      categoryId: cats['books'].id, brandId: brands['penguin-books'].id,
      attributes: { format: 'Paperback', pages: '208', language: 'English' },
      images: [u('1543002588-bfa74002ed7f'), u('1544947950-fa07a98d237f'), u('1553729459-afe14108a159')],
    },

    // ── BEAUTY & PERSONAL CARE ──
    {
      name: 'Face Serum Vitamin C 30ml', slug: 'vitamin-c-face-serum',
      description: 'Brightening Vitamin C serum with hyaluronic acid. Reduces dark spots, boosts collagen, and evens skin tone.',
      shortDescription: 'Vitamin C + HA | Brightening | 30ml',
      price: 599, comparePrice: 999, sku: 'BEAUTY-VCS-30', stock: 200,
      categoryId: cats['beauty'].id, brandId: null,
      attributes: { volume: '30ml', skinType: 'All Skin Types' },
      images: [u('1556228578-8c89e6adf883'), u('1570194065650-d99fb4bedf0a'), u('1608248543803-ba4f8c70ae0b')],
    },
    {
      name: 'Beard Grooming Kit', slug: 'beard-grooming-kit',
      description: 'Complete beard grooming kit with beard oil, beard balm, wooden comb, and scissors. Natural ingredients.',
      shortDescription: 'Oil + Balm + Comb + Scissors | Natural',
      price: 899, comparePrice: 1499, sku: 'BEAUTY-BEARD-KIT', stock: 100,
      categoryId: cats['beauty'].id, brandId: null,
      attributes: { includes: 'Oil, Balm, Comb, Scissors' },
      images: [u('1621607512214-68297480165e'), u('1585751119414-ef2636f8aede'), u('1598524789972-792a261ab254'), u('1560506840911-50b0fba6c5f4')],
    },

    // ── TOYS & GAMES ──
    {
      name: 'LEGO City Police Station', slug: 'lego-city-police-station',
      description: '668-piece building set with police station, helicopter, 2 trucks, and 5 minifigures. Ages 6+.',
      shortDescription: '668 Pieces | 5 Minifigures | Ages 6+',
      price: 5999, comparePrice: 7999, sku: 'LEGO-POLICE-668', stock: 40,
      categoryId: cats['toys'].id, brandId: null, isFeatured: true,
      attributes: { pieces: '668', age: '6+' },
      images: [u('1587654780037-66e34da62060'), u('1596461404969-9ae70f2830c1'), u('1558060370-d644479cb6f7'), u('1585366119957-e9730b6d0f60')],
    },
    {
      name: 'Chess Set Magnetic Travel', slug: 'chess-set-magnetic',
      description: 'Foldable magnetic chess set perfect for travel. Pieces stay in place. Board doubles as storage case.',
      shortDescription: 'Magnetic | Foldable | Travel Size',
      price: 499, comparePrice: 799, sku: 'TOY-CHESS-MAG', stock: 200,
      categoryId: cats['toys'].id, brandId: null,
      attributes: { size: '10 inch', material: 'Plastic + Magnet' },
      images: [u('1529699211952-734e80c4d42b'), u('1560174038530-5c2b38d6b892'), u('1586165368502-1bad197a6461')],
    },
  ];

  console.log(`\n📦 Creating ${products.length} products...`);

  for (const p of products) {
    const { images: imageUrls, ...productData } = p;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...productData,
        brandId: productData.brandId || undefined,
      },
    });

    // Delete existing images and create new ones
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: imageUrls.map((url, i) => ({
        productId: product.id,
        url,
        altText: p.name,
        isPrimary: i === 0,
        sortOrder: i,
      })),
    });

    console.log(`  ✓ ${p.name} (${imageUrls.length} images)`);
  }

  // ─── COUPONS ──────────────────────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrderAmount: 500, maxDiscount: 1000, usageLimit: 1000, expiresAt: new Date('2027-12-31') },
  });
  await prisma.coupon.upsert({
    where: { code: 'FLAT500' },
    update: {},
    create: { code: 'FLAT500', type: 'FIXED', value: 500, minOrderAmount: 2000, usageLimit: 500, expiresAt: new Date('2027-12-31') },
  });
  await prisma.coupon.upsert({
    where: { code: 'FIRST20' },
    update: {},
    create: { code: 'FIRST20', type: 'PERCENTAGE', value: 20, minOrderAmount: 1000, maxDiscount: 2000, usageLimit: 500, expiresAt: new Date('2027-12-31') },
  });
  console.log('✓ Coupons created');

  // ─── ADDRESS ──────────────────────────────────────────────────────────────
  await prisma.address.upsert({
    where: { id: 'seed-address-1' },
    update: {},
    create: {
      id: 'seed-address-1', userId: customer.id, label: 'Home', fullName: 'Rahul Sharma',
      phone: '+91-8888888888', addressLine1: '42, Rajendra Nagar', addressLine2: 'Near Central Mall',
      city: 'Prayagraj', state: 'Uttar Pradesh', postalCode: '211001', isDefault: true,
    },
  });
  console.log('✓ Address created');

  console.log('\n✅ Seed completed successfully!');
  console.log(`\n📋 Login credentials:`);
  console.log(`   Admin:    admin@shopverse.com / admin123`);
  console.log(`   Customer: customer@test.com / customer123`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
