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
  const quote = result?.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];
  return timestamps
    .map((ts, i) => ({
      t: ts * 1000,
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
      volume: volumes[i],
    }))
    .filter((p) => Number.isFinite(p.close));
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.replace(/^"|"$/g, '').trim());
}

function stooqSymbol(symbol) {
  const s = String(symbol || '').trim().toLowerCase();
  if (/^\d{6}(\.ks|\.kq)?$/i.test(s)) return `${s.replace(/\.(ks|kq)$/i, '')}.kr`;
  if (s.includes('.')) return s;
  if (/^[a-z]+$/.test(s)) return `${s}.us`;
  return s;
}

async function fetchStooqSeries(symbol) {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol(symbol))}&d1=${ymd(start)}&d2=${ymd(end)}&i=d`;
  const res = await fetch(url, { headers: { accept: 'text/csv,*/*', 'user-agent': 'Mozilla/5.0 market-dashboard/1.0' } });
  if (!res.ok) return [];
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || /^No data/i.test(lines[0])) return [];
  return lines.slice(1).map((line) => {
    const [date, open, high, low, close, volume] = parseCsvLine(line);
    return {
      t: new Date(`${date}T00:00:00Z`).getTime(),
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close),
      volume: Number(volume),
    };
  }).filter((p) => Number.isFinite(p.close));
}

async function fetchNaverSeries(symbol) {
  const code = String(symbol || '').toUpperCase().replace(/\.(KS|KQ)$/i, '');
  if (!/^\d{6}$/.test(code)) return [];
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const url = `https://api.finance.naver.com/siseJson.naver?symbol=${code}&requestType=1&startTime=${ymd(start)}&endTime=${ymd(end)}&timeframe=day`;
  const res = await fetch(url, { headers: { accept: 'text/plain,*/*', 'user-agent': 'Mozilla/5.0 market-dashboard/1.0' } });
  if (!res.ok) return [];
  const text = await res.text();
  const rows = [...text.matchAll(/\["(\d{8})",\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/g)];
  return rows.map((m) => ({
    t: new Date(`${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}T00:00:00Z`).getTime(),
    close: Number(m[2]),
    open: Number(m[3]),
    high: Number(m[4]),
    low: Number(m[5]),
    volume: Number(m[6]),
  })).filter((p) => Number.isFinite(p.close));
}

function historyCandidates(symbol) {
  const s = String(symbol || '').trim().toUpperCase();
  if (/^\d{6}$/.test(s)) return [s, `${s}.KS`, `${s}.KQ`];
  return [s];
}

async function fetchSeriesWithFallback(symbol) {
  for (const candidate of historyCandidates(symbol)) {
    const rows = await fetchSeries(candidate);
    if (rows.length) return rows;
  }
  const naverRows = await fetchNaverSeries(symbol);
  if (naverRows.length) return naverRows;
  const stooqRows = await fetchStooqSeries(symbol);
  if (stooqRows.length) return stooqRows;
  return [];
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
  const settled = await Promise.allSettled(symbols.map(async (symbol) => [symbol, await fetchSeriesWithFallback(symbol)]));
  settled.forEach((r) => {
    if (r.status === 'fulfilled') {
      const [symbol, rows] = r.value;
      series[symbol] = rows;
    }
  });

  res.status(200).json({ series });
}
