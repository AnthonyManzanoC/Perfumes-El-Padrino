export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string;
  description?: string | null;
  gender: string;
  sizeMl?: number | null;
  price: number;
  compareAtPrice?: number | null;
  freeShipping: boolean;
  shippingFee?: number | null;
  stock: number;
  imageUrl: string;
  images: Array<{
    id: string;
    url: string;
    altText?: string | null;
    sortOrder: number;
  }>;
  notesCsv?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  featured: boolean;
  bestseller: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type SiteSettings = {
  storeName: string;
  tagline: string;
  announcement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  logoUrl?: string | null;
  heroImageUrl: string;
  whatsAppNumber: string;
  whatsAppGreeting: string;
  aboutTitle: string;
  aboutText: string;
  instagramUrl: string;
  address: string;
  deliveryText: string;
  currency: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
};

export type StorefrontData = {
  settings: SiteSettings;
  categories: Category[];
  products: Product[];
};

export type CartEntry = { productId: string; quantity: number };

export type AdminSummary = {
  activeProducts: number;
  lowStockProducts: number;
  pendingOrders: number;
  monthOrders: number;
  monthPotentialRevenue: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city?: string | null;
  notes?: string | null;
  subtotal: number;
  shippingTotal: number;
  total: number;
  status: string;
  inventoryCommitted: boolean;
  createdAt: string;
  items: Array<{
    id: string;
    productId?: string | null;
    productName: string;
    unitPrice: number;
    quantity: number;
  }>;
};
