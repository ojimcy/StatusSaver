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

export interface AdConfig {
  bannerId: string;
  interstitialId: string;
  rewardedId: string;
  appOpenId: string;
}
