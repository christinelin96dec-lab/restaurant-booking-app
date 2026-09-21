export interface RestaurantSummary {
  id: string;
  name: string;
  city: string;
  cuisineTypes: string[];
  priceRange: number;
  photos: string[];
  stats?: { averageRating: number; reviewCount: number; weightedRating: number };
  badges?: { type: 'RISING_STAR' | 'GUEST_FAVORITE' | 'TOP_RATED' | 'PLATFORM_CHOICE'; revokedAt: string | null }[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  category: string;
  photoUrl?: string;
  isAvailable?: boolean;
}

export interface BulkOrderPackage {
  id: string;
  name: string;
  description?: string;
  pricePerHeadCents: number;
  currency: string;
  minGuests: number;
  maxGuests?: number;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { fullName: string; avatarUrl?: string };
  adminReply?: string;
}
