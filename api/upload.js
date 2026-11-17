import { put } from '@vercel/blob';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-password'] !== process.env.APP_PASSWORD) return res.status(401).json({ error: 'Špatné heslo' });
  try {
    const { dataUrl, name } = req.body;
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    const blob = await put(`posts/${Date.now()}-${name}.jpg`, buf, { access: 'public', contentType: 'image/jpeg' });
    res.json({ url: blob.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
