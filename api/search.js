function inferCountry(item) {
  const symbol = String(item.symbol || '');
  const exchange = String(item.exchDisp || item.exchange || '').toLowerCase();
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || exchange.includes('korea') || exchange.includes('kosdaq')) return 'KR';
  if (exchange.includes('nasdaq') || exchange.includes('nyse') || exchange.includes('amex') || exchange.includes('us')) return 'US';
  return 'ETC';
}

const ALIASES = [
  ['삼성전자', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['sk하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['한미반도체', '042700.KS', '한미반도체', 'Korea', 'KR'],
  ['두산에너빌리티', '034020.KS', '두산에너빌리티', 'Korea', 'KR'],
  ['한국전력', '015760.KS', '한국전력', 'Korea', 'KR'],
  ['현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['한화에어로스페이스', '012450.KS', '한화에어로스페이스', 'Korea', 'KR'],
  ['한국항공우주', '047810.KS', '한국항공우주', 'Korea', 'KR'],
  ['lig넥스원', '079550.KS', 'LIG넥스원', 'Korea', 'KR'],
  ['네이버', '035420.KS', 'NAVER', 'Korea', 'KR'],
  ['카카오', '035720.KS', '카카오', 'Korea', 'KR'],
  ['엔비디아', 'NVDA', 'NVIDIA', 'Nasdaq', 'US'],
  ['팔란티어', 'PLTR', 'Palantir', 'Nasdaq', 'US'],
  ['테슬라', 'TSLA', 'Tesla', 'Nasdaq', 'US'],
  ['애플', 'AAPL', 'Apple', 'Nasdaq', 'US'],
  ['마이크로소프트', 'MSFT', 'Microsoft', 'Nasdaq', 'US'],
  ['아마존', 'AMZN', 'Amazon', 'Nasdaq', 'US'],
  ['메타', 'META', 'Meta', 'Nasdaq', 'US'],
  ['구글', 'GOOGL', 'Alphabet', 'Nasdaq', 'US'],
].map(([key, symbol, name, exchange, country]) => ({ key, symbol, name, exchange, country }));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = String(req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'q required' });
    return;
  }

  try {
    const lower = q.toLowerCase();
    const local = ALIASES.filter((x) => x.key.includes(lower) || lower.includes(x.key));
    const yahooQuery = local[0]?.symbol || q;
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooQuery)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true`;
    const response = await fetch(url, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
      },
    });
    if (!response.ok) throw new Error(`Yahoo search ${response.status}`);
    const data = await response.json();
    const results = (data.quotes || [])
      .filter((x) => x.symbol && (x.quoteType === 'EQUITY' || x.quoteType === 'ETF' || x.quoteType === 'INDEX'))
      .map((x) => ({
        symbol: x.symbol,
        name: x.shortname || x.longname || x.symbol,
        exchange: x.exchDisp || x.exchange || '',
        country: inferCountry(x),
      }));
    const merged = [...local, ...results].filter((x, i, arr) => arr.findIndex((y) => y.symbol === x.symbol) === i);
    res.status(200).json({ results: merged });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error), results: [] });
  }
}
