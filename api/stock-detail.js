import { analyzeKoreanStock } from './lib/korea-analysis.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const raw = String(req.query.code || req.query.symbol || '').toUpperCase();
  const code = raw.replace(/\.(KS|KQ)$/i, '').replace(/\D/g, '').slice(0, 6);
  const name = String(req.query.name || code || '').trim();

  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'valid Korean stock code required' });
    return;
  }

  try {
    const detail = await analyzeKoreanStock({
      code,
      name,
      market: 'KR',
      source: 'stock-detail',
    }, {
      includeFinance: true,
    });
    if (detail.excluded) {
      res.status(200).json({ ...detail, detailAvailable: false });
      return;
    }
    res.status(200).json({ ...detail, detailAvailable: true });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
