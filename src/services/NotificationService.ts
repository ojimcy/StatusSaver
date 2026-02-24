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

/**
 * Subscribes to WhatsApp message events from the native NotificationListenerService.
 * The callback receives raw message data from the native side.
 */
export function startListening(
  onMessage: (msg: {
    contactName: string;
    messageText: string;
    groupName: string | null;
    isGroup: boolean;
    timestamp: number;
    thumbnailBase64: string | null;
  }) => void,
): EmitterSubscription {
  return eventEmitter.addListener('onWhatsAppMessage', onMessage);
}

export function stopListening(subscription: EmitterSubscription): void {
  subscription.remove();
}
