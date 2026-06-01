import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadFile(file, dir) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${dir}/${Date.now()}_${safeName}`;
  const r = ref(storage, path);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  return {
    id: path,
    name: file.name,
    url,
    path,
    size: file.size,
    contentType: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

export const deleteFile = (path) =>
  deleteObject(ref(storage, path)).catch(() => {});
