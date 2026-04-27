const FIELDS = [
  'regularMarketPrice',
  'regularMarketPreviousClose',
  'regularMarketChangePercent',
  'fiftyTwoWeekHigh',
  'fiftyTwoWeekLow',
  'currency',
  'shortName',
  'trailingPE',
  'forwardPE',
  'priceToSalesTrailing12Months',
  'trailingEps',
  'forwardEps',
  'earningsQuarterlyGrowth',
  'revenueGrowth',
].join(',');

async function fetchYahoo(symbols) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.map(encodeURIComponent).join(',')}&fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  });
  if (!res.ok) throw new Error(`Yahoo quote ${res.status}`);
  return res.json();
}

async function fetchChart(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  const prev = meta.regularMarketPreviousClose || meta.previousClose || meta.chartPreviousClose;
  return {
    symbol,
    regularMarketPrice: meta.regularMarketPrice,
    regularMarketPreviousClose: prev || null,
    regularMarketChangePercent: prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
    currency: meta.currency || 'USD',
    shortName: symbol,
  };
}

async function fetchFallback(symbols) {
  const rows = [];
  for (let i = 0; i < symbols.length; i += 8) {
    const batch = symbols.slice(i, i + 8);
    const settled = await Promise.allSettled(batch.map(fetchChart));
    settled.forEach((r) => {
      if (r.status === 'fulfilled' && r.value) rows.push(r.value);
    });
  }
  return { quoteResponse: { result: rows } };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const raw = String(req.query.symbols || '');
  const symbols = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 80);

  if (!symbols.length) {
    res.status(400).json({ error: 'symbols required' });
    return;
  }

  try {
    const data = await fetchYahoo(symbols);
    const rows = data?.quoteResponse?.result || [];
    if (rows.length) {
      res.status(200).json({ quoteResponse: { result: rows.map(normalizeQuote) } });
      return;
    }
  } catch {}

  try {
    res.status(200).json(await fetchFallback(symbols));
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}

function normalizeQuote(q) {
  return {
    ...q,
    regularMarketPrice: q.regularMarketPrice ?? null,
    regularMarketPreviousClose: q.regularMarketPreviousClose ?? null,
    regularMarketChangePercent: q.regularMarketChangePercent ?? null,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || q.regularMarketPrice || null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow || null,
    currency: q.currency || 'USD',
    shortName: q.shortName || q.symbol,
  };
}
