async function getJson(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6500),
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
    signal: AbortSignal.timeout(6500),
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

function translatePolymarketQuestion(q) {
  if (!q) return null;
  const original = String(q).trim();
  const lower = original.toLowerCase();

  const findYear = () => original.match(/\b(20\d{2})\b/)?.[1] || null;
  const findMonth = () => {
    const m = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    if (!m) return null;
    return ({ january: '1월', february: '2월', march: '3월', april: '4월', may: '5월', june: '6월', july: '7월', august: '8월', september: '9월', october: '10월', november: '11월', december: '12월' })[m[1]];
  };
  const findPrice = () => {
    const m = original.match(/\$\s?([\d.,]+)\s?(k|m|million|billion)?/i);
    if (!m) return null;
    const num = m[1];
    const unit = (m[2] || '').toLowerCase();
    const unitKr = unit === 'k' ? '천' : unit === 'm' || unit === 'million' ? '백만' : unit === 'billion' ? '십억' : '';
    return `$${num}${unitKr}`;
  };
  const findBps = () => original.match(/(\d+)\s*bps?/i)?.[1];
  const findPct = () => original.match(/(\d+(?:\.\d+)?)\s*%/)?.[1];
  const dateLabel = () => {
    const y = findYear();
    const m = findMonth();
    if (m && y) return `${y}년 ${m}`;
    if (m) return `${m}`;
    if (y) return `${y}년`;
    return '';
  };

  // 1) 비트코인/암호화폐 가격 도달
  if (/bitcoin|btc|ether|eth|crypto/i.test(original)) {
    const coin = /ether|eth\b/i.test(original) ? '이더리움' : /bitcoin|btc/i.test(original) ? '비트코인' : '암호화폐';
    const price = findPrice();
    const dl = dateLabel();
    if (/reach|hit|cross|exceed|above|over/i.test(original)) {
      return `${dl ? dl + '까지 ' : ''}${coin}이(가) ${price ? price + '에 ' : ''}도달할까?`;
    }
    if (/below|under|drop/i.test(original)) {
      return `${dl ? dl + '까지 ' : ''}${coin}이(가) ${price ? price + ' 아래로 ' : ''}하락할까?`;
    }
    return `${coin} ${price || ''} 관련 이벤트${dl ? ' (' + dl + ')' : ''}`;
  }

  // 2) 연준 금리
  if (/\bfed\b|federal reserve|fomc/i.test(original)) {
    const dl = dateLabel();
    const bps = findBps();
    if (/cut/i.test(original)) {
      return `${dl ? dl + ' FOMC에서 ' : '연준이 '}${bps ? bps + 'bp ' : ''}금리를 인하할까?`;
    }
    if (/hike|raise|increase/i.test(original)) {
      return `${dl ? dl + ' FOMC에서 ' : '연준이 '}금리를 인상할까?`;
    }
    if (/pause|hold|unchanged|skip/i.test(original)) {
      return `${dl ? dl + ' FOMC에서 ' : '연준이 '}금리를 동결할까?`;
    }
    return `${dl ? dl + ' ' : ''}연준 통화정책 이벤트`;
  }

  // 3) 경기침체
  if (/recession/i.test(original)) {
    return `${findYear() ? findYear() + '년 ' : ''}미국 경기침체가 발생할까?`;
  }

  // 4) 인플레이션
  if (/inflation|cpi/i.test(original)) {
    const pct = findPct();
    const dl = dateLabel();
    return `${dl ? dl + ' ' : ''}인플레이션(CPI)${pct ? '이 ' + pct + '% 이상이 ' : ' 관련 이벤트'}${pct ? '될까?' : ''}`;
  }

  // 5) 유가
  if (/\boil\b|wti|brent|crude/i.test(original)) {
    const price = findPrice();
    if (/reach|hit|cross|above|over/i.test(original)) {
      return `유가가 ${price || ''} 위로 올라갈까?`;
    }
    if (/below|under|drop/i.test(original)) {
      return `유가가 ${price || ''} 아래로 내려갈까?`;
    }
    return `유가 관련 이벤트`;
  }

  // 6) 지정학 / 전쟁
  if (/\bwar\b|ceasefire|conflict|invasion|nuclear/i.test(original)) {
    if (/ceasefire/i.test(original)) return `휴전 협상이 성사될까?${dateLabel() ? ' (' + dateLabel() + ')' : ''}`;
    if (/nuclear/i.test(original)) return `핵 관련 이벤트가 발생할까?`;
    return `지정학 / 전쟁 관련 이벤트`;
  }

  // 7) 선거 / 정치
  if (/election|trump|biden|harris|president|senate|congress/i.test(original)) {
    if (/trump/i.test(original)) return `트럼프 관련 정치 이벤트`;
    return `선거 / 정치 관련 이벤트`;
  }

  // 8) S&P / 증시 지수
  if (/s&p|sp ?500|nasdaq|dow|stock market/i.test(original)) {
    const dl = dateLabel();
    if (/recession|crash|bear/i.test(original)) return `${dl ? dl + ' ' : ''}증시 약세장(베어마켓) 관련 이벤트`;
    return `${dl ? dl + ' ' : ''}미국 증시 지수 관련 이벤트`;
  }

  // 9) 실업률 / 고용
  if (/unemployment|jobless|payroll|jobs report/i.test(original)) {
    return `미국 고용/실업률 관련 이벤트`;
  }

  return null;
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
    const question = macro.question || macro.slug;
    const questionKr = translatePolymarketQuestion(question);
    return {
      label: Number.isFinite(price) ? `${Math.round(price * 100)}%` : '연결됨',
      chip: Number.isFinite(price) && price >= .7 ? 'ch-y' : 'ch-b',
      question,
      questionKr,
      note: '시장 심리 참고용이며 매수/매도 신호는 아닙니다.',
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
