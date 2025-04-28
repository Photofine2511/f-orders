export type UserRole = "user" | "admin";

export type User = {
  id?: string;
  _id?: string;
  email: string;
  name: string;
  password?: string; // Not included in responses
  role: UserRole;
  token?: string; // Included in login/register responses
};

export type PageType = "Regular" | "NT-Slim" | "NT-Thick";
export type LaminationType = "Glossy" | "Matte" | "Velvet" | "Texture" | "None";
export type CoverType = "Matte" | "Glossy" | "Velvet" | "Texture" | "Sparkle" | "Leather" | "Hardcover" | "Softcover";

export type OrderStatus = "Pending" | "Acknowledged" | "Printing" | "Completed";

export interface Album {
  id?: string;
  _id?: string;
  userId: string;
  name: string;
  file: string; // In a real app, this would be a URL or file reference
  dateCreated: string;
  qrCode?: string;
}

export interface Order {
  id?: string;
  _id?: string;
  user?: string | User; // Could be populated
  userId?: string;
  albumId?: string;
  albumName: string;
  fileUrl?: string;
  publicId?: string;
  originalFilename?: string;
  fileSize?: number;
  dateCreated?: string;
  dateUpdated?: string;
  createdAt?: string; // MongoDB timestamp
  updatedAt?: string; // MongoDB timestamp
  status: OrderStatus;
  pageType: PageType;
  lamination: LaminationType;
  transparent: boolean;
  emboss: boolean;
  miniBook: boolean;
  coverType: CoverType;
  qrCode?: string; // Generated only when status is "Completed"
  downloadedByAdmin?: boolean;
  adminNotes?: string;
}
