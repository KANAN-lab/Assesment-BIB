/**
 * Service untuk mengunggah berkas secara otomatis & terprogram langsung ke Google Drive
 * Menggunakan arsitektur Gateway Google Apps Script dengan User-Bound Folder Provisioning.
 *
 * Target Root Folder ID: 16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr
 */

import imageCompression from 'browser-image-compression';
import { SystemConfigService } from '../domain/SystemConfigService';

export const DEFAULT_GDRIVE_ROOT_FOLDER_ID = '16p6cnEb7o6zOF2jFcPm3z7Md-Utntrkr';
export const GDRIVE_TARGET_FOLDER_ID = DEFAULT_GDRIVE_ROOT_FOLDER_ID;
export const GDRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_GDRIVE_ROOT_FOLDER_ID}`;

// Endpoint WebApp Google Apps Script dari .env / SystemConfig
export const GDRIVE_WEBHOOK_URL = import.meta.env.VITE_GDRIVE_UPLOAD_WEBHOOK || '';

export type GDriveModuleCategory =
  | 'Laporan_Insiden'
  | 'Safety_Patrol'
  | 'Foto_Profil'
  | 'SIO_MHE'
  | 'Kaizen_Inovasi'
  | 'Audit_5R_5S'
  | 'Dokumen_SOP'
  | 'Katalog_Reward'
  | string;

export interface GDriveUploadOptions {
  workerId?: string;
  workerName?: string;
  moduleCategory?: GDriveModuleCategory;
  customFilename?: string;
  rootFolderId?: string;
  compressImage?: boolean;
}

export interface GDriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  directUrl?: string;
  userFolderUrl?: string;
  targetFolderUrl?: string;
  folderPath?: string;
  error?: string;
}

/**
 * Mengonversi File / Blob menjadi Base64 string (clean format)
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || result;
      resolve(base64Data);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Kompresi gambar client-side HD otomatis untuk menghemat bandwidth gudang & kuota Drive
 */
export async function compressImageIfAppropriate(file: File): Promise<File | Blob> {
  if (!file.type.startsWith('image/')) return file;
  // Jika file sudah kecil (<= 300KB), tidak perlu dikompresi lagi
  if (file.size <= 300 * 1024) return file;

  try {
    const options = {
      maxSizeMB: 0.35, // Target ~350 KB
      maxWidthOrHeight: 1600, // HD resolution
      useWebWorker: true,
    };
    return await imageCompression(file, options);
  } catch (err) {
    console.warn('[GDrive Service] Kompresi gambar dilewati, menggunakan file asli:', err);
    return file;
  }
}

/**
 * Mengunggah berkas secara otomatis & terprogram ke Google Drive
 * Mendukung pembagian folder otomatis per user (User-Bound Directory) dan per modul.
 */
export async function uploadFileToGoogleDrive(
  file: File,
  optionsOrFilename?: string | GDriveUploadOptions,
  legacyFolderId?: string
): Promise<GDriveUploadResult> {
  let workerId = 'GENERAL';
  let workerName = 'Pekerja';
  let moduleCategory: GDriveModuleCategory = 'General_Uploads';
  let customFilename: string | undefined = undefined;
  let rootFolderId = legacyFolderId;
  let compressImage = true;

  if (typeof optionsOrFilename === 'string') {
    customFilename = optionsOrFilename;
  } else if (typeof optionsOrFilename === 'object' && optionsOrFilename !== null) {
    workerId = optionsOrFilename.workerId || workerId;
    workerName = optionsOrFilename.workerName || workerName;
    moduleCategory = optionsOrFilename.moduleCategory || moduleCategory;
    customFilename = optionsOrFilename.customFilename;
    rootFolderId = optionsOrFilename.rootFolderId || rootFolderId;
    if (optionsOrFilename.compressImage !== undefined) {
      compressImage = optionsOrFilename.compressImage;
    }
  }

  const timestamp = Date.now();
  const cleanCategory = moduleCategory.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename =
    customFilename ||
    `DAM_${cleanCategory}_${workerId}_${timestamp}.${file.name.split('.').pop() || 'jpg'}`;

  try {
    // 1. Kompresi gambar jika tipe image
    let fileToUpload: File | Blob = file;
    if (compressImage) {
      fileToUpload = await compressImageIfAppropriate(file);
    }

    // 2. Encode ke Base64
    const base64Data = await fileToBase64(fileToUpload);

    // 3. Baca konfigurasi dinamis
    const config = SystemConfigService.getConfig();
    const effectiveRootId =
      rootFolderId || config.gdriveTargetFolderId || DEFAULT_GDRIVE_ROOT_FOLDER_ID;
    const webhookUrl =
      config.gdriveWebhookUrl || import.meta.env.VITE_GDRIVE_UPLOAD_WEBHOOK || GDRIVE_WEBHOOK_URL;

    const payload = JSON.stringify({
      rootFolderId: effectiveRootId,
      folderId: effectiveRootId,
      workerId,
      workerName,
      moduleCategory,
      filename,
      mimeType: file.type || 'image/jpeg',
      base64Data,
    });

    if (webhookUrl && webhookUrl.startsWith('http')) {
      // Mengirimkan POST ke Google Apps Script WebApp dengan header text/plain (CORS safe)
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: payload,
      });

      if (response.ok) {
        const text = await response.text();
        let parsed: any = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { status: 'success' };
        }

        if (parsed.status === 'success' || parsed.fileId) {
          const fileId = parsed.fileId || `gdrive_${timestamp}`;
          const webViewLink =
            parsed.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
          const directUrl =
            parsed.directUrl || `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;

          return {
            success: true,
            fileId,
            webViewLink,
            directUrl,
            userFolderUrl: parsed.userFolderUrl || `https://drive.google.com/drive/folders/${effectiveRootId}`,
            targetFolderUrl: parsed.targetFolderUrl || `https://drive.google.com/drive/folders/${effectiveRootId}`,
            folderPath: parsed.folderPath || `${workerName} > ${moduleCategory}`,
          };
        } else if (parsed.message || parsed.status === 'error') {
          const errMsg = parsed.message || 'Gagal menyimpan ke Google Drive (Status error).';
          console.warn('[GDrive WebApp Error]', errMsg);
          throw new Error(errMsg);
        }
      }
    }

    // Jika WebApp belum diatur
    throw new Error('Google Drive Webhook belum dikonfigurasi.');
  } catch (err: any) {
    console.warn('Google Drive WebApp upload result exception:', err);
    return {
      success: false,
      error: err?.message || String(err),
      fileId: `gdrive_err_${timestamp}`,
      webViewLink: GDRIVE_FOLDER_URL,
    };
  }
}

/**
 * Mengonversi link Google Drive (view, open, sharing, lh3) menjadi thumbnail/image URL
 * yang valid dan kompatibel secara native dengan tag <img> HTML.
 */
export function formatGoogleDriveImageUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Jika berupa data: atau blob: atau URL http biasa non-drive
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Ekstrak ID file Google Drive dari berbagai variasi URL
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  const matchLh3 = trimmed.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  const matchThumbnail = trimmed.match(/\/thumbnail\?id=([a-zA-Z0-9_-]+)/);

  const fileId = matchFileD?.[1] || matchIdParam?.[1] || matchLh3?.[1] || matchThumbnail?.[1];

  if (fileId) {
    // Thumbnail CDN resolusi tinggi (w1600) paling stabil dan tidak terhalang auth cookie Google
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  return trimmed;
}

