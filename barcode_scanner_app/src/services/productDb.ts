import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ProductItem, CartSessionData, SearchResultItem } from '../types';

const DB_KEY = '@barcode_scanner_products_v1';
const SERVER_URL_KEY = '@smart_cart_custom_server_url';
const PAIRED_CART_KEY = '@smart_cart_paired_cart_id';

// Candidate IPs for local development, hotspot, and campus Wi-Fi
const CANDIDATE_IPS = ['10.92.44.66', '192.168.137.1', '10.1.7.65', '10.1.9.166', '127.0.0.1', '10.0.2.2'];

let cachedActiveServer: string | null = null;

// Initial offline fallback retail catalog (synced with Django database)
export const DEFAULT_PRODUCTS: Record<string, ProductItem> = {
  '890126201002': {
    barcode: '890126201002',
    sku: 'MILK-AMUL-02',
    name: 'Amul Gold Full Cream Milk (1L)',
    price: 66.0,
    imageUri: '',
    category: 'Dairy',
    shelfLocation: 'Dairy Chiller - Shelf A',
    currentStock: 45,
    createdAt: '2026-09-25',
  },
  '890126201001': {
    barcode: '890126201001',
    sku: 'MILK-AMUL-01',
    name: 'Amul Taaza Fresh Toned Milk (1L)',
    price: 54.0,
    imageUri: '',
    category: 'Dairy',
    shelfLocation: 'Dairy Chiller - Shelf A',
    currentStock: 60,
    createdAt: '2026-09-25',
  },
  '890126201003': {
    barcode: '890126201003',
    sku: 'BUTTER-AMUL-01',
    name: 'Amul Pasteurised Butter (500g)',
    price: 275.0,
    imageUri: '',
    category: 'Dairy',
    shelfLocation: 'Dairy Chiller - Shelf B',
    currentStock: 35,
    createdAt: '2026-09-25',
  },
  '890171901001': {
    barcode: '890171901001',
    sku: 'BISC-PARLE-01',
    name: 'Parle-G Original Gluco Biscuits (250g)',
    price: 25.0,
    imageUri: '',
    category: 'Biscuits & Bakery',
    shelfLocation: 'Aisle 2 - Biscuit Rack 1',
    currentStock: 100,
    createdAt: '2026-09-25',
  },
  '890171901002': {
    barcode: '890171901002',
    sku: 'BISC-GOODDAY-01',
    name: 'Britannia Good Day Butter Cookies (200g)',
    price: 40.0,
    imageUri: '',
    category: 'Biscuits & Bakery',
    shelfLocation: 'Aisle 2 - Biscuit Rack 2',
    currentStock: 70,
    createdAt: '2026-09-25',
  },
  '890171901004': {
    barcode: '890171901004',
    sku: 'BISC-BOURBON-01',
    name: 'Britannia Bourbon Chocolate Biscuits (150g)',
    price: 30.0,
    imageUri: '',
    category: 'Biscuits & Bakery',
    shelfLocation: 'Aisle 2 - Biscuit Rack 4',
    currentStock: 45,
    createdAt: '2026-09-25',
  },
  '890171901003': {
    barcode: '890171901003',
    sku: 'BISC-OREO-01',
    name: 'Cadbury Oreo Vanilla Creme Biscuits (120g)',
    price: 35.0,
    imageUri: '',
    category: 'Biscuits & Bakery',
    shelfLocation: 'Aisle 2 - Biscuit Rack 3',
    currentStock: 50,
    createdAt: '2026-09-25',
  },
  '890103005003': {
    barcode: '890103005003',
    sku: 'CHOC-DAIRYMILK-01',
    name: 'Cadbury Dairy Milk Silk Chocolate (50g)',
    price: 45.0,
    imageUri: '',
    category: 'Chocolates & Sweets',
    shelfLocation: 'Checkout Bay - Confectionery',
    currentStock: 75,
    createdAt: '2026-09-25',
  },
  '8901764012011': {
    barcode: '8901764012011',
    sku: 'BEV-COKE-01',
    name: 'Coca-Cola Original Taste (750ml)',
    price: 40.0,
    imageUri: '',
    category: 'Beverages',
    shelfLocation: 'Aisle 1 - Cold Beverage Chiller',
    currentStock: 80,
    createdAt: '2026-09-25',
  },
  '890103001002': {
    barcode: '890103001002',
    sku: 'BREAD-001',
    name: 'Artisan Sliced Bread (400g)',
    price: 35.0,
    imageUri: '',
    category: 'Bakery',
    shelfLocation: 'Aisle 2 - Shelf 1',
    currentStock: 35,
    createdAt: '2026-09-25',
  },
  '890105803001': {
    barcode: '890105803001',
    sku: 'NOOD-MAGGI-01',
    name: 'Maggi 2-Minute Masala Instant Noodles (280g)',
    price: 50.0,
    imageUri: '',
    category: 'Instant Food',
    shelfLocation: 'Aisle 4 - Noodle Bay',
    currentStock: 90,
    createdAt: '2026-09-25',
  },
  '890105803003': {
    barcode: '890105803003',
    sku: 'CHIPS-LAYS-01',
    name: "Lay's India's Magic Masala Chips (50g)",
    price: 20.0,
    imageUri: '',
    category: 'Snacks & Chips',
    shelfLocation: 'Aisle 4 - Chips Rack',
    currentStock: 80,
    createdAt: '2026-09-25',
  },
  '890105803002': {
    barcode: '890105803002',
    sku: 'SNACK-BHUJIA-01',
    name: "Haldiram's Nagpur Aloo Bhujia (200g)",
    price: 55.0,
    imageUri: '',
    category: 'Snacks & Namkeen',
    shelfLocation: 'Aisle 4 - Namkeen Rack',
    currentStock: 60,
    createdAt: '2026-09-25',
  },
  '890103002001': {
    barcode: '890103002001',
    sku: 'TEA-TATAGOLD-01',
    name: 'Tata Tea Gold Premium Leaf Tea (500g)',
    price: 310.0,
    imageUri: '',
    category: 'Tea & Beverages',
    shelfLocation: 'Aisle 3 - Tea Shelf',
    currentStock: 40,
    createdAt: '2026-09-25',
  },
  '890103002002': {
    barcode: '890103002002',
    sku: 'COFFEE-NESCAFE-01',
    name: 'Nescafe Classic 100% Pure Coffee (50g)',
    price: 190.0,
    imageUri: '',
    category: 'Tea & Beverages',
    shelfLocation: 'Aisle 3 - Coffee Shelf',
    currentStock: 35,
    createdAt: '2026-09-25',
  },
  '890103005002': {
    barcode: '890103005002',
    sku: 'HONEY-DABUR-01',
    name: 'Dabur 100% Pure Squeezy Honey (250g)',
    price: 120.0,
    imageUri: '',
    category: 'Breakfast & Spreads',
    shelfLocation: 'Aisle 5 - Honey Shelf',
    currentStock: 30,
    createdAt: '2026-09-25',
  },
  '890103006002': {
    barcode: '890103006002',
    sku: 'PASTE-COLGATE-01',
    name: 'Colgate Strong Teeth Dental Toothpaste (150g)',
    price: 115.0,
    imageUri: '',
    category: 'Personal Care',
    shelfLocation: 'Aisle 6 - Dental Care',
    currentStock: 60,
    createdAt: '2026-09-25',
  },
  '890103006001': {
    barcode: '890103006001',
    sku: 'SOAP-DETTOL-01',
    name: 'Dettol Original Germ Protection Soap (75g)',
    price: 42.0,
    imageUri: '',
    category: 'Personal Care',
    shelfLocation: 'Aisle 6 - Hygiene Shelf',
    currentStock: 80,
    createdAt: '2026-09-25',
  },
  '890103004003': {
    barcode: '890103004003',
    sku: 'SALT-TATA-01',
    name: 'Tata Salt Vacuum Evaporated Iodized Salt (1kg)',
    price: 28.0,
    imageUri: '',
    category: 'Pantry & Staples',
    shelfLocation: 'Aisle 1 - Spice Shelf',
    currentStock: 100,
    createdAt: '2026-09-25',
  },
};

