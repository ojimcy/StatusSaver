const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.3gp', '.mkv', '.avi'];

/**
 * Determines file type based on extension. Defaults to 'image' for unknown extensions.
 */
export function getFileType(filename: string): 'image' | 'video' {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext)) {
    return 'video';
  }
  return 'image';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateUniqueFilename(originalName: string): string {
  const dotIndex = originalName.lastIndexOf('.');
  const name = dotIndex > -1 ? originalName.substring(0, dotIndex) : originalName;
  const ext = dotIndex > -1 ? originalName.substring(dotIndex) : '';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${name}_${timestamp}_${random}${ext}`;
}
