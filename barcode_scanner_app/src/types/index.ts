export interface ProductItem {
  barcode: string;
  name: string;
  price: number;
  imageUri: string;
  category?: string;
  shelfLocation?: string;
  currentStock?: number;
  sku?: string;
  createdAt: string;
}

export interface ScanHistoryItem {
  id: string;
  data: string;
  type: string;
  timestamp: string;
  date: string;
  isUrl: boolean;
  product?: ProductItem;
  isCartPair?: boolean;
}

export interface SearchResultItem {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  shelfLocation: string;
  direction: string;
  shortDirection: string;
  arrow: string;
  imageUrl?: string;
  oledRow?: string;
}

export interface CartItemData {
  id: number;
  productId: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  lineTotal: number;
  shelfLocation: string;
  imageUrl?: string;
}

export interface CartSessionData {
  cartId: string;
  status: string;
  isGuest: boolean;
  member?: {
    id: number;
    name: string;
    tier: string;
    discountPercent: number;
  } | null;
  items: CartItemData[];
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  total: number;
  recommendations?: {
    recommendations: Array<{
      name: string;
      sku: string;
      price: number;
      reason: string;
      badge: string;
    }>;
  };
}

export type ScanMode = 'single' | 'batch';
export type ScannerType = 'cart' | 'catalog';
export type AppTab = 'overview' | 'scanner' | 'cart' | 'search' | 'products' | 'history' | 'settings';
