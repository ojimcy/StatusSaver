import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import type {StatusFile} from '../types';

export async function saveToGallery(file: StatusFile): Promise<boolean> {
  try {
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
      await CameraRoll.save(uriToSave, {type, album: 'StatusSaver'});
      // Clean up temp file
      await RNFS.unlink(tempPath).catch(() => {});
    } else {
      await CameraRoll.save(uriToSave, {type, album: 'StatusSaver'});
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
