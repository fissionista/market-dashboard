const NAVER_ENTRY = 'https://finance.naver.com/sise/entryJongmok.naver';
const NAVER_SISE = 'https://api.finance.naver.com/siseJson.naver';
const NAVER_SUMMARY = 'https://api.finance.naver.com/service/itemSummary.naver';
const INVESTING_KQ150 = 'https://kr.investing.com/indices/kosdaq-150-components';

const UA = 'Mozilla/5.0 market-dashboard/1.0';
const DEFAULT_MIN_VALUE = 5_000_000_000;

const FALLBACK_KOSPI200 = [
  ['005930', '삼성전자'], ['000660', 'SK하이닉스'], ['005380', '현대차'],
  ['034020', '두산에너빌리티'], ['012450', '한화에어로스페이스'], ['207940', '삼성바이오로직스'],
  ['009150', '삼성전기'], ['006400', '삼성SDI'], ['035420', 'NAVER'], ['035720', '카카오'],
  ['267260', 'HD현대일렉트릭'], ['298040', '효성중공업'], ['010120', 'LS ELECTRIC'],
  ['042700', '한미반도체'], ['005490', 'POSCO홀딩스'], ['373220', 'LG에너지솔루션'],
  ['000270', '기아'], ['068270', '셀트리온'], ['105560', 'KB금융'], ['055550', '신한지주'],
];

const FALLBACK_KOSDAQ150 = [
  ['000250', '삼천당제약'], ['086520', '에코프로'], ['247540', '에코프로비엠'],
  ['005290', '동진쎄미켐'], ['036830', '솔브레인'], ['240810', '원익IPS'],
  ['222800', '심텍'], ['058470', '리노공업'], ['178320', '서진시스템'],
  ['039030', '이오테크닉스'], ['067310', '하나마이크론'], ['095340', 'ISC'],
  ['196170', '알테오젠'], ['028300', 'HLB'], ['214450', '파마리서치'],
  ['214370', '케어젠'], ['112040', '위메이드'], ['145020', '휴젤'],
  ['089030', '테크윙'], ['032500', '케이엠더블유'],
];