// Also index DEFAULT_PRODUCTS by SKU
Object.values(DEFAULT_PRODUCTS).forEach((p) => {
  if (p.sku && !DEFAULT_PRODUCTS[p.sku]) {
    DEFAULT_PRODUCTS[p.sku] = p;
  }
});

// Helper: Translate shelf locations into store directions and arrows
export const getItemDirection = (
  shelfLocation: string = '',
  productName: string = ''
): { direction: string; shortDirection: string; arrow: string } => {
  const loc = (shelfLocation || '').trim();
  const locLower = loc.toLowerCase();

  let arrow = 'STRAIGHT';
  let shortDirection = 'Aisle 1';
  let direction = `Located at ${loc || 'Main Floor'}`;

  if (locLower.includes('dairy') || locLower.includes('chiller') || locLower.includes('fridge')) {
    arrow = 'RIGHT';
    shortDirection = 'Turn Right -> Dairy';
    direction = `Walk straight, turn RIGHT into Dairy Chiller (${loc || 'Dairy Section'})`;
  } else if (locLower.includes('biscuit') || locLower.includes('cookie')) {
    arrow = 'LEFT';
    shortDirection = 'Turn Left -> Aisle 2';
    direction = `Take Aisle 2 on the LEFT, Biscuit & Cookie Rack (${loc})`;
  } else if (locLower.includes('beverage') || locLower.includes('coke') || locLower.includes('drink')) {
    arrow = 'STRAIGHT';
    shortDirection = 'Ahead -> Cold Drinks';
    direction = `Walk straight 5m to Glass Cold Drinks Chiller (${loc})`;
  } else if (locLower.includes('flour') || locLower.includes('atta') || locLower.includes('oil')) {
    arrow = 'RIGHT';
    shortDirection = 'Aisle 1 -> Staples';
    direction = `Aisle 1 on RIGHT, Oil & Staples Bay (${loc})`;
  } else if (locLower.includes('confectionery') || locLower.includes('checkout') || locLower.includes('candy')) {
    arrow = 'FRONT';
    shortDirection = 'Front -> Checkout';
    direction = `Near Front Billing Counters (${loc})`;
  } else if (locLower.includes('dental') || locLower.includes('paste') || locLower.includes('care') || locLower.includes('soap')) {
    arrow = 'RIGHT';
    shortDirection = 'Aisle 6 -> Hygiene';
    direction = `Walk to Aisle 6 Far Right, Personal Care (${loc})`;
  } else if (locLower.includes('tea') || locLower.includes('coffee')) {
    arrow = 'LEFT';
    shortDirection = 'Aisle 3 -> Beverages';
    direction = `Aisle 3 on the LEFT, Tea & Coffee Bay (${loc})`;
  } else if (locLower.includes('honey') || locLower.includes('spread') || locLower.includes('sauce')) {
    arrow = 'RIGHT';
    shortDirection = 'Aisle 5 -> Spreads';
    direction = `Aisle 5 on RIGHT, Spreads & Sauces (${loc})`;
  } else if (locLower.includes('noodle') || locLower.includes('chips') || locLower.includes('snack')) {
    arrow = 'LEFT';
    shortDirection = 'Aisle 4 -> Snacks';
    direction = `Aisle 4 on the LEFT, Quick Snacks & Noodles (${loc})`;
  }

  return { direction, shortDirection, arrow };
};

