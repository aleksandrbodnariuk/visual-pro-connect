export type MarketplaceListingStatus = 'draft' | 'active' | 'reserved' | 'sold' | 'archived';
export type MarketplaceCondition = 'new' | 'used' | 'for_rent' | 'service';
export type MarketplaceDealType = 'sale' | 'rent' | 'service' | 'digital';
export type MarketplaceCurrency = 'UAH' | 'USD' | 'EUR';
export type MarketplaceContactMethod = 'chat' | 'phone' | 'both';
export type MarketplaceReservationStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface MarketplaceCategory {
  id: string;
  parent_id: string | null;
  label: string;
  icon: string;
  sort_order: number;
  is_visible: boolean;
}

export interface MarketplaceListing {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: MarketplaceCurrency;
  is_negotiable: boolean;
  condition: MarketplaceCondition;
  deal_type: MarketplaceDealType;
  city: string | null;
  contact_phone: string | null;
  contact_method: MarketplaceContactMethod;
  status: MarketplaceListingStatus;
  views_count: number;
  is_vip_boost: boolean;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface MarketplaceListingWithImages extends MarketplaceListing {
  images: MarketplaceListingImage[];
  category?: MarketplaceCategory;
}

export interface MarketplaceFavorite {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface MarketplaceReservation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: MarketplaceReservationStatus;
  buyer_note: string | null;
  seller_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingFilters {
  search?: string;
  categoryId?: string;
  dealType?: MarketplaceDealType;
  condition?: MarketplaceCondition;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
}

export const CONDITION_LABELS: Record<MarketplaceCondition, string> = {
  new: 'Новий',
  used: 'Б/в',
  for_rent: 'Для оренди',
  service: 'Послуга',
};

export const DEAL_TYPE_LABELS: Record<MarketplaceDealType, string> = {
  sale: 'Продаж',
  rent: 'Оренда',
  service: 'Послуга',
  digital: 'Цифровий товар',
};

export const STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  draft: 'Чернетка',
  active: 'Активне',
  reserved: 'Зарезервоване',
  sold: 'Продано',
  archived: 'Архів',
};

export const CURRENCY_SYMBOLS: Record<MarketplaceCurrency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
};