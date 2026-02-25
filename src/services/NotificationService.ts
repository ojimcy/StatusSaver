import {NativeModules, NativeEventEmitter} from 'react-native';
import type {EmitterSubscription} from 'react-native';

const {NotificationListenerModule} = NativeModules;
const eventEmitter = new NativeEventEmitter(NotificationListenerModule);

export async function isNotificationListenerEnabled(): Promise<boolean> {
  try {
    return await NotificationListenerModule.isEnabled();
  } catch (error) {
    console.error(
      'NotificationService.isNotificationListenerEnabled failed:',
      error,
    );
    return false;
  }
}

export function requestNotificationAccess(): void {
  try {
    NotificationListenerModule.requestPermission();
  } catch (error) {
    console.error(
      'NotificationService.requestNotificationAccess failed:',
      error,
    );
  }
}

export interface WhatsAppMessageEvent {
  contactName: string;
  messageText: string;
  groupName: string | null;
  isGroup: boolean;
  timestamp: number;
  thumbnailBase64: string | null;
  notificationKey: string;
  notificationId: number;
  packageName: string;
}

export interface WhatsAppMessageRemovedEvent {
  notificationKey: string;
  notificationId: number;
  timestamp: number;
  messageText: string;
  title: string;
}

/**
 * Subscribes to WhatsApp message events from the native NotificationListenerService.
 * The callback receives raw message data from the native side.
 */
export function startListening(
  onMessage: (msg: WhatsAppMessageEvent) => void,
): EmitterSubscription {
  return eventEmitter.addListener('onWhatsAppMessage', onMessage);
}

/**
 * Subscribes to WhatsApp message-removed events from the native NotificationListenerService.
 * Fires when a WhatsApp notification is dismissed/removed (e.g. message deleted for everyone).
 */
export function startListeningForRemoved(
  onRemoved: (msg: WhatsAppMessageRemovedEvent) => void,
): EmitterSubscription {
  return eventEmitter.addListener('onWhatsAppMessageRemoved', onRemoved);
}

export function stopListening(subscription: EmitterSubscription): void {
  subscription.remove();
}