// Get candidate base URLs
export const getApiBaseUrls = async (): Promise<string[]> => {
  const urls: string[] = [];

  try {
    const custom = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (custom && custom.trim()) {
      urls.push(custom.trim().replace(/\/+$/, ''));
    }
  } catch (e) {}

  if (cachedActiveServer && !urls.includes(cachedActiveServer)) {
    urls.push(cachedActiveServer);
  }

  // Current PC Wi-Fi IP and Hotspot
  urls.push('http://10.92.44.66:8000');
  urls.push('http://192.168.137.1:8000');
  urls.push('http://10.1.7.65:8000');
  urls.push('http://10.1.9.166:8000');

  if (Platform.OS === 'android') {
    urls.push('http://10.0.2.2:8000');
  }

  urls.push('http://127.0.0.1:8000');
  urls.push('http://localhost:8000');

  return urls;
};

// Helper: Sanitize barcode strings
export const cleanBarcodeStr = (code: string): string => {
  if (!code) return '';
  return code.toString().replace(/[^a-zA-Z0-9_-]/g, '').trim();
};

// Helper: Fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 2600) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

// Helper: Try candidate URLs to reach Django Backend
const tryFetchDjango = async (path: string, options: RequestInit = {}): Promise<Response | null> => {
  const baseUrls = await getApiBaseUrls();
  const cleanPath = path.replace(/^\/+/, '');

  for (const baseUrl of baseUrls) {
    try {
      const fullUrl = cleanPath ? `${baseUrl}/${cleanPath}` : `${baseUrl}/`;
      const response = await fetchWithTimeout(fullUrl, options, 2200);
      if (response.ok) {
        cachedActiveServer = baseUrl;
        return response;
      }
    } catch (e) {
      // try next candidate base URL
    }
  }
  return null;
};

