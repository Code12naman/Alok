export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  description: string;
  images: string[];
  category: string;
  tags: string[];
  isNew?: boolean;
  isTrending?: boolean;
  rating: number;
  reviewsCount: number;
}

export const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Minimalist Chronograph Watch",
    slug: "minimalist-chronograph-watch",
    price: 249.99,
    originalPrice: 299.99,
    description: "A premium minimalist watch featuring a precision quartz movement, sapphire crystal glass, and a genuine leather strap. Perfect for both casual and formal occasions.",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1524592094714-0f0654ece975?auto=format&fit=crop&q=80&w=1000",
    ],
    category: "Accessories",
    tags: ["watch", "minimalist", "premium"],
    isNew: true,
    isTrending: true,
    rating: 4.8,
    reviewsCount: 124,
  },
  {
    id: "prod-2",
    name: "Noise-Cancelling Over-Ear Headphones",
    slug: "noise-cancelling-headphones",
    price: 349.0,
    description: "Experience pure audio bliss with our latest active noise-cancelling technology. Up to 30 hours of battery life and premium comfort for all-day listening.",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=1000",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=1000",
    ],
    category: "Electronics",
    tags: ["audio", "wireless", "premium"],
    isNew: false,
    isTrending: true,
    rating: 4.9,
    reviewsCount: 342,
  },
  {
    id: "prod-3",
    name: "Smart Home Hub Display",
    slug: "smart-home-hub",
    price: 129.99,
    originalPrice: 149.99,
    description: "Control your entire home with this sleek, responsive touch display. Seamlessly integrates with thousands of smart home devices.",
    images: [
      "https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&q=80&w=1000",
    ],
    category: "Electronics",
    tags: ["smart home", "display", "gadget"],
    isNew: true,
    isTrending: false,
    rating: 4.5,
    reviewsCount: 89,
  },
  {
    id: "prod-4",
    name: "Ergonomic Office Chair",
    slug: "ergonomic-office-chair",
    price: 499.0,
    description: "Designed for those who spend hours at their desk. Features adjustable lumbar support, breathable mesh back, and 4D armrests.",
    images: [
      "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=1000",
    ],
    category: "Furniture",
    tags: ["office", "chair", "ergonomic"],
    isNew: false,
    isTrending: true,
    rating: 4.7,
    reviewsCount: 215,
  },
  {
    id: "prod-5",
    name: "Ceramic Coffee Pour-Over Set",
    slug: "ceramic-pour-over-set",
    price: 85.0,
    description: "Elevate your morning routine with this handcrafted ceramic pour-over set. Includes dripper, carafe, and 100 paper filters.",
    images: [
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=1000",
    ],
    category: "Kitchen",
    tags: ["coffee", "ceramic", "handcrafted"],
    isNew: false,
    isTrending: false,
    rating: 4.9,
    reviewsCount: 67,
  },
  {
    id: "prod-6",
    name: "Leather Weekend Duffle Bag",
    slug: "leather-weekend-duffle",
    price: 195.0,
    originalPrice: 250.0,
    description: "The perfect companion for short trips. Made from full-grain leather that ages beautifully, featuring solid brass hardware.",
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=1000",
    ],
    category: "Accessories",
    tags: ["bag", "travel", "leather"],
    isNew: true,
    isTrending: true,
    rating: 4.8,
    reviewsCount: 143,
  }
];

export const mockCategories = [
  {
    id: "cat-1",
    name: "Electronics",
    slug: "electronics",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "cat-2",
    name: "Accessories",
    slug: "accessories",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "cat-3",
    name: "Furniture",
    slug: "furniture",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=1000",
  },
  {
    id: "cat-4",
    name: "Kitchen",
    slug: "kitchen",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1000",
  },
];
