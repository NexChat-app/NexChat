import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { cloudinary } from '../config/cloudinary';

export type PickedMedia = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  kind: 'image' | 'video' | 'file' | 'audio';
};

export type UploadedMedia = PickedMedia & {
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
};

function mediaKind(mimeType: string): PickedMedia['kind'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

function resourceTypeFor(kind: PickedMedia['kind']) {
  return kind === 'image' ? 'image' : kind === 'file' ? 'raw' : 'video';
}

export async function pickImagesAndVideos(): Promise<PickedMedia[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Autorisation de la galerie refusée.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 1,
  });

  if (result.canceled) return [];

  return result.assets.map((asset, index) => {
    const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
    return {
      uri: asset.uri,
      name: asset.fileName || `media-${Date.now()}-${index}`,
      mimeType,
      size: asset.fileSize,
      kind: mediaKind(mimeType),
    };
  });
}

export async function pickFile(): Promise<PickedMedia | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const mimeType = asset.mimeType || 'application/octet-stream';
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType,
    size: asset.size,
    kind: mediaKind(mimeType),
  };
}

export async function uploadToCloudinary(media: PickedMedia): Promise<UploadedMedia> {
  const resourceType = resourceTypeFor(media.kind);
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/${resourceType}/upload`;

  const body = new FormData();
  body.append('file', {
    uri: media.uri,
    name: media.name,
    type: media.mimeType,
  } as any);
  body.append('upload_preset', cloudinary.uploadPreset);

  const response = await fetch(endpoint, {
    method: 'POST',
    body,
  });

  const payload = await response.json();
  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw new Error(payload?.error?.message || 'Échec de l’envoi du média.');
  }

  return {
    ...media,
    secureUrl: String(payload.secure_url),
    publicId: String(payload.public_id),
    resourceType,
  };
}


export async function pickGroupPhoto(): Promise<PickedMedia | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Autorisation de la galerie refusée.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.9,
    allowsEditing: true,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `group-${Date.now()}.jpg`,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
    kind: 'image',
  };
}

export async function uploadAudioRecording(uri: string, durationSeconds?: number): Promise<UploadedMedia> {
  const media: PickedMedia = {
    uri,
    name: `voice-${Date.now()}.m4a`,
    mimeType: 'audio/mp4',
    kind: 'audio',
  };
  return uploadToCloudinary(media);
}