function headers(extra = {}) {
  return { accept: 'application/json,text/html,text/plain,*/*', 'user-agent': UA, ...extra };
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function cleanNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function validDailyBar(row) {
  return row
    && [row.open, row.high, row.low, row.close].every((v) => Number.isFinite(v) && v > 0)
    && row.high >= Math.max(row.open, row.low, row.close)
    && row.low <= Math.min(row.open, row.high, row.close);
}

function scoreDailyBar(row, preferred = false) {
  let score = preferred ? 3 : 0;
  if (!row || ![row.open, row.high, row.low, row.close].every((v) => Number.isFinite(v) && v > 0)) return -20;
  if (row.high >= Math.max(row.open, row.low, row.close)) score += 5;
  else score -= 8;
  if (row.low <= Math.min(row.open, row.high, row.close)) score += 5;
  else score -= 8;
  if (Number.isFinite(row.volume) && row.volume >= 0) score += 1;
  if (row.low > 0 && row.high / row.low < 1.45) score += 1;
  return score;
}

function parseNaverSiseRows(text) {
  const header = text.match(/\[\s*['"]?날짜['"]?[\s\S]*?\]/)?.[0] || '';
  const closeFirstHeader = header.includes('종가') && (!header.includes('시가') || header.indexOf('종가') < header.indexOf('시가'));
  return [...text.matchAll(/\[\s*['"]?(\d{8})['"]?\s*,([^\]]+)\]/g)]
    .map((m) => {
      const nums = m[2].split(',').map((x) => cleanNumber(String(x).replace(/['"]/g, '')));
      const t = new Date(`${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}T00:00:00Z`).getTime();
      const ohlc = {
        t,
        date: m[1],
        open: nums[0],
        high: nums[1],
        low: nums[2],
        close: nums[3],
        volume: nums[4],
        foreignRate: nums[5],
      };
      const closeFirst = {
        t,
        date: m[1],
        close: nums[0],
        open: nums[2],
        high: nums[3],
        low: nums[4],
        volume: nums[5],
        foreignRate: nums[6],
      };
      const chosen = scoreDailyBar(closeFirst, closeFirstHeader) > scoreDailyBar(ohlc, !closeFirstHeader) ? closeFirst : ohlc;
      return validDailyBar(chosen) ? chosen : null;
    })
    .filter(Boolean);
}

function avg(values) {
  const xs = values.filter(Number.isFinite);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function pct(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b ? ((a / b) - 1) * 100 : null;
}

function decodeKor(buffer) {
  try {
    return new TextDecoder('euc-kr').decode(buffer);
  } catch {
    return new TextDecoder().decode(buffer);
  }
}

function decodeEscaped(value) {
  try {
    return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`);
  } catch {
    return String(value).replace(/\\u0026/g, '&');
  }
}

async function fetchText(url, options = {}, timeout = 9000, encoding = 'utf8') {
  const guard = AbortSignal.timeout(timeout);
  const res = await fetch(url, { ...options, signal: guard });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  if (encoding === 'euc-kr') return decodeKor(await res.arrayBuffer());
  return res.text();
}

async function fetchJson(url, options = {}, timeout = 9000) {
  const guard = AbortSignal.timeout(timeout);
  const res = await fetch(url, { ...options, signal: guard });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchKospi200() {
  const pages = Array.from({ length: 24 }, (_, i) => i + 1);
  const settled = await Promise.allSettled(pages.map(async (page) => {
    const url = `${NAVER_ENTRY}?type=KPI200&page=${page}`;
    const html = await fetchText(url, {
      headers: headers({ referer: 'https://finance.naver.com/sise/sise_index.naver?code=KPI200' }),
    }, 7000, 'euc-kr');
    return [...html.matchAll(/\/item\/main\.naver\?code=(\d{6})"[^>]*>([^<]+)<\/a>/g)]
      .map((m) => ({ code: m[1], name: m[2].trim(), market: 'KOSPI200', source: 'Naver KPI200' }));
  }));
  const rows = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  return uniqueUniverse(rows).length ? uniqueUniverse(rows) : FALLBACK_KOSPI200.map(([code, name]) => ({ code, name, market: 'KOSPI200', source: 'fallback' }));
}

async function fetchKosdaq150() {
  try {
    const html = await fetchText(INVESTING_KQ150, {
      headers: headers({ 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' }),
    }, 12000);
    const start = html.indexOf('assetsCollectionStore');
    const chunk = start >= 0 ? html.slice(start, start + 900000) : html;
    const re = /"name":"([^"]+)","symbol":"(\d{6})"[\s\S]{0,500}?"marketCap":([0-9.]+|null),"volumeThreeMonths":([0-9.]+|null)/g;
    const rows = [];
    let match;
    while ((match = re.exec(chunk))) {
      rows.push({
        code: match[2],
        name: decodeEscaped(match[1]),
        market: 'KOSDAQ150',
        source: 'Investing KQ150',
        marketCapHint: cleanNumber(match[3]),
        avgVolumeHint: cleanNumber(match[4]),
      });
    }
    const uniq = uniqueUniverse(rows);
    if (uniq.length >= 100) return uniq;
  } catch {}
  return FALLBACK_KOSDAQ150.map(([code, name]) => ({ code, name, market: 'KOSDAQ150', source: 'fallback' }));
}

function uniqueUniverse(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!/^\d{6}$/.test(row.code) || seen.has(row.code)) return false;
    seen.add(row.code);
    return true;
  });
}

async function fetchSummary(code) {
  try {
    const data = await fetchJson(`${NAVER_SUMMARY}?itemcode=${code}`, {
      headers: headers({ referer: `https://finance.naver.com/item/main.naver?code=${code}` }),
    }, 4500);
    return {
      price: cleanNumber(data.now),
      changePct: cleanNumber(data.rate),
      volume: cleanNumber(data.quant),
      valueToday: cleanNumber(data.amount) ? cleanNumber(data.amount) * 1_000_000 : null,
      marketCap: cleanNumber(data.marketSum) ? cleanNumber(data.marketSum) * 1_000_000 : null,
      per: cleanNumber(data.per),
      pbr: cleanNumber(data.pbr),
      eps: cleanNumber(data.eps),
    };
  } catch {
    return {};
  }
}

async function fetchHistory(code) {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const url = `${NAVER_SISE}?symbol=${code}&requestType=2&count=320&startTime=${ymd(start)}&timeframe=day`;
  try {
    const text = await fetchText(url, {
      headers: headers({ referer: `https://finance.naver.com/item/main.naver?code=${code}` }),
    }, 6500);
    return parseNaverSiseRows(text);
  } catch {
    return [];
  }
}

function ma(rows, n, offset = 0) {
  const end = offset ? rows.length - offset : rows.length;
  const slice = rows.slice(Math.max(0, end - n), end).map((p) => p.close).filter(Number.isFinite);
  return slice.length >= n ? avg(slice) : null;
}

function bbProfile(rows, n = 20) {
  if (rows.length < n + 40) return { width: null, ratio: null };
  const widths = [];
  for (let i = n; i <= rows.length; i += 1) {
    const vals = rows.slice(i - n, i).map((p) => p.close).filter(Number.isFinite);
    if (vals.length < n) continue;
    const mid = avg(vals);
    const sd = Math.sqrt(avg(vals.map((v) => (v - mid) ** 2)));
    widths.push(mid ? (sd * 4) / mid : null);
  }
  const width = widths.at(-1);
  const base = avg(widths.slice(-126, -1));
  return { width, ratio: base ? width / base : null };
}

function foreignProfile(rows, summary) {
  const rates = rows.filter((p) => Number.isFinite(p.foreignRate));
  const last = rates.at(-1);
  const rateNow = last?.foreignRate ?? null;
  const rate5 = rates.length >= 6 ? rateNow - rates.at(-6).foreignRate : null;
  const rate20 = rates.length >= 21 ? rateNow - rates.at(-21).foreignRate : null;
  const price = summary.price ?? rows.at(-1)?.close ?? null;
  const shares = summary.marketCap && price ? summary.marketCap / price : null;
  const net5Value = shares && rate5 != null && price ? shares * (rate5 / 100) * price : null;
  const net20Value = shares && rate20 != null && price ? shares * (rate20 / 100) * price : null;
  const base5 = net20Value != null ? Math.abs(net20Value) / 4 : null;
  const strength = base5 && base5 > 0 ? net5Value / base5 : null;
  return {
    rateNow,
    rate5,
    rate20,
    net5Value,
    net20Value,
    strength,
    note: '외국인 보유율 변화와 시가총액으로 추정한 값입니다.',
  };
}

function detectPatterns(rows, summary) {
  const last = rows.at(-1);
  const prev = rows.at(-2);
  const historyClose = last?.close ?? null;
  const summaryPrice = summary.price ?? null;
  const close = summaryPrice && historyClose && Math.abs((summaryPrice / historyClose) - 1) <= 0.25
    ? summaryPrice
    : historyClose ?? summaryPrice ?? null;
  const high52 = Math.max(close ?? 0, ...rows.flatMap((p) => [p.high, p.close]).filter(Number.isFinite));
  const low52 = Math.min(...rows.flatMap((p) => [p.low, p.close]).filter(Number.isFinite));
  const high20 = Math.max(...rows.slice(-20).flatMap((p) => [p.high, p.close]).filter(Number.isFinite));
  const ma20 = ma(rows, 20);
  const ma50 = ma(rows, 50);
  const ma150 = ma(rows, 150);
  const ma200 = ma(rows, 200);
  const ma200Prev = ma(rows, 200, 20);
  const avgValue20 = avg(rows.slice(-20).map((p) => (p.close ?? 0) * (p.volume ?? 0)));
  const avgVolume20 = avg(rows.slice(-21, -1).map((p) => p.volume));
  const avgVolume60 = avg(rows.slice(-61, -1).map((p) => p.volume));
  const volRatio = avgVolume20 && last?.volume ? last.volume / avgVolume20 : null;
  const valueRatio = avgValue20 && last?.volume && close ? (last.volume * close) / avgValue20 : null;
  const bb = bbProfile(rows);
  const highGap = close && high52 ? pct(close, high52) : null;
  const lowRise = close && low52 ? pct(close, low52) : null;
  const patterns = [];

  const newHigh = close && high52 && close >= high52 * 0.995;
  const nearHigh = close && high52 && close >= high52 * 0.985;
  if (newHigh || nearHigh) {
    patterns.push({
      key: 'newHigh',
      label: newHigh ? '52주 신고가' : '신고가권',
      source: '신고가 모멘텀',
      score: newHigh ? 24 : 18,
      detail: `52주 고점 대비 ${highGap != null ? highGap.toFixed(1) : '-'}%`,
    });
  }

  const stage2 = close && ma50 && ma150 && ma200 && ma200Prev
    && close > ma50 && close > ma150 && close > ma200
    && ma50 > ma150 && ma150 > ma200 && ma200 > ma200Prev
    && lowRise != null && lowRise >= 30
    && highGap != null && highGap >= -25;
  if (stage2) {
    patterns.push({
      key: 'stage2',
      label: 'Stage 2',
      source: 'Weinstein / Minervini',
      score: 26,
      detail: `MA 정배열, 저점 대비 ${lowRise.toFixed(0)}% 회복`,
    });
  }

  const range20 = high20 && close ? (high20 - Math.min(...rows.slice(-20).map((p) => p.low ?? p.close).filter(Number.isFinite))) / close : null;
  const vcp = close && ma50 && close > ma50
    && bb.ratio != null && bb.ratio < 0.72
    && range20 != null && range20 < 0.18
    && highGap != null && highGap >= -18;
  if (vcp) {
    patterns.push({
      key: 'vcp',
      label: 'VCP 응축',
      source: 'Minervini VCP',
      score: 22,
      detail: `BB 폭 ${Math.round(bb.ratio * 100)}%, 20일 박스 ${(range20 * 100).toFixed(1)}%`,
    });
  }

  const volumeRecovery = close && prev && ma20
    && close > prev.close && close > ma20
    && (volRatio != null && volRatio >= 1.7 || valueRatio != null && valueRatio >= 1.7)
    && (!ma50 || close >= ma50 * 0.97);
  if (volumeRecovery) {
    patterns.push({
      key: 'volumeRecovery',
      label: '거래량 회복',
      source: 'O’Neil / 거래량 돌림',
      score: 18,
      detail: `20일 평균 대비 ${volRatio != null ? volRatio.toFixed(1) : '-'}배`,
    });
  }

  const volumeDryUp = avgVolume20 && avgVolume60 ? avgVolume20 / avgVolume60 : null;
  if (volumeDryUp != null && volumeDryUp < 0.72 && close && ma50 && close > ma50 && highGap != null && highGap > -20) {
    patterns.push({
      key: 'dryUp',
      label: '매물 소화',
      source: 'VCP 보조',
      score: 8,
      detail: `20일 거래량이 60일 평균의 ${Math.round(volumeDryUp * 100)}%`,
    });
  }

  return { patterns, analysisPrice: close, high52, low52, highGap, lowRise, ma20, ma50, ma150, ma200, avgValue20, volRatio, bbRatio: bb.ratio };
}

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const current = idx;
      idx += 1;
      out[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

async function scanOne(stock, minValue) {
  const [summary, rows] = await Promise.all([fetchSummary(stock.code), fetchHistory(stock.code)]);
  if (rows.length < 160) {
    return { ...stock, excluded: true, reason: '1년 가격 데이터 부족' };
  }
  const detected = detectPatterns(rows, summary);
  if (!detected.avgValue20 || detected.avgValue20 < minValue) {
    return {
      ...stock,
      excluded: true,
      reason: '유동성 필터 미달',
      avgValue20: detected.avgValue20,
    };
  }
  const foreign = foreignProfile(rows, summary);
  const foreignScore = foreign.net5Value != null && foreign.net5Value > 0
    ? foreign.strength != null && foreign.strength >= 1.4 ? 12 : 6
    : foreign.net5Value != null && foreign.net5Value < 0 ? -4 : 0;
  const score = Math.max(0, Math.min(100,
    detected.patterns.reduce((sum, p) => sum + p.score, 0)
    + foreignScore
    + (detected.highGap != null && detected.highGap >= -5 ? 8 : 0)
    + (summary.per != null && summary.per > 0 && summary.per < 45 ? 4 : 0)
  ));
  return {
    ...stock,
    symbol: `${stock.code}.KS`,
    price: detected.analysisPrice ?? summary.price ?? rows.at(-1)?.close ?? null,
    quotePrice: summary.price ?? null,
    analysisPrice: detected.analysisPrice ?? null,
    changePct: summary.changePct,
    per: summary.per,
    pbr: summary.pbr,
    marketCap: summary.marketCap ?? stock.marketCapHint ?? null,
    avgValue20: detected.avgValue20,
    volRatio: detected.volRatio,
    high52: detected.high52,
    highGap: detected.highGap,
    lowRise: detected.lowRise,
    ma50: detected.ma50,
    ma200: detected.ma200,
    patterns: detected.patterns,
    foreign,
    score,
    dataReasons: {
      foreign: foreign.rateNow == null ? '네이버 일봉에 외국인 보유율이 없어 계산 불가' : foreign.note,
      per: summary.per == null ? '네이버 요약 PER 미제공' : '',
    },
  };
}

function formatReasonStats(results) {
  return results.reduce((acc, row) => {
    if (row?.excluded) acc[row.reason] = (acc[row.reason] || 0) + 1;
    return acc;
  }, {});
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=7200');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const scope = String(req.query.scope || 'all');
  const pattern = String(req.query.pattern || 'all');
  const limit = Math.max(10, Math.min(100, Number(req.query.limit || 40)));
  const minValue = Math.max(1_000_000_000, Number(req.query.minValue || DEFAULT_MIN_VALUE));

  try {
    const [kospi200, kosdaq150] = await Promise.all([fetchKospi200(), fetchKosdaq150()]);
    const universe = scope === 'kospi200' ? kospi200 : scope === 'kosdaq150' ? kosdaq150 : [...kospi200, ...kosdaq150];
    const scanned = await mapLimit(uniqueUniverse(universe), 24, (stock) => scanOne(stock, minValue));
    const reasonStats = formatReasonStats(scanned);
    let candidates = scanned.filter((row) => row && !row.excluded && row.patterns?.length);
    if (pattern !== 'all') candidates = candidates.filter((row) => row.patterns.some((p) => p.key === pattern) || (pattern === 'foreignStrong' && row.foreign?.net5Value > 0 && (row.foreign?.strength ?? 0) >= 1));
    candidates.sort((a, b) => b.score - a.score || (b.avgValue20 || 0) - (a.avgValue20 || 0));
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      scope,
      pattern,
      minValue,
      universe: { kospi200: kospi200.length, kosdaq150: kosdaq150.length, total: uniqueUniverse(universe).length },
      scanned: scanned.length,
      liquidityPassed: scanned.filter((row) => row && !row.excluded).length,
      candidateCount: candidates.length,
      reasonStats,
      sourceNotes: [
        'KOSPI200 구성은 네이버 KPI200 편입종목 페이지를 사용합니다.',
        'KOSDAQ150 구성은 Investing 구성종목 페이지를 우선 사용하고 실패 시 로컬 예비 목록을 사용합니다.',
        '외국인 5일 순매수는 외국인 보유율 변화와 시가총액 기반 추정치입니다.',
      ],
      items: candidates.slice(0, limit),
    });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
