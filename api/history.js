async function fetchSeries(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  return timestamps
    .map((ts, i) => ({ t: ts * 1000, close: closes[i] }))
    .filter((p) => Number.isFinite(p.close));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbols = String(req.query.symbols || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!symbols.length) {
    res.status(400).json({ error: 'symbols required' });
    return;
  }

  const series = {};
  const settled = await Promise.allSettled(symbols.map(async (symbol) => [symbol, await fetchSeries(symbol)]));
  settled.forEach((r) => {
    if (r.status === 'fulfilled') {
      const [symbol, rows] = r.value;
      series[symbol] = rows;
    }
  });

  res.status(200).json({ series });
}
