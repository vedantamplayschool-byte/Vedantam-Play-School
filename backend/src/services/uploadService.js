import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const safeName = name => name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
const requestBaseUrl = req => env.publicApiUrl || `${req.protocol}://${req.get('host')}`;

export const uploadImage = async (file, folder = 'vedantam-play-school', req = null) => {
  if (!file) return null;
  if (!env.cloudinary.cloudName) {
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${safeName(file.originalname)}`;
    await fs.writeFile(path.join(uploadsDir, filename), file.buffer);
    const urlPath = `/uploads/${filename}`;
    return { url: req ? `${requestBaseUrl(req)}${urlPath}` : urlPath, publicId: null };
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (err, result) => err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }));
    stream.end(file.buffer);
  });
};
