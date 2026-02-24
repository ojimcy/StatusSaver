import {Platform} from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/** Deleted message capture requires NotificationListenerService, which is Android-only */
export const supportsDeletedMessages = isAndroid;
