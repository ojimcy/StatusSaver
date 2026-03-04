import {NativeModules} from 'react-native';
import type {StatusFile, WhatsAppVariant} from '../types';
import {getFileType} from '../utils/fileUtils';
import {isAndroid} from '../utils/platform';

const {StatusAccessModule, SAFModule} = NativeModules;

function detectVariant(file: any): WhatsAppVariant {
  const source: string = file.uri || file.path || '';
  if (
    source.includes('com.whatsapp.w4b') ||
    source.includes('WhatsApp%20Business') ||
    source.includes('WhatsApp Business')
  ) {
    return 'business';
  }
  return 'whatsapp';
}

function mapNativeFile(file: any): StatusFile {
  return {
    id: file.path || file.uri,
    path: file.path ?? '',
    name: file.name ?? '',
    type: getFileType(file.name ?? ''),
    size: file.size ?? 0,
    lastModified: file.lastModified ?? 0,
    uri: file.uri ?? file.path ?? '',
    variant: detectVariant(file),
  };
}

export async function getStatuses(): Promise<StatusFile[]> {
  try {
    if (!isAndroid) {
      // iOS uses a Share Extension; statuses come from shared container
      return [];
    }

    let files: any[];
    // Try SAF first (Android 11+), fall back to direct path
    try {
      files = await SAFModule.getPersistedFiles();
    } catch {
      try {
        files = await StatusAccessModule.getStatusFiles();
      } catch {
        return [];
      }
    }

    if (!Array.isArray(files)) {
      return [];
    }

    return files
      .filter((f: any) => f && f.name && !f.name.startsWith('.'))
      .map(mapNativeFile)
      .sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('StatusService.getStatuses failed:', error);
    return [];
  }
}

export async function refreshStatuses(): Promise<StatusFile[]> {
  try {
    if (!isAndroid) {
      return [];
    }

    let files: any[];
    try {
      files = await SAFModule.getPersistedFiles();
    } catch {
      files = await StatusAccessModule.getStatusFiles();
    }

    if (!Array.isArray(files)) {
      return [];
    }

    return files
      .filter((f: any) => f && f.name && !f.name.startsWith('.'))
      .map(mapNativeFile)
      .sort((a, b) => b.lastModified - a.lastModified);
  } catch (error) {
    console.error('StatusService.refreshStatuses failed:', error);
    return [];
  }
}

export async function getImageStatuses(): Promise<StatusFile[]> {
  const statuses = await getStatuses();
  return statuses.filter(s => s.type === 'image');
}

export async function getVideoStatuses(): Promise<StatusFile[]> {
  const statuses = await getStatuses();
  return statuses.filter(s => s.type === 'video');
}
