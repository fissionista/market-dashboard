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
  const res = await fetch(url, { headers: yahooHeaders() });
  if (!res.ok) throw new Error(`Yahoo quote ${res.status}`);
  return res.json();
}

async function fetchChart(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, { headers: yahooHeaders() });
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

function raw(v) {
  return v && typeof v === 'object' && 'raw' in v ? v.raw : v;
}

async function fetchFundamentals(symbol) {
  const modules = 'summaryDetail,defaultKeyStatistics,financialData';
  const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const url = `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
      const res = await fetch(url, { headers: yahooHeaders() });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.quoteSummary?.result?.[0];
      const parsed = parseQuoteSummary(r);
      if (hasFundamental(parsed)) return parsed;
    } catch {}
  }
  return fetchYahooPageFundamentals(symbol);
}

async function enrichFundamentals(rows) {
  const targets = rows
    .filter((r) => r?.symbol && r.regularMarketPrice != null && r.trailingPE == null && r.forwardPE == null)
    .slice(0, 30);
  for (let i = 0; i < targets.length; i += 6) {
    const settled = await Promise.allSettled(targets.slice(i, i + 6).map((r) => fetchFundamentals(r.symbol)));
    settled.forEach((s, idx) => {
      if (s.status !== 'fulfilled' || !s.value) return;
      const row = targets[i + idx];
      Object.entries(s.value).forEach(([k, v]) => {
        if (row[k] == null && v != null) row[k] = v;
      });
    });
  }
  return rows;
}

function koreanCode(symbol) {
  const code = String(symbol || '').toUpperCase().replace(/\.(KS|KQ)$/i, '');
  return /^\d{6}$/.test(code) ? code : '';
}

async function fetchNaverSummary(symbol) {
  const code = koreanCode(symbol);
  if (!code) return null;
  try {
    const url = `https://api.finance.naver.com/service/itemSummary.naver?itemcode=${code}`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        referer: `https://finance.naver.com/item/main.naver?code=${code}`,
        'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const now = Number(data.now);
    const diff = Number(data.diff);
    const rate = Number(data.rate);
    const per = Number(data.per);
    const eps = Number(data.eps);
    const pbr = Number(data.pbr);
    const marketSum = Number(data.marketSum);
    const finance = await fetchNaverFinance(code);
    const ps = Number.isFinite(marketSum) && finance.revenueLatest ? marketSum / (finance.revenueLatest * 100) : null;
    return {
      symbol,
      regularMarketPrice: Number.isFinite(now) ? now : null,
      regularMarketPreviousClose: Number.isFinite(now) && Number.isFinite(diff) ? now - diff : null,
      regularMarketChangePercent: Number.isFinite(rate) ? rate : null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      currency: 'KRW',
      shortName: symbol,
      trailingPE: Number.isFinite(per) && per > 0 ? per : null,
      forwardPE: null,
      trailingEps: Number.isFinite(eps) ? eps : null,
      forwardEps: null,
      priceToBook: Number.isFinite(pbr) && pbr > 0 ? pbr : null,
      priceToSalesTrailing12Months: Number.isFinite(ps) && ps > 0 ? ps : null,
      earningsQuarterlyGrowth: finance.earningsGrowth,
      revenueGrowth: finance.revenueGrowth,
      operatingIncomeGrowth: finance.earningsGrowth,
      revenueLatest: finance.revenueLatest,
      operatingIncomeLatest: finance.operatingIncomeLatest,
      marketSum,
    };
  } catch {
    return null;
  }
}