// Helper: Robust barcode matching
export const findMatchingProduct = (products: Record<string, ProductItem>, rawBarcode: string): ProductItem | null => {
  if (!rawBarcode) return null;
  const rawClean = rawBarcode.trim();
  const clean = cleanBarcodeStr(rawBarcode);

  // 1. Direct exact key lookup
  if (products[rawClean]) return products[rawClean];
  if (clean && products[clean]) return products[clean];

  // 2. Sanitized string comparison across all stored items
  for (const key of Object.keys(products)) {
    const keyClean = cleanBarcodeStr(key);
    if (keyClean && clean && keyClean === clean) {
      return products[key];
    }
    const item = products[key];
    if (item.sku && cleanBarcodeStr(item.sku) === clean) {
      return item;
    }
  }

  // 3. Numeric match ignoring leading zeroes (UPC vs EAN-13)
  if (clean) {
    const noZero = clean.replace(/^0+/, '');
    if (noZero.length >= 4) {
      for (const key of Object.keys(products)) {
        const keyNoZero = cleanBarcodeStr(key).replace(/^0+/, '');
        if (keyNoZero === noZero) {
          return products[key];
        }
      }
    }
  }

  return null;
};

export const productDb = {
  // Server URL Configuration
  async getStoredServerUrl(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(SERVER_URL_KEY);
      return val || 'http://10.92.44.66:8000';
    } catch (e) {
      return 'http://10.92.44.66:8000';
    }
  },

  async setCustomServer(url: string): Promise<void> {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    cachedActiveServer = cleanUrl;
    await AsyncStorage.setItem(SERVER_URL_KEY, cleanUrl);
  },

  // Paired Cart ID
  async getPairedCartId(): Promise<string> {
    try {
      const val = await AsyncStorage.getItem(PAIRED_CART_KEY);
      return val || 'CART-01';
    } catch (e) {
      return 'CART-01';
    }
  },

  async setPairedCartId(cartId: string): Promise<void> {
    await AsyncStorage.setItem(PAIRED_CART_KEY, cartId);
  },

  // Product Database
  async getAllProducts(): Promise<Record<string, ProductItem>> {
    let localProducts: Record<string, ProductItem> = {};

    // 1. Fetch live products from Django Backend
    const djangoRes = await tryFetchDjango('api/products/');
    if (djangoRes) {
      try {
        const data = await djangoRes.json();
        if (data.results && Object.keys(data.results).length > 0) {
          await AsyncStorage.setItem(DB_KEY, JSON.stringify(data.results));
          return data.results;
        }
      } catch (e) {
        console.warn('Django JSON parse error:', e);
      }
    }

    // 2. Fallback to AsyncStorage cache
    try {
      const json = await AsyncStorage.getItem(DB_KEY);
      if (json) {
        localProducts = JSON.parse(json);
        if (Object.keys(localProducts).length > 0) {
          return localProducts;
        }
      }
    } catch (e) {}

    // 3. Fallback to rich built-in default retail catalog
    await AsyncStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_PRODUCTS));
    return { ...DEFAULT_PRODUCTS };
  },

  async getProduct(barcode: string): Promise<ProductItem | null> {
    const rawClean = (barcode || '').trim();
    const cleanCode = cleanBarcodeStr(barcode) || rawClean;
    if (!cleanCode) return null;

    // 1. Fetch from Django Backend
    const djangoRes = await tryFetchDjango(`api/products/${encodeURIComponent(cleanCode)}/`);
    if (djangoRes) {
      try {
        const product: ProductItem = await djangoRes.json();
        if (product && product.barcode) {
          const localAll = await this.getAllProducts();
          localAll[product.barcode] = product;
          await AsyncStorage.setItem(DB_KEY, JSON.stringify(localAll));
          return product;
        }
      } catch (e) {
        console.warn('Django single lookup error:', e);
      }
    }

    // 2. Fallback to local cache & default products
    const localAll = await this.getAllProducts();
    return findMatchingProduct(localAll, barcode) || findMatchingProduct(DEFAULT_PRODUCTS, barcode);
  },

  async saveProduct(product: ProductItem): Promise<void> {
    const rawClean = (product.barcode || '').trim();
    const cleanCode = cleanBarcodeStr(product.barcode) || rawClean;
    const cleanProduct = { ...product, barcode: cleanCode };

    await tryFetchDjango('api/products/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanProduct),
    });

    try {
      const all = await this.getAllProducts();
      all[cleanCode] = cleanProduct;
      await AsyncStorage.setItem(DB_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving local cache:', e);
    }
  },

  async deleteProduct(barcode: string): Promise<void> {
    const rawClean = (barcode || '').trim();
    const cleanCode = cleanBarcodeStr(barcode) || rawClean;

    await tryFetchDjango(`api/products/${encodeURIComponent(cleanCode)}/`, {
      method: 'DELETE',
    });

    try {
      const all = await this.getAllProducts();
      delete all[cleanCode];
      delete all[rawClean];
      await AsyncStorage.setItem(DB_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Error deleting local cache:', e);
    }
  },

  // ==========================================
  // SMART CART BACKEND INTEGRATION
  // ==========================================

  // Pair phone with Cart Session
  async pairCart(cartId: string, userName = 'Mobile Shopper'): Promise<{ success: boolean; message: string }> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    await this.setPairedCartId(cleanCartId);

    const res = await tryFetchDjango(`api/cart/pair/?cart_id=${encodeURIComponent(cleanCartId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart_id: cleanCartId, user_name: userName }),
    });

    if (res && res.ok) {
      return { success: true, message: `Connected to ${cleanCartId}!` };
    }
    return { success: false, message: `Pair request saved for ${cleanCartId}.` };
  },

  // Scan product into cart (triggers ESP32 OLED update + Bought LED!)
  async scanToCart(cartId: string, barcodeOrSku: string): Promise<CartSessionData | null> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const cleanCode = cleanBarcodeStr(barcodeOrSku) || barcodeOrSku.trim();

    const res = await tryFetchDjango(`api/cart/scan/?cart_id=${encodeURIComponent(cleanCartId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode: cleanCode, sku: cleanCode }),
    });

    if (res && res.ok) {
      return await res.json();
    }
    return null;
  },

  // Get active cart session
  async getCartDetails(cartId: string): Promise<CartSessionData | null> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const res = await tryFetchDjango(`api/cart/session/?cart_id=${encodeURIComponent(cleanCartId)}`);
    if (res && res.ok) {
      return await res.json();
    }
    return null;
  },

  // Add / Update item quantity in cart
  async updateCartItem(cartId: string, productId: number, quantity: number): Promise<CartSessionData | null> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const res = await tryFetchDjango(`api/cart/items/?cart_id=${encodeURIComponent(cleanCartId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, quantity }),
    });
    if (res && res.ok) {
      return await res.json();
    }
    return null;
  },

  // Remove item from cart
  async removeCartItem(cartId: string, itemId: number): Promise<CartSessionData | null> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const res = await tryFetchDjango(`api/cart/items/?cart_id=${encodeURIComponent(cleanCartId)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    });
    if (res && res.ok) {
      return await res.json();
    }
    return null;
  },

  // Item Voice / Text Search with Direction Guidance (Online + Robust Local Fallback)
  async voiceSearch(cartId: string, query: string): Promise<{ transcript: string; items: SearchResultItem[] }> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const cleanQuery = (query || '').trim();

    // 1. Attempt live query to Django Backend
    if (cleanQuery) {
      try {
        const res = await tryFetchDjango(
          `api/cart/voice-search/?cart_id=${encodeURIComponent(cleanCartId)}&query=${encodeURIComponent(cleanQuery)}`
        );
        if (res && res.ok) {
          const data = await res.json();
          if (data && data.items && data.items.length > 0) {
            return data;
          }
        }
      } catch (e) {
        console.warn('Django voice search failed, falling back to local search engine:', e);
      }
    }

    // 2. Offline / Local Search Engine over all catalog products
    const allProducts = await this.getAllProducts();
    const productList = Object.values(allProducts);

    // Filter unique items by barcode or SKU
    const seen = new Set<string>();
    const uniqueProducts: ProductItem[] = [];
    for (const p of productList) {
      const key = p.barcode || p.sku || p.name;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueProducts.push(p);
      }
    }

    const queryLower = cleanQuery.toLowerCase();
    let queryTokens = queryLower
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Expand common retail synonyms & abbreviations
    const expandedTokens = new Set<string>(queryTokens);
    for (const t of queryTokens) {
      if (t.endsWith('s') && t.length > 3) expandedTokens.add(t.slice(0, -1));
      if (!t.endsWith('s')) expandedTokens.add(t + 's');
      if (t === 'coke' || t === 'cola') { expandedTokens.add('coca'); expandedTokens.add('coca-cola'); }
      if (t === 'biscuit' || t === 'biscuits') { expandedTokens.add('bisc'); expandedTokens.add('cookie'); expandedTokens.add('parle'); expandedTokens.add('bourbon'); }
      if (t === 'cookie' || t === 'cookies') { expandedTokens.add('good'); expandedTokens.add('day'); expandedTokens.add('biscuit'); }
      if (t === 'milk') { expandedTokens.add('amul'); expandedTokens.add('dairy'); }
      if (t === 'tea' || t === 'chai') { expandedTokens.add('tata'); expandedTokens.add('tea'); }
      if (t === 'coffee') { expandedTokens.add('nescafe'); }
      if (t === 'noodle' || t === 'noodles') { expandedTokens.add('maggi'); }
      if (t === 'chips' || t === 'chip') { expandedTokens.add('lays'); }
      if (t === 'namkeen') { expandedTokens.add('haldiram'); expandedTokens.add('bhujia'); }
      if (t === 'butter') { expandedTokens.add('amul'); }
      if (t === 'choc' || t === 'chocolate') { expandedTokens.add('cadbury'); expandedTokens.add('dairy'); }
    }
    const finalTokens = Array.from(expandedTokens);

    let matched: Array<{ score: number; product: ProductItem }> = [];

    if (queryTokens.length === 0) {
      // Empty query: Return popular catalog items
      matched = uniqueProducts.slice(0, 8).map((p, idx) => ({ score: 10 - idx, product: p }));
    } else {
      for (const p of uniqueProducts) {
        const nameLower = (p.name || '').toLowerCase();
        const catLower = (p.category || '').toLowerCase();
        const skuLower = (p.sku || '').toLowerCase();
        const barLower = (p.barcode || '').toLowerCase();

        let score = 0;
        for (const token of finalTokens) {
          if (nameLower.includes(token)) score += 5;
          if (catLower.includes(token)) score += 3;
          if (skuLower.includes(token) || barLower.includes(token)) score += 4;
        }

        if (score > 0) {
          matched.push({ score, product: p });
        }
      }

      matched.sort((a, b) => b.score - a.score);
    }

    // Convert top matches to SearchResultItem format with rich directions
    const items: SearchResultItem[] = matched.slice(0, 10).map((m, idx) => {
      const p = m.product;
      const shelf = p.shelfLocation || 'Aisle 1 - General Rack';
      const directionInfo = getItemDirection(shelf, p.name);
      const shortName = p.name.split('(')[0].trim().slice(0, 11);
      const oledRow = `${idx + 1}.${shortName} Rs${Math.round(p.price)}`;

      return {
        id: idx + 1,
        sku: p.sku || p.barcode,
        barcode: p.barcode,
        name: p.name,
        category: p.category || 'Retail',
        price: p.price,
        stock: p.currentStock || 50,
        shelfLocation: shelf,
        direction: directionInfo.direction,
        shortDirection: directionInfo.shortDirection,
        arrow: directionInfo.arrow,
        imageUrl: p.imageUri,
        oledRow,
      };
    });

    return {
      transcript: cleanQuery || 'Store Catalog',
      items,
    };
  },

  // Checkout and Pay
  async checkoutCart(cartId: string): Promise<any> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const res = await tryFetchDjango(`api/cart/checkout/?cart_id=${encodeURIComponent(cleanCartId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res && res.ok) {
      return await res.json();
    }
    return null;
  },

  // Get UPI Payment QR
  async getPaymentQr(cartId: string): Promise<any> {
    const cleanCartId = cartId.replace(/^CART:/, '').trim() || 'CART-01';
    const res = await tryFetchDjango(`api/cart/payment-qr/?cart_id=${encodeURIComponent(cleanCartId)}`);
    if (res && res.ok) {
      return await res.json();
    }
    return null;
  },
};
