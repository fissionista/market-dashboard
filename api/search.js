function inferCountry(item) {
  const symbol = String(item.symbol || '');
  const exchange = String(item.exchDisp || item.exchange || '').toLowerCase();
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || exchange.includes('korea') || exchange.includes('kosdaq')) return 'KR';
  if (exchange.includes('nasdaq') || exchange.includes('nyse') || exchange.includes('amex') || exchange.includes('us')) return 'US';
  return 'ETC';
}

const ALIASES = [
  ['삼성전자', '005930.KS', '삼성전자', 'Korea', 'KR', '반도체 메모리 dram hbm'],
  ['삼전', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['삼성전자우', '005935.KS', '삼성전자우', 'Korea', 'KR'],
  ['sk하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR', '반도체 메모리 hbm dram'],
  ['하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['한미반도체', '042700.KS', '한미반도체', 'Korea', 'KR', '반도체 hbm 장비'],
  ['원익ips', '240810.KQ', '원익IPS', 'Korea', 'KR', '반도체 장비'],
  ['삼성전기', '009150.KS', '삼성전기', 'Korea', 'KR', 'mlcc 기판'],
  ['이수페타시스', '007660.KS', '이수페타시스', 'Korea', 'KR', '기판 ai mlcc'],
  ['hd현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR', '전력 변압기'],
  ['현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['효성중공업', '298040.KS', '효성중공업', 'Korea', 'KR', '전력 변압기'],
  ['ls electric', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR', '전력 배전'],
  ['ls일렉트릭', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['두산에너빌리티', '034020.KS', '두산에너빌리티', 'Korea', 'KR', '원전 에너지 smr'],
  ['현대건설', '000720.KS', '현대건설', 'Korea', 'KR', '원전 건설'],
  ['한전kps', '051600.KS', '한전KPS', 'Korea', 'KR', '원전 정비'],
  ['oci홀딩스', '010060.KS', 'OCI홀딩스', 'Korea', 'KR', '태양광 폴리실리콘'],
  ['네이버', '035420.KS', 'NAVER', 'Korea', 'KR'],
  ['카카오', '035720.KS', '카카오', 'Korea', 'KR'],
  ['현대차', '005380.KS', '현대차', 'Korea', 'KR'],
  ['기아', '000270.KS', '기아', 'Korea', 'KR'],
  ['셀트리온', '068270.KS', '셀트리온', 'Korea', 'KR'],
  ['삼성바이오로직스', '207940.KS', '삼성바이오로직스', 'Korea', 'KR'],
  ['lg에너지솔루션', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['삼성sdi', '006400.KS', '삼성SDI', 'Korea', 'KR'],
  ['포스코홀딩스', '005490.KS', 'POSCO홀딩스', 'Korea', 'KR'],
  ['에코프로', '086520.KQ', '에코프로', 'Korea', 'KR'],
  ['에코프로비엠', '247540.KQ', '에코프로비엠', 'Korea', 'KR'],
  ['한화에어로스페이스', '012450.KS', '한화에어로스페이스', 'Korea', 'KR'],
  ['한국항공우주', '047810.KS', '한국항공우주', 'Korea', 'KR'],
  ['lig넥스원', '079550.KS', 'LIG넥스원', 'Korea', 'KR'],
  ['로보티즈', '108490.KQ', '로보티즈', 'Korea', 'KR'],
  ['레인보우로보틱스', '277810.KQ', '레인보우로보틱스', 'Korea', 'KR'],
  ['두산로보틱스', '454910.KS', '두산로보틱스', 'Korea', 'KR'],
  ['엔비디아', 'NVDA', 'NVIDIA', 'Nasdaq', 'US', 'ai gpu'],
  ['마이크론', 'MU', 'Micron Technology', 'Nasdaq', 'US', 'memory dram'],
  ['팔란티어', 'PLTR', 'Palantir', 'Nasdaq', 'US', 'ai software'],
  ['테슬라', 'TSLA', 'Tesla', 'Nasdaq', 'US'],
  ['애플', 'AAPL', 'Apple', 'Nasdaq', 'US'],
  ['마이크로소프트', 'MSFT', 'Microsoft', 'Nasdaq', 'US'],
  ['아마존', 'AMZN', 'Amazon', 'Nasdaq', 'US'],
  ['메타', 'META', 'Meta Platforms', 'Nasdaq', 'US'],
  ['구글', 'GOOGL', 'Alphabet', 'Nasdaq', 'US'],
  ['알파벳', 'GOOGL', 'Alphabet', 'Nasdaq', 'US'],
  ['브로드컴', 'AVGO', 'Broadcom', 'Nasdaq', 'US'],
  ['버티브', 'VRT', 'Vertiv', 'NYSE', 'US'],
  ['루멘텀', 'LITE', 'Lumentum', 'Nasdaq', 'US'],
  ['코히런트', 'COHR', 'Coherent', 'NYSE', 'US'],
  ['아이렌', 'IREN', 'IREN', 'Nasdaq', 'US'],
  ['로켓랩', 'RKLB', 'Rocket Lab', 'Nasdaq', 'US'],
  ['아이온큐', 'IONQ', 'IonQ', 'NYSE', 'US'],
].map(([key, symbol, name, exchange, country, tags = '']) => ({ key, symbol, name, exchange, country, tags }));

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '');
}

function uniqueBySymbol(items) {
  return items.filter((x, i, arr) => arr.findIndex((y) => String(y.symbol).toUpperCase() === String(x.symbol).toUpperCase()) === i);
}

function localMatches(q) {
  const lower = norm(q);
  return uniqueBySymbol(ALIASES.filter((x) => {
    const key = norm(x.key);
    const name = norm(x.name);
    const symbol = String(x.symbol || '').toLowerCase();
    const tags = norm(x.tags);
    return key.includes(lower) || lower.includes(key) || name.includes(lower) || lower.includes(name) || symbol.includes(lower) || tags.includes(lower);
  }));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = String(req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'q required' });
    return;
  }

  const local = localMatches(q);
  try {
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
    res.status(200).json({ results: uniqueBySymbol([...local, ...results]) });
  } catch (error) {
    res.status(local.length ? 200 : 502).json({ error: String(error?.message || error), results: local });
  }
}
