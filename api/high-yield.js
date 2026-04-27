function parseNum(v) {
  const n = Number(String(v || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function getText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6500),
    headers: {
      accept: 'text/csv,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  });
  if (!res.ok) throw new Error(`FRED ${res.status}`);
  return res.text();
}

async function getFredSeries(id) {
  const csv = await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`);
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, value] = line.split(',');
      const close = parseNum(value);
      return close == null || close <= 0 ? null : { t: new Date(date).getTime(), close, date };
    })
    .filter(Boolean)
    .slice(-180);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const series = await getFredSeries('BAMLH0A0HYM2');
    const last = series.at(-1);
    res.status(200).json(last ? { latest: last.close, asOf: last.date, series } : null);
  } catch (error) {
    res.status(200).json(null);
  }
}
