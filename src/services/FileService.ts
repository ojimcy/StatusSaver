import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import {Platform} from 'react-native';
import {requestStoragePermission} from './PermissionService';
import type {StatusFile} from '../types';

/**
 * Trigger Android MediaScanner so the saved file appears in gallery queries
 * immediately instead of waiting for the next system scan.
 */
async function scanFile(filePath: string): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await RNFS.scanFile(filePath);
  } catch {
    // scanFile not critical — gallery will catch up eventually
  }
}

export async function saveToGallery(file: StatusFile): Promise<boolean> {
  try {
    // Ensure write permission is granted
    await requestStoragePermission();

    const type = file.type === 'video' ? 'video' : 'photo';
    let uriToSave = file.uri;

    // SAF content:// URIs can't be saved directly by CameraRoll.
    // Copy to a temp file first, save to gallery, then clean up.
    if (file.uri.startsWith('content://')) {
      const ext =
        file.name.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
      const tempPath = `${RNFS.CachesDirectoryPath}/${
        file.name || `status_${Date.now()}.${ext}`
      }`;
      await RNFS.copyFile(file.uri, tempPath);
      uriToSave = `file://${tempPath}`;
      const savedUri = await CameraRoll.save(uriToSave, {
        type,
        album: 'StatusSaver',
      });
      // Trigger media scan so it shows up in gallery queries immediately
      if (savedUri) {
        await scanFile(savedUri);
      }
      // Clean up temp file
      await RNFS.unlink(tempPath).catch(() => {});
    } else {
      const savedUri = await CameraRoll.save(uriToSave, {
        type,
        album: 'StatusSaver',
      });
      if (savedUri) {
        await scanFile(savedUri);
      }
    }

    return true;
  } catch (error) {
    console.error('FileService.saveToGallery failed:', error);
    return false;
  }
}

export async function saveBatch(
  files: StatusFile[],
): Promise<{saved: number; failed: number}> {
  let saved = 0;
  let failed = 0;

  for (const file of files) {
    const success = await saveToGallery(file);
    if (success) {
      saved++;
    } else {
      failed++;
    }
  }

  return {saved, failed};
}

export async function shareFile(file: StatusFile): Promise<void> {
  let tempPath: string | null = null;
  try {
    const mimeType = file.type === 'video' ? 'video/mp4' : 'image/jpeg';
    let shareUrl = file.uri;

    // SAF content:// URIs need to be copied to a temp file for sharing
    if (file.uri.startsWith('content://')) {
      const ext =
        file.name.split('.').pop() || (file.type === 'video' ? 'mp4' : 'jpg');
      tempPath = `${RNFS.CachesDirectoryPath}/${
        file.name || `share_${Date.now()}.${ext}`
      }`;
      await RNFS.copyFile(file.uri, tempPath);
      shareUrl = `file://${tempPath}`;
    }

    await Share.open({
      url: shareUrl,
      type: mimeType,
      failOnCancel: false,
    });
  } catch (error) {
    // User cancelled the share sheet — not an error
    if ((error as any)?.message !== 'User did not share') {
      console.error('FileService.shareFile failed:', error);
    }
  } finally {
    if (tempPath) {
      await RNFS.unlink(tempPath).catch(() => {});
    }
  }
}

export async function deleteFile(path: string): Promise<void> {
  try {
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  } catch (error) {
    console.error('FileService.deleteFile failed:', error);
    throw error;
  }
}
