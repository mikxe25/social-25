const G = 'https://graph.facebook.com/v21.0';

async function call(path, body) {
  const r = await fetch(`${G}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
}

async function waitReady(id, token) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${G}/${id}?fields=status_code&access_token=${token}`);
    const j = await r.json();
    if (j.status_code === 'FINISHED') return;
    if (j.status_code === 'ERROR') throw new Error('Instagram nezpracoval obrázek');
    await new Promise(r => setTimeout(r, 1500));
  }
}

async function publishInstagram(urls, caption) {
  const token = process.env.PAGE_TOKEN;
  const ig = process.env.IG_USER_ID;
  const children = [];
  for (const url of urls) {
    const c = await call(`${ig}/media`, { image_url: url, is_carousel_item: true, access_token: token });
    children.push(c.id);
  }
  const parent = urls.length === 1
    ? await call(`${ig}/media`, { image_url: urls[0], caption, access_token: token })
    : await call(`${ig}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token });
  await waitReady(parent.id, token);
  return call(`${ig}/media_publish`, { creation_id: parent.id, access_token: token });
}

async function publishFacebook(urls, caption) {
  const token = process.env.PAGE_TOKEN;
  const page = process.env.PAGE_ID;
  const ids = [];
  for (const url of urls) {
    const p = await call(`${page}/photos`, { url, published: false, access_token: token });
    ids.push({ media_fbid: p.id });
  }
  return call(`${page}/feed`, { message: caption, attached_media: ids, access_token: token });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers['x-password'] !== process.env.APP_PASSWORD) return res.status(401).json({ error: 'Špatné heslo' });
  const { urls, caption, facebook, instagram } = req.body;
  const out = {};
  if (instagram) {
    try { await publishInstagram(urls, caption); out.instagram = 'ok'; }
    catch (e) { out.instagram = 'Chyba: ' + e.message; }
  }
  if (facebook) {
    try { await publishFacebook(urls, caption); out.facebook = 'ok'; }
    catch (e) { out.facebook = 'Chyba: ' + e.message; }
  }
  res.json(out);
}
