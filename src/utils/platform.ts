import {Platform} from 'react-native';

export const isAndroid = Platform.OS === 'android';
export const isIOS = Platform.OS === 'ios';

/** Deleted message capture — disabled for now; keeping code for future use */
export const supportsDeletedMessages = false;
