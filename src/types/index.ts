export type WhatsAppVariant = 'whatsapp' | 'business';

export interface StatusFile {
  id: string;
  path: string;
  name: string;
  type: 'image' | 'video';
  size: number;
  lastModified: number;
  uri: string;
  variant: WhatsAppVariant;
}

export interface DeletedMessage {
  id: number;
  contactName: string;
  messageText: string;
  groupName: string | null;
  isGroup: boolean;
  timestamp: number;
  isRead: boolean;
  thumbnailBase64: string | null;
  createdAt: number;
  packageName: string;
}

export interface MessageFilter {
  searchQuery: string;
  contactName: string | null;
  dateFrom: number | null;
  dateTo: number | null;
}

export interface AdConfig {
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  appOpenId: string;
}
