async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'text/html,text/plain,*/*',
      'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
    },
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.text();
}

function parseNum(v) {
  const n = Number(String(v || '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

async function getYahooPrice(symbol) {
  try {
    const data = await getJson(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice`);
    return Number(data?.quoteResponse?.result?.[0]?.regularMarketPrice) || null;
  } catch {
    return null;
  }
}

async function getUsdKrw() {
  const yahoo = await getYahooPrice('KRW=X');
  if (yahoo) return yahoo;
  try {
    const data = await getJson('https://open.er-api.com/v6/latest/USD');
    const rate = Number(data?.rates?.KRW);
    if (rate) return rate;
  } catch {}
  try {
    const data = await getJson('https://api.frankfurter.app/latest?from=USD&to=KRW');
    const rate = Number(data?.rates?.KRW);
    if (rate) return rate;
  } catch {}
  return null;
}

async function getKimchi() {
  const [upbitTry, bithumbTry, binanceTry, coinbaseTry, fxTry] = await Promise.allSettled([
    getJson('https://api.upbit.com/v1/ticker?markets=KRW-BTC'),
    getJson('https://api.bithumb.com/public/ticker/BTC_KRW'),
    getJson('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'),
    getJson('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
    getUsdKrw(),
  ]);
  const upbit = upbitTry.status === 'fulfilled' ? upbitTry.value : null;
  const bithumb = bithumbTry.status === 'fulfilled' ? bithumbTry.value : null;
  const binance = binanceTry.status === 'fulfilled' ? binanceTry.value : null;
  const coinbase = coinbaseTry.status === 'fulfilled' ? coinbaseTry.value : null;
  const upbitKrw = Number(upbit?.[0]?.trade_price) || Number(bithumb?.data?.closing_price);
  const btcUsd = Number(binance?.price) || Number(coinbase?.data?.amount) || await getYahooPrice('BTC-USD');
  const usdKrw = fxTry.status === 'fulfilled' ? fxTry.value : await getUsdKrw();
  if (!upbitKrw || !btcUsd || !usdKrw) return null;
  const globalKrw = btcUsd * usdKrw;
  return {
    upbitKrw,
    btcUsd,
    usdKrw,
    globalKrw,
    premiumPct: ((upbitKrw / globalKrw) - 1) * 100,
  };
}

async function getMmf() {
  try {
    const html = await getText('https://www.ici.org/research/stats/mmf');
    const plain = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');
    const sentence = plain.match(/Total money market fund assets[\s\S]{0,500}?reported today\./i)?.[0]
      || plain.match(/Total money market fund assets[\s\S]{0,500}?trillion/i)?.[0]
      || '';
    const total = sentence.match(/to\s+\$([\d.]+)\s+trillion/i)?.[1];
    const change = sentence.match(/(?:increased|decreased)\s+by\s+\$([\d.]+)\s+billion/i)?.[1];
    const down = /decreased\s+by/i.test(sentence);
    const asOf = sentence.match(/week ended\s+Wednesday,\s+([^,]+,\s+\d{4})/i)?.[1] || null;
    return total ? {
      totalText: `$${total}T`,
      changeText: change ? `${down ? '-' : '+'}$${change}B` : null,
      asOf,
    } : null;
  } catch {
    return null;
  }
}

async function getAaii() {
  try {
    const feed = await getText('https://insights.aaii.com/feed');
    const path = feed.match(/https:\/\/insights\.aaii\.com\/p\/aaii-sentiment-survey[^"<\s]*/i)?.[0];
    const html = path ? await getText(path) : await getText('https://insights.aaii.com/');
    const resultBlock = html.match(/This week.?s Sentiment Survey results:[\s\S]{0,500}/i)?.[0] || html;
    const bull = resultBlock.match(/Bullish:\s*([\d.]+)%/i)?.[1] || resultBlock.match(/Bullish[^0-9]{0,80}([\d.]+)%/i)?.[1];
    const bear = resultBlock.match(/Bearish:\s*([\d.]+)%/i)?.[1] || resultBlock.match(/Bearish[^0-9]{0,80}([\d.]+)%/i)?.[1];
    const neutral = resultBlock.match(/Neutral:\s*([\d.]+)%/i)?.[1] || resultBlock.match(/Neutral[^0-9]{0,80}([\d.]+)%/i)?.[1];
    if (!bull || !bear) return null;
    const spread = Number(bull) - Number(bear);
    return {
      bullish: Number(bull),
      neutral: neutral ? Number(neutral) : null,
      bearish: Number(bear),
      spread,
      spreadText: `${spread > 0 ? '+' : ''}${spread.toFixed(1)}`,
    };
  } catch {
    return null;
  }
}

async function getPrediction() {
  try {
    const data = await getJson('https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false&order=volume24hr&ascending=false');
    const markets = Array.isArray(data) ? data : [];
    const macro = markets.find((m) => /fed|rate|recession|inflation|bitcoin|btc|oil|war/i.test(`${m.question || ''} ${m.slug || ''}`));
    if (!macro) return null;
    let price = Number(macro.lastTradePrice ?? macro.bestAsk ?? macro.bestBid);
    if (!Number.isFinite(price) && macro.outcomePrices) {
      try {
        const prices = JSON.parse(macro.outcomePrices);
        price = Number(prices?.[0]);
      } catch {}
    }
    return {
      label: Number.isFinite(price) ? `${Math.round(price * 100)}%` : '연결됨',
      chip: Number.isFinite(price) && price >= .7 ? 'ch-y' : 'ch-b',
      note: `거래량 상위 매크로 예측시장: "${macro.question || macro.slug}"`,
    };
  } catch {
    return null;
  }
}

async function getFredSeries(id) {
  const csv = await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`);
  const rows = csv.trim().split(/\r?\n/).slice(1).map((line) => {
    const [date, value] = line.split(',');
    const close = parseNum(value);
    return close == null || close <= 0 ? null : { t: new Date(date).getTime(), close, date };
  }).filter(Boolean);
  return rows.slice(-180);
}

async function getHighYield() {
  try {
    const series = await getFredSeries('BAMLH0A0HYM2');
    const last = series.at(-1);
    return last ? { latest: last.close, asOf: last.date, series } : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const [kimchi, mmf, aaii, prediction, highYield] = await Promise.allSettled([
    getKimchi(),
    getMmf(),
    getAaii(),
    getPrediction(),
    getHighYield(),
  ]);
  res.status(200).json({
    kimchi: kimchi.status === 'fulfilled' ? kimchi.value : null,
    mmf: mmf.status === 'fulfilled' ? mmf.value : null,
    aaii: aaii.status === 'fulfilled' ? aaii.value : null,
    prediction: prediction.status === 'fulfilled' ? prediction.value : null,
    highYield: highYield.status === 'fulfilled' ? highYield.value : null,
  });
}
