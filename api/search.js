function inferCountry(item) {
  const symbol = String(item.symbol || '');
  const exchange = String(item.exchDisp || item.exchange || '').toLowerCase();
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || exchange.includes('korea') || exchange.includes('kosdaq')) return 'KR';
  if (exchange.includes('nasdaq') || exchange.includes('nyse') || exchange.includes('amex') || exchange.includes('us')) return 'US';
  return 'ETC';
}

const LOCAL_ALIASES = [
  ['삼성전자', '005930.KS', '삼성전자', 'KOSPI', 'KR', '삼전 반도체 메모리 dram hbm'],
  ['삼전', '005930.KS', '삼성전자', 'KOSPI', 'KR', 'samsung electronics'],
  ['삼성전자우', '005935.KS', '삼성전자우', 'KOSPI', 'KR', '우선주'],
  ['SK하이닉스', '000660.KS', 'SK하이닉스', 'KOSPI', 'KR', '하이닉스 반도체 메모리 hbm dram'],
  ['하이닉스', '000660.KS', 'SK하이닉스', 'KOSPI', 'KR', 'sk hynix'],
  ['한미반도체', '042700.KS', '한미반도체', 'KOSPI', 'KR', '반도체 장비 hbm'],
  ['원익IPS', '240810.KQ', '원익IPS', 'KOSDAQ', 'KR', '원익ips 반도체 장비'],
  ['삼성전기', '009150.KS', '삼성전기', 'KOSPI', 'KR', 'mlcc 기판'],
  ['이수페타시스', '007660.KS', '이수페타시스', 'KOSPI', 'KR', '기판 ai mlcc'],
  ['HD현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'KOSPI', 'KR', '현대일렉트릭 전력 변압기'],
  ['현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'KOSPI', 'KR', '전력 변압기'],
  ['효성중공업', '298040.KS', '효성중공업', 'KOSPI', 'KR', '전력 변압기'],
  ['LS ELECTRIC', '010120.KS', 'LS ELECTRIC', 'KOSPI', 'KR', 'ls일렉트릭 전력 배전'],
  ['LS일렉트릭', '010120.KS', 'LS ELECTRIC', 'KOSPI', 'KR', 'ls electric'],
  ['두산에너빌리티', '034020.KS', '두산에너빌리티', 'KOSPI', 'KR', '원전 에너지 smr'],
  ['현대건설', '000720.KS', '현대건설', 'KOSPI', 'KR', '원전 건설'],
  ['한전KPS', '051600.KS', '한전KPS', 'KOSPI', 'KR', '원전 정비'],
  ['OCI홀딩스', '010060.KS', 'OCI홀딩스', 'KOSPI', 'KR', '태양광 폴리실리콘'],
  ['NAVER', '035420.KS', 'NAVER', 'KOSPI', 'KR', '네이버 플랫폼 ai'],
  ['네이버', '035420.KS', 'NAVER', 'KOSPI', 'KR', 'naver'],
  ['카카오', '035720.KS', '카카오', 'KOSPI', 'KR', '플랫폼'],
  ['현대차', '005380.KS', '현대차', 'KOSPI', 'KR', '자동차'],
  ['기아', '000270.KS', '기아', 'KOSPI', 'KR', '자동차'],
  ['셀트리온', '068270.KS', '셀트리온', 'KOSPI', 'KR', '바이오'],
  ['삼성바이오로직스', '207940.KS', '삼성바이오로직스', 'KOSPI', 'KR', '바이오 cdmo'],
  ['LG에너지솔루션', '373220.KS', 'LG에너지솔루션', 'KOSPI', 'KR', '2차전지 배터리'],
  ['삼성SDI', '006400.KS', '삼성SDI', 'KOSPI', 'KR', '2차전지 배터리'],
  ['POSCO홀딩스', '005490.KS', 'POSCO홀딩스', 'KOSPI', 'KR', '포스코 2차전지 철강'],
  ['에코프로', '086520.KQ', '에코프로', 'KOSDAQ', 'KR', '2차전지 양극재'],
  ['에코프로비엠', '247540.KQ', '에코프로비엠', 'KOSDAQ', 'KR', '2차전지 양극재'],
  ['한화에어로스페이스', '012450.KS', '한화에어로스페이스', 'KOSPI', 'KR', '방산 우주'],
  ['한국항공우주', '047810.KS', '한국항공우주', 'KOSPI', 'KR', '방산 우주 kai'],
  ['LIG넥스원', '079550.KS', 'LIG넥스원', 'KOSPI', 'KR', '방산'],
  ['로보티즈', '108490.KQ', '로보티즈', 'KOSDAQ', 'KR', '로봇'],
  ['레인보우로보틱스', '277810.KQ', '레인보우로보틱스', 'KOSDAQ', 'KR', '로봇'],
  ['두산로보틱스', '454910.KS', '두산로보틱스', 'KOSPI', 'KR', '로봇'],
  ['KODEX 반도체', '091160.KS', 'KODEX 반도체', 'KOSPI ETF', 'KR', '한국 반도체 etf'],
  ['KODEX 200', '069500.KS', 'KODEX 200', 'KOSPI ETF', 'KR', '코스피 etf'],
  ['TIGER 200', '102110.KS', 'TIGER 200', 'KOSPI ETF', 'KR', '코스피 etf'],
  ['KODEX 코스닥150', '229200.KS', 'KODEX 코스닥150', 'KOSPI ETF', 'KR', '코스닥 etf'],
  ['KODEX AI전력핵심설비', '487240.KS', 'KODEX AI전력핵심설비', 'KOSPI ETF', 'KR', '전력 ai etf'],
  ['엔비디아', 'NVDA', 'NVIDIA', 'Nasdaq', 'US', 'nvidia ai gpu'],
  ['마이크론', 'MU', 'Micron Technology', 'Nasdaq', 'US', 'memory dram'],
  ['팔란티어', 'PLTR', 'Palantir', 'Nasdaq', 'US', 'ai software'],
  ['테슬라', 'TSLA', 'Tesla', 'Nasdaq', 'US', '전기차'],
  ['애플', 'AAPL', 'Apple', 'Nasdaq', 'US', 'iphone'],
  ['마이크로소프트', 'MSFT', 'Microsoft', 'Nasdaq', 'US', 'ai cloud'],
  ['아마존', 'AMZN', 'Amazon', 'Nasdaq', 'US', 'aws cloud'],
  ['메타', 'META', 'Meta Platforms', 'Nasdaq', 'US', 'facebook instagram'],
  ['구글', 'GOOGL', 'Alphabet', 'Nasdaq', 'US', 'alphabet ai'],
  ['알파벳', 'GOOGL', 'Alphabet', 'Nasdaq', 'US', 'google'],
  ['브로드컴', 'AVGO', 'Broadcom', 'Nasdaq', 'US', 'semiconductor ai'],
  ['버티브', 'VRT', 'Vertiv', 'NYSE', 'US', 'ai power data center'],
  ['GEV', 'GEV', 'GE Vernova', 'NYSE', 'US', '전력 에너지'],
  ['블룸에너지', 'BE', 'Bloom Energy', 'NYSE', 'US', '전력 연료전지'],
  ['콘스텔레이션', 'CEG', 'Constellation Energy', 'Nasdaq', 'US', '원전 전력'],
  ['이튼', 'ETN', 'Eaton', 'NYSE', 'US', '전력 인프라'],
  ['루멘텀', 'LITE', 'Lumentum', 'Nasdaq', 'US', '광통신'],
  ['코히런트', 'COHR', 'Coherent', 'NYSE', 'US', '광통신'],
  ['아이렌', 'IREN', 'IREN', 'Nasdaq', 'US', '데이터센터 bitcoin'],
  ['로켓랩', 'RKLB', 'Rocket Lab', 'Nasdaq', 'US', '우주'],
  ['인플렉션', 'INFN', 'Infinera', 'Nasdaq', 'US', '광통신'],
  ['아이온큐', 'IONQ', 'IonQ', 'NYSE', 'US', '양자'],
  ['SOXX', 'SOXX', 'iShares Semiconductor ETF', 'Nasdaq', 'US', '반도체 etf'],
  ['SMH', 'SMH', 'VanEck Semiconductor ETF', 'Nasdaq', 'US', '반도체 etf'],
  ['GRID', 'GRID', 'First Trust Nasdaq Clean Edge Smart Grid ETF', 'Nasdaq', 'US', '전력 인프라 etf'],
  ['DRAM', 'DRAM', 'Global X Semiconductor ETF', 'Nasdaq', 'US', '메모리 etf'],
].map(([key, symbol, name, exchange, country, tags = '']) => ({ key, symbol, name, exchange, country, tags, source: 'local' }));

let krxCache = { at: 0, rows: [] };

function cleanText(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
}

function norm(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFKC')
    .replace(/주식회사|㈜|\(주\)|보통주|우선주/g, '')
    .replace(/[\s·ㆍ._\-()[\]{}:,/\\]/g, '');
}

function uniqueBySymbol(items) {
  return items.filter((x, i, arr) => arr.findIndex((y) => String(y.symbol).toUpperCase() === String(x.symbol).toUpperCase()) === i);
}

function localMatches(q, source = LOCAL_ALIASES, limit = 12) {
  const lower = norm(q);
  if (!lower) return [];
  return uniqueBySymbol(source.filter((x) => {
    const key = norm(x.key);
    const name = norm(x.name);
    const symbol = String(x.symbol || '').toLowerCase();
    const tags = norm(x.tags);
    return key.includes(lower) || lower.includes(key) || name.includes(lower) || lower.includes(name) || symbol.includes(lower) || tags.includes(lower);
  })).sort((a, b) => scoreMatch(q, b) - scoreMatch(q, a)).slice(0, limit);
}

function scoreMatch(q, item) {
  const lower = norm(q);
  const key = norm(item.key);
  const name = norm(item.name);
  const symbol = String(item.symbol || '').toLowerCase();
  if (key === lower || name === lower || symbol === lower) return 100;
  if (key.startsWith(lower) || name.startsWith(lower)) return 80;
  if (key.includes(lower) || name.includes(lower)) return 60;
  return 20;
}

function withTimeout(ms = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchJson(url, options = {}, timeout = 4500) {
  const guard = withTimeout(timeout);
  try {
    const res = await fetch(url, { ...options, signal: guard.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    guard.done();
  }
}

async function fetchText(url, options = {}, timeout = 4500) {
  const guard = withTimeout(timeout);
  try {
    const res = await fetch(url, { ...options, signal: guard.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.text();
  } finally {
    guard.done();
  }
}

async function fetchKrxMarket(mktId) {
  const body = new URLSearchParams({
    bld: 'dbms/MDC/STAT/standard/MDCSTAT01901',
    locale: 'ko_KR',
    mktId,
    share: '1',
    csvxls_isNo: 'false',
  });
  const data = await fetchJson('https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd', {
    method: 'POST',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      referer: 'https://data.krx.co.kr/contents/MDC/MDI/mdiLoader',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
    body,
  }, 5000);
  const suffix = mktId === 'KSQ' ? '.KQ' : '.KS';
  const exchange = mktId === 'KSQ' ? 'KOSDAQ' : 'KOSPI';
  return (data?.OutBlock_1 || []).map((r) => ({
    key: r.ISU_ABBRV || r.ISU_NM || r.ISU_SRT_CD,
    symbol: `${r.ISU_SRT_CD}${suffix}`,
    name: r.ISU_ABBRV || r.ISU_NM || r.ISU_SRT_CD,
    exchange,
    country: 'KR',
    tags: `${r.ISU_NM || ''} ${r.ISU_ENG_NM || ''} ${r.MKT_NM || ''}`,
    source: 'krx',
  })).filter((x) => /^\d{6}\.(KS|KQ)$/.test(x.symbol));
}

async function getKrxMaster() {
  const now = Date.now();
  if (krxCache.rows.length && now - krxCache.at < 12 * 60 * 60 * 1000) return krxCache.rows;
  try {
    const settled = await Promise.allSettled([fetchKrxMarket('STK'), fetchKrxMarket('KSQ')]);
    const rows = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    if (rows.length) krxCache = { at: now, rows };
  } catch (_) {}
  return krxCache.rows;
}

function parseJsonLoose(text) {
  const raw = String(text || '').trim();
  try {
    return JSON.parse(raw);
  } catch (_) {
    const body = raw.match(/\(([\s\S]*)\)\s*;?$/)?.[1];
    if (body) {
      try {
        return JSON.parse(body);
      } catch (_) {}
    }
  }
  return null;
}

function naverRowsFrom(value, out = []) {
  if (!value) return out;
  if (Array.isArray(value)) {
    const flat = value.flat(Infinity).map(cleanText).filter(Boolean);
    const code = flat.find((x) => /^\d{6}$/.test(x));
    const name = flat.find((x) => /[가-힣A-Za-z]/.test(x) && !/^\d{6}$/.test(x) && !/^KOS(PI|DAQ)$/i.test(x));
    if (code && name) {
      const joined = flat.join(' ');
      out.push({
        key: name,
        symbol: `${code}${/kosdaq|코스닥/i.test(joined) ? '.KQ' : '.KS'}`,
        name,
        exchange: /kosdaq|코스닥/i.test(joined) ? 'KOSDAQ' : 'KOSPI',
        country: 'KR',
        tags: joined,
        source: 'naver',
      });
    }
    value.forEach((x) => naverRowsFrom(x, out));
    return out;
  }
  if (typeof value === 'object') {
    const code = value.itemCode || value.code || value.symbolCode || value.reutersCode;
    const name = value.stockName || value.itemName || value.name || value.korName || value.nm;
    if (code && /^\d{6}$/.test(String(code)) && name) {
      const market = value.market || value.marketName || value.exchange || '';
      out.push({
        key: cleanText(name),
        symbol: `${code}${/kosdaq|코스닥/i.test(market) ? '.KQ' : '.KS'}`,
        name: cleanText(name),
        exchange: /kosdaq|코스닥/i.test(market) ? 'KOSDAQ' : 'KOSPI',
        country: 'KR',
        tags: Object.values(value).map(cleanText).join(' '),
        source: 'naver',
      });
    }
    Object.values(value).forEach((x) => naverRowsFrom(x, out));
  }
  return out;
}

async function fetchNaverAutocomplete(q) {
  const url = `https://ac.finance.naver.com/ac?q=${encodeURIComponent(q)}&q_enc=UTF-8&r_enc=UTF-8&t_koreng=1&st=111&r_lt=111`;
  try {
    const text = await fetchText(url, {
      headers: {
        accept: 'application/json,text/plain,*/*',
        referer: 'https://finance.naver.com/',
        'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
      },
    }, 3500);
    return uniqueBySymbol(localMatches(q, naverRowsFrom(parseJsonLoose(text)), 10));
  } catch (_) {
    return [];
  }
}

async function fetchYahooSearch(q, preferred) {
  const yahooQuery = preferred || q;
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooQuery)}&quotesCount=8&newsCount=0&enableFuzzyQuery=true`;
  const data = await fetchJson(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  }, 4500);
  return (data.quotes || [])
    .filter((x) => x.symbol && (x.quoteType === 'EQUITY' || x.quoteType === 'ETF' || x.quoteType === 'INDEX'))
    .map((x) => ({
      symbol: x.symbol,
      name: x.shortname || x.longname || x.symbol,
      exchange: x.exchDisp || x.exchange || '',
      country: inferCountry(x),
      source: 'yahoo',
    }));
}

function looksKoreanQuery(q) {
  return /[가-힣]/.test(q) || /^\d{4,6}$/.test(String(q).trim());
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
  const isKr = looksKoreanQuery(q);
  const strongLocal = local.some((x) => scoreMatch(q, x) >= 80);

  if (strongLocal) {
    res.status(200).json({ results: uniqueBySymbol(local).slice(0, 12) });
    return;
  }

  const krx = isKr ? localMatches(q, await getKrxMaster(), 12) : [];
  const strongKrx = krx.some((x) => scoreMatch(q, x) >= 80);
  const naver = isKr && !strongKrx ? await fetchNaverAutocomplete(q) : [];
  const preferred = local[0]?.symbol || krx[0]?.symbol || naver[0]?.symbol || '';

  if (isKr && (krx.length || naver.length)) {
    res.status(200).json({ results: uniqueBySymbol([...local, ...krx, ...naver]).slice(0, 20) });
    return;
  }

  try {
    const yahoo = await fetchYahooSearch(q, preferred);
    res.status(200).json({ results: uniqueBySymbol([...local, ...krx, ...naver, ...yahoo]).slice(0, 20) });
  } catch (error) {
    const fallback = uniqueBySymbol([...local, ...krx, ...naver]).slice(0, 20);
    res.status(fallback.length ? 200 : 502).json({ error: String(error?.message || error), results: fallback });
  }
}