function naverNumber(value) {
  if (value == null || value === '-' || value === '') return null;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function naverFinanceRow(rows, title) {
  return rows.find((r) => String(r.title || '').replace(/\s/g, '').includes(title));
}

function valuesByActualPeriod(finance, rowTitle) {
  const titles = finance?.financeInfo?.trTitleList || [];
  const row = naverFinanceRow(finance?.financeInfo?.rowList || [], rowTitle);
  if (!row) return [];
  return titles
    .filter((t) => t.isConsensus !== 'Y')
    .map((t) => ({ key: t.key, value: naverNumber(row.columns?.[t.key]?.value) }))
    .filter((x) => x.value != null)
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function growthFrom(values) {
  if (!values || values.length < 2) return null;
  const prev = values.at(-2).value;
  const last = values.at(-1).value;
  if (!Number.isFinite(prev) || !prev || !Number.isFinite(last)) return null;
  return (last - prev) / Math.abs(prev);
}

async function fetchNaverFinance(code) {
  const empty = {
    revenueGrowth: null,
    earningsGrowth: null,
    revenueLatest: null,
    operatingIncomeLatest: null,
  };
  try {
    const url = `https://m.stock.naver.com/api/stock/${code}/finance/annual`;
    const res = await fetch(url, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        referer: `https://m.stock.naver.com/domestic/stock/${code}/finance`,
        'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
      },
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const revenues = valuesByActualPeriod(data, '매출액');
    const profits = valuesByActualPeriod(data, '영업이익');
    const revenueLatest = revenues.at(-1)?.value ?? null;
    const operatingIncomeLatest = profits.at(-1)?.value ?? null;
    return {
      revenueGrowth: growthFrom(revenues),
      earningsGrowth: growthFrom(profits),
      revenueLatest,
      operatingIncomeLatest,
    };
  } catch {
    return empty;
  }
}

async function enrichKoreanQuotes(rows, symbols) {
  const out = rows.map((r) => ({ ...r }));
  out.forEach((row) => {
    if (!koreanCode(row.symbol)) return;
    row.trailingPE = null;
    row.forwardPE = null;
    row.trailingEps = null;
    row.forwardEps = null;
    row.priceToSalesTrailing12Months = null;
    row.earningsQuarterlyGrowth = null;
    row.revenueGrowth = null;
  });
  const rowByCode = new Map(out.map((r) => [koreanCode(r.symbol), r]).filter(([code]) => code));
  const targets = [...new Set(symbols.map(koreanCode).filter(Boolean))].slice(0, 40);
  for (let i = 0; i < targets.length; i += 8) {
    const settled = await Promise.allSettled(targets.slice(i, i + 8).map((code) => fetchNaverSummary(code)));
    settled.forEach((s, idx) => {
      if (s.status !== 'fulfilled' || !s.value) return;
      const code = targets[i + idx];
      const row = rowByCode.get(code);
      if (row) {
        Object.entries(s.value).forEach(([k, v]) => {
          if (v == null || v === '') return;
          if (['trailingPE', 'trailingEps', 'priceToBook', 'priceToSalesTrailing12Months', 'earningsQuarterlyGrowth', 'revenueGrowth', 'operatingIncomeGrowth', 'revenueLatest', 'operatingIncomeLatest', 'marketSum', 'regularMarketPrice', 'regularMarketChangePercent', 'regularMarketPreviousClose'].includes(k)) row[k] = v;
          else if (row[k] == null || row[k] === '') row[k] = v;
        });
        row.currency = 'KRW';
      } else {
        out.push({ ...s.value, symbol: code });
      }
    });
  }
  return out;
}

function yahooHeaders() {
  return {
    accept: 'application/json,text/html,text/plain,*/*',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
  };
}

function parseQuoteSummary(r) {
  if (!r) return null;
  return {
    trailingPE: raw(r.summaryDetail?.trailingPE) ?? raw(r.defaultKeyStatistics?.trailingPE) ?? null,
    forwardPE: raw(r.summaryDetail?.forwardPE) ?? raw(r.defaultKeyStatistics?.forwardPE) ?? null,
    priceToSalesTrailing12Months: raw(r.summaryDetail?.priceToSalesTrailing12Months) ?? raw(r.defaultKeyStatistics?.priceToSalesTrailing12Months) ?? null,
    trailingEps: raw(r.defaultKeyStatistics?.trailingEps) ?? null,
    forwardEps: raw(r.defaultKeyStatistics?.forwardEps) ?? null,
    earningsQuarterlyGrowth: raw(r.defaultKeyStatistics?.earningsQuarterlyGrowth) ?? null,
    revenueGrowth: raw(r.financialData?.revenueGrowth) ?? null,
  };
}

function hasFundamental(v) {
  return !!v && Object.values(v).some((x) => x != null && Number.isFinite(Number(x)));
}

function firstJsonNumber(html, keys) {
  for (const key of keys) {
    const patterns = [
      new RegExp(`data-value="(-?\\d+(?:\\.\\d+)?)"[^>]*data-field="${key}"`, 'i'),
      new RegExp(`data-field="${key}"[^>]*data-value="(-?\\d+(?:\\.\\d+)?)"`, 'i'),
      new RegExp(`"${key}"\\s*:\\s*\\{\\s*"raw"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
      new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
      new RegExp(`\\\\"${key}\\\\"\\s*:\\s*\\{\\s*\\\\"raw\\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
      new RegExp(`\\\\"${key}\\\\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

async function fetchYahooPageFundamentals(symbol) {
  try {
    const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
    const res = await fetch(url, { headers: yahooHeaders() });
    if (!res.ok) return null;
    const html = await res.text();
    const parsed = {
      trailingPE: firstJsonNumber(html, ['trailingPE', 'trailingPe', 'trailingPEValue']),
      forwardPE: firstJsonNumber(html, ['forwardPE', 'forwardPe']),
      priceToSalesTrailing12Months: firstJsonNumber(html, ['priceToSalesTrailing12Months', 'priceToSales']),
      trailingEps: firstJsonNumber(html, ['trailingEps', 'epsTrailingTwelveMonths']),
      forwardEps: firstJsonNumber(html, ['forwardEps']),
      earningsQuarterlyGrowth: firstJsonNumber(html, ['earningsQuarterlyGrowth']),
      revenueGrowth: firstJsonNumber(html, ['revenueGrowth']),
    };
    return hasFundamental(parsed) ? parsed : null;
  } catch {
    return null;
  }
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
      const enriched = await enrichKoreanQuotes(await enrichFundamentals(rows.map(normalizeQuote)), symbols);
      res.status(200).json({ quoteResponse: { result: enriched } });
      return;
    }
  } catch {}

  try {
    const fallback = await fetchFallback(symbols);
    const rows = fallback?.quoteResponse?.result || [];
    const enriched = await enrichKoreanQuotes(await enrichFundamentals(rows.map(normalizeQuote)), symbols);
    res.status(200).json({ quoteResponse: { result: enriched } });
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
