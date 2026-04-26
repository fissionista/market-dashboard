function inferCountry(item) {
  const symbol = String(item.symbol || '');
  const exchange = String(item.exchDisp || item.exchange || '').toLowerCase();
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || exchange.includes('korea') || exchange.includes('kosdaq')) return 'KR';
  if (exchange.includes('nasdaq') || exchange.includes('nyse') || exchange.includes('amex') || exchange.includes('us')) return 'US';
  return 'ETC';
}

const ALIASES = [
  ['삼성전자', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['삼전', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['삼성', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['삼성전자우', '005935.KS', '삼성전자우', 'Korea', 'KR'],
  ['sk하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['에스케이하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['한미반도체', '042700.KS', '한미반도체', 'Korea', 'KR'],
  ['두산에너빌리티', '034020.KS', '두산에너빌리티', 'Korea', 'KR'],
  ['두산에너', '034020.KS', '두산에너빌리티', 'Korea', 'KR'],
  ['한국전력', '015760.KS', '한국전력', 'Korea', 'KR'],
  ['한전', '015760.KS', '한국전력', 'Korea', 'KR'],
  ['현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['hd현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['hd현대', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['ls', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['ls일렉트릭', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['ls electric', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['엘에스일렉트릭', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['ls전선', '006260.KS', 'LS', 'Korea', 'KR'],
  ['한화에어로스페이스', '012450.KS', '한화에어로스페이스', 'Korea', 'KR'],
  ['한화에어로', '012450.KS', '한화에어로스페이스', 'Korea', 'KR'],
  ['한국항공우주', '047810.KS', '한국항공우주', 'Korea', 'KR'],
  ['kai', '047810.KS', '한국항공우주', 'Korea', 'KR'],
  ['lig넥스원', '079550.KS', 'LIG넥스원', 'Korea', 'KR'],
  ['넥스원', '079550.KS', 'LIG넥스원', 'Korea', 'KR'],
  ['네이버', '035420.KS', 'NAVER', 'Korea', 'KR'],
  ['naver', '035420.KS', 'NAVER', 'Korea', 'KR'],
  ['카카오', '035720.KS', '카카오', 'Korea', 'KR'],
  ['현대차', '005380.KS', '현대차', 'Korea', 'KR'],
  ['기아', '000270.KS', '기아', 'Korea', 'KR'],
  ['셀트리온', '068270.KS', '셀트리온', 'Korea', 'KR'],
  ['삼성바이오로직스', '207940.KS', '삼성바이오로직스', 'Korea', 'KR'],
  ['삼바', '207940.KS', '삼성바이오로직스', 'Korea', 'KR'],
  ['lg에너지솔루션', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['엘지에너지솔루션', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['lg엔솔', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['lg화학', '051910.KS', 'LG화학', 'Korea', 'KR'],
  ['포스코홀딩스', '005490.KS', 'POSCO홀딩스', 'Korea', 'KR'],
  ['posco', '005490.KS', 'POSCO홀딩스', 'Korea', 'KR'],
  ['포스코퓨처엠', '003670.KS', '포스코퓨처엠', 'Korea', 'KR'],
  ['에코프로비엠', '247540.KQ', '에코프로비엠', 'Korea', 'KR'],
  ['에코프로', '086520.KQ', '에코프로', 'Korea', 'KR'],
  ['알테오젠', '196170.KQ', '알테오젠', 'Korea', 'KR'],
  ['레인보우로보틱스', '277810.KQ', '레인보우로보틱스', 'Korea', 'KR'],
  ['로보티즈', '108490.KQ', '로보티즈', 'Korea', 'KR'],
  ['두산로보틱스', '454910.KS', '두산로보틱스', 'Korea', 'KR'],
  ['카카오뱅크', '323410.KS', '카카오뱅크', 'Korea', 'KR'],
  ['크래프톤', '259960.KS', '크래프톤', 'Korea', 'KR'],
  ['하이브', '352820.KS', '하이브', 'Korea', 'KR'],
  ['삼성sdi', '006400.KS', '삼성SDI', 'Korea', 'KR'],
  ['삼성전기', '009150.KS', '삼성전기', 'Korea', 'KR'],
  ['현대로템', '064350.KS', '현대로템', 'Korea', 'KR'],
  ['hd현대중공업', '329180.KS', 'HD현대중공업', 'Korea', 'KR'],
  ['현대중공업', '329180.KS', 'HD현대중공업', 'Korea', 'KR'],
  ['hd한국조선해양', '009540.KS', 'HD한국조선해양', 'Korea', 'KR'],
  ['한국조선해양', '009540.KS', 'HD한국조선해양', 'Korea', 'KR'],
  ['kb금융', '105560.KS', 'KB금융', 'Korea', 'KR'],
  ['신한지주', '055550.KS', '신한지주', 'Korea', 'KR'],
  ['하나금융지주', '086790.KS', '하나금융지주', 'Korea', 'KR'],
  ['우리금융지주', '316140.KS', '우리금융지주', 'Korea', 'KR'],
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
    const lower = q.toLowerCase().replace(/\s+/g, '');
    const local = ALIASES.filter((x) => {
      const key = x.key.toLowerCase().replace(/\s+/g, '');
      const name = x.name.toLowerCase().replace(/\s+/g, '');
      const symbol = x.symbol.toLowerCase();
      return key.includes(lower) || lower.includes(key) || name.includes(lower) || lower.includes(name) || symbol.includes(lower);
    });
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
