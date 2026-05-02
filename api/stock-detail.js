import {
  analyzeKoreanStock,
  getMarketEnvironment,
  getSectorStrength,
} from './lib/korea-analysis.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const raw = String(req.query.code || req.query.symbol || '').toUpperCase();
  const code = raw.replace(/\.(KS|KQ)$/i, '').replace(/\D/g, '').slice(0, 6);
  const name = String(req.query.name || code || '').trim();
  // 호출자가 시장을 알려주면 (KOSPI200/KOSDAQ150/KOSDAQ/KQ) 페널티 정확히 적용
  const market = String(req.query.market || '').trim();
  // .KQ 표기로 호출하면 자동 KOSDAQ 인식
  const inferredMarket = market || (raw.endsWith('.KQ') ? 'KOSDAQ' : 'KOSPI');

  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'valid Korean stock code required' });
    return;
  }

  try {
    const [marketEnv, sectorStrength] = await Promise.all([
      getMarketEnvironment(),
      getSectorStrength(),
    ]);
    const detail = await analyzeKoreanStock({
      code,
      name,
      market: inferredMarket,
      source: 'stock-detail',
    }, {
      includeFinance: true,
      marketEnv,
      sectorStrength,
    });
    if (detail.excluded) {
      res.status(200).json({ ...detail, marketEnv, sectorStrength, detailAvailable: false });
      return;
    }
    res.status(200).json({ ...detail, marketEnv, sectorStrength, detailAvailable: true });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
