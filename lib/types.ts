/** Shapes returned by the JSON API, shared by client components. */

export type BulkSlabDto = { minQty: number; price: number };

export type CategoryRef = { id: string; name: string; slug: string };
export type BrandRef = { id: string; name: string; slug: string };

export type ProductDto = {
  _id: string;
  title: string;
  slug: string;
  sku: string;
  hsnCode?: string;
  shortDescription?: string;
  description?: string;
  specifications?: { key: string; value: string }[];
  images?: string[];
  stock: number;
  moq: number;
  unit?: string;
  price?: { mrp?: number; distributorPrice?: number; bulkSlabs?: BulkSlabDto[] };
  gstPercent?: number;
  featured?: boolean;
  isActive?: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  category?: CategoryRef | null;
  brand?: BrandRef | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryDto = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  isActive?: boolean;
  productCount?: number;
  totalStock?: number;
};

export type BrandDto = {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  productCount?: number;
};

export type OrderLineDto = {
  productId: string;
  title: string;
  sku: string;
  hsnCode?: string;
  unit?: string;
  qty: number;
  price: number;
  gstPercent: number;
  gst: number;
  lineTotal: number;
  image?: string;
};

export type AddressDto = {
  label?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type StatusHistoryEntry = { status: string; at: string; by?: string; note?: string };

export type OrderDto = {
  _id: string;
  orderNumber: string;
  contactName?: string;
  customerEmail?: string;
  contactPhone?: string;
  companyName?: string;
  gstin?: string;
  items: OrderLineDto[];
  billingAddress?: AddressDto;
  shippingAddress?: AddressDto;
  subtotal: number;
  gstTotal: number;
  deliveryCharge?: number;
  grandTotal: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus: string;
  statusHistory?: StatusHistoryEntry[];
  trackingNumber?: string;
  courier?: string;
  notes?: string;
  adminNote?: string;
  createdAt: string;
};

export type TrackedOrderDto = Omit<OrderDto, "_id" | "adminNote"> & { id: string };

export type InquiryDto = {
  _id: string;
  inquiryNumber?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCompany?: string;
  guestGstin?: string;
  productTitle?: string;
  productSku?: string;
  quantity?: number;
  message?: string;
  status: string;
  quoteAmount?: number;
  adminNote?: string;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
};

export type BookingDto = {
  _id: string;
  bookingNumber?: string;
  serviceType?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  date?: string;
  slot?: string;
  notes?: string;
  status: string;
  adminNote?: string;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
};

export type PricedCartLineDto = OrderLineDto & {
  slug?: string;
  moq: number;
  stock: number;
  unitPrice: number;
  taxable: number;
  total: number;
  nextSlab?: BulkSlabDto | null;
};

export type CustomerDto = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  gstin: string;
  city: string;
  state: string;
  orderCount: number;
  enquiryCount: number;
  value: number;
  lastActivityAt: string | null;
  isLead: boolean;
};

export type AdminNotificationDto = {
  id: string;
  kind: "order" | "booking" | "inquiry" | "status";
  title: string;
  summary: string;
  href: string;
  at: string;
  unread: boolean;
};
