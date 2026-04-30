const NAVER_SISE = 'https://api.finance.naver.com/siseJson.naver';
const NAVER_SUMMARY = 'https://api.finance.naver.com/service/itemSummary.naver';
const NAVER_FINANCE = 'https://m.stock.naver.com/api/stock';

const UA = 'Mozilla/5.0 market-dashboard/1.0';

export const DEFAULT_MIN_VALUE = 5_000_000_000;

export const EMPTY_NAVER_FINANCE = {
  revenueGrowth: null,
  earningsGrowth: null,
  revenuePrevious: null,
  revenueLatest: null,
  operatingIncomePrevious: null,
  operatingIncomeLatest: null,
  revenueSeries: [],
  operatingIncomeSeries: [],
  netIncomeSeries: [],
};

export function cleanNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

export function decodeKor(buffer) {
  try {
    return new TextDecoder('euc-kr').decode(buffer);
  } catch {
    return new TextDecoder().decode(buffer);
  }
}

export function decodeEscaped(value) {
  try {
    return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`);
  } catch {
    return String(value).replace(/\\u0026/g, '&');
  }
}

function headers(extra = {}) {
  return { accept: 'application/json,text/html,text/plain,*/*', 'user-agent': UA, ...extra };
}

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function avg(values) {
  const xs = values.filter(Number.isFinite);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function pct(a, b) {
  return Number.isFinite(a) && Number.isFinite(b) && b ? ((a / b) - 1) * 100 : null;
}

function koreanCode(value) {
  const code = String(value || '').toUpperCase().replace(/\.(KS|KQ)$/i, '').replace(/\D/g, '').slice(0, 6);
  return /^\d{6}$/.test(code) ? code : '';
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

export function parseNaverSiseRows(text) {
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

export async function fetchSummary(codeLike) {
  const code = koreanCode(codeLike);
  if (!code) return {};
  try {
    const data = await fetchJson(`${NAVER_SUMMARY}?itemcode=${code}`, {
      headers: headers({ referer: `https://finance.naver.com/item/main.naver?code=${code}` }),
    }, 4500);
    const amount = cleanNumber(data.amount);
    const marketSum = cleanNumber(data.marketSum);
    return {
      price: cleanNumber(data.now),
      changePct: cleanNumber(data.rate),
      volume: cleanNumber(data.quant),
      valueToday: amount ? amount * 1_000_000 : null,
      marketCap: marketSum ? marketSum * 1_000_000 : null,
      per: cleanNumber(data.per),
      pbr: cleanNumber(data.pbr),
      eps: cleanNumber(data.eps),
    };
  } catch {
    return {};
  }
}

export async function fetchHistory(codeLike) {
  const code = koreanCode(codeLike);
  if (!code) return [];
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

export async function fetchNaverFinance(codeLike) {
  const code = koreanCode(codeLike);
  if (!code) return EMPTY_NAVER_FINANCE;
  try {
    const data = await fetchJson(`${NAVER_FINANCE}/${code}/finance/annual`, {
      headers: headers({ referer: `https://m.stock.naver.com/domestic/stock/${code}/finance` }),
    }, 6500);
    const revenues = valuesByActualPeriod(data, '매출액');
    const profits = valuesByActualPeriod(data, '영업이익');
    const netIncome = valuesByActualPeriod(data, '당기순이익');
    const revenuePrevious = revenues.at(-2)?.value ?? null;
    const revenueLatest = revenues.at(-1)?.value ?? null;
    const operatingIncomePrevious = profits.at(-2)?.value ?? null;
    const operatingIncomeLatest = profits.at(-1)?.value ?? null;
    return {
      revenueGrowth: growthFrom(revenues),
      earningsGrowth: growthFrom(profits),
      revenuePrevious,
      revenueLatest,
      operatingIncomePrevious,
      operatingIncomeLatest,
      revenueSeries: revenues,
      operatingIncomeSeries: profits,
      netIncomeSeries: netIncome,
    };
  } catch {
    return EMPTY_NAVER_FINANCE;
  }
}

function ma(rows, n, offset = 0) {
  const end = offset ? rows.length - offset : rows.length;
  const slice = rows.slice(Math.max(0, end - n), end).map((p) => p.close).filter(Number.isFinite);
  return slice.length >= n ? avg(slice) : null;
}

function ema(values, n) {
  const out = [];
  let cur = null;
  const k = 2 / (n + 1);
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) {
      out.push(null);
      return;
    }
    if (cur == null) {
      const seed = values.slice(Math.max(0, i - n + 1), i + 1).filter(Number.isFinite);
      cur = seed.length >= n ? avg(seed) : v;
    } else cur = v * k + cur * (1 - k);
    out.push(cur);
  });
  return out;
}

function rsi(rows, n = 14) {
  const closes = rows.map((p) => p.close).filter(Number.isFinite);
  if (closes.length < n + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - n; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  if (!loss) return 100;
  const rs = gain / loss;
  return 100 - (100 / (1 + rs));
}

function atr(rows, n = 14) {
  if (rows.length < n + 1) return null;
  const trs = [];
  for (let i = rows.length - n; i < rows.length; i += 1) {
    const p = rows[i];
    const prev = rows[i - 1]?.close;
    if (!p || !Number.isFinite(prev)) continue;
    trs.push(Math.max(p.high - p.low, Math.abs(p.high - prev), Math.abs(p.low - prev)));
  }
  return avg(trs);
}

function macdProfile(rows) {
  const closes = rows.map((p) => p.close).filter(Number.isFinite);
  if (closes.length < 35) return { ok: false, label: 'MACD 대기', score: 0 };
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const macd = closes.map((_, i) => Number.isFinite(e12[i]) && Number.isFinite(e26[i]) ? e12[i] - e26[i] : null);
  const validMacd = macd.filter(Number.isFinite);
  const sig = ema(validMacd, 9);
  const mLast = validMacd.at(-1);
  const mPrev = validMacd.at(-2);
  const sLast = sig.at(-1);
  const sPrev = sig.at(-2);
  if (![mLast, mPrev, sLast, sPrev].every(Number.isFinite)) return { ok: false, label: 'MACD 대기', score: 0 };
  const hist = mLast - sLast;
  const prevHist = mPrev - sPrev;
  if (prevHist <= 0 && hist > 0) return { ok: true, label: 'MACD 골든크로스', score: 10 };
  if (hist > 0 && mLast > 0) return { ok: true, label: '상승 모멘텀', score: 6 };
  if (prevHist >= 0 && hist < 0) return { ok: false, label: 'MACD 약화', score: -4 };
  return { ok: false, label: 'MACD 중립', score: 0 };
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

export function foreignProfile(rows, summary) {
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

function scoreForeign(foreign) {
  if (foreign.net5Value == null) return 0;
  if (foreign.net5Value < 0) return foreign.strength != null && foreign.strength <= -1 ? -6 : -3;
  if (foreign.strength != null && foreign.strength >= 2) return 14;
  if (foreign.strength != null && foreign.strength >= 1.4) return 10;
  return 6;
}

export function turnaroundProfile(finance = EMPTY_NAVER_FINANCE) {
  const opPrev = finance.operatingIncomePrevious;
  const opLast = finance.operatingIncomeLatest;
  const revPrev = finance.revenuePrevious;
  const revLast = finance.revenueLatest;
  const opGrowth = Number.isFinite(finance.earningsGrowth) ? finance.earningsGrowth
    : Number.isFinite(opPrev) && Number.isFinite(opLast) && opPrev !== 0 ? (opLast - opPrev) / Math.abs(opPrev) : null;
  const revenueGrowth = Number.isFinite(finance.revenueGrowth) ? finance.revenueGrowth
    : Number.isFinite(revPrev) && Number.isFinite(revLast) && revPrev !== 0 ? (revLast - revPrev) / Math.abs(revPrev) : null;
  if (Number.isFinite(opPrev) && Number.isFinite(opLast) && opPrev < 0 && opLast > 0) {
    return { label: '영업익 턴어라운드', score: 14, chip: 'ch-g', note: '적자에서 흑자로 전환' };
  }
  if (Number.isFinite(opGrowth) && opGrowth >= 0.3) return { label: '영업익 급성장', score: 10, chip: 'ch-g', note: `영업익 ${(opGrowth * 100).toFixed(0)}% 성장` };
  if (Number.isFinite(opGrowth) && opGrowth > 0) return { label: '영업익 개선', score: 5, chip: 'ch-b', note: `영업익 ${(opGrowth * 100).toFixed(0)}% 성장` };
  if (Number.isFinite(revenueGrowth) && revenueGrowth > 0.15) return { label: '매출 성장', score: 3, chip: 'ch-b', note: `매출 ${(revenueGrowth * 100).toFixed(0)}% 성장` };
  if (Number.isFinite(opGrowth) && opGrowth <= -0.1) return { label: '이익 둔화', score: -8, chip: 'ch-r', note: `영업익 ${(opGrowth * 100).toFixed(0)}% 변화` };
  return { label: '실적 대기', score: 0, chip: 'ch-b', note: '연간 실적 데이터가 부족합니다.' };
}

export function detectPatterns(rows, summary = {}) {
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
  const low20 = Math.min(...rows.slice(-20).flatMap((p) => [p.low, p.close]).filter(Number.isFinite));
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
  const macd = macdProfile(rows);
  const rsi14 = rsi(rows);
  const atr14 = atr(rows);
  const highGap = close && high52 ? pct(close, high52) : null;
  const lowRise = close && low52 ? pct(close, low52) : null;
  const patterns = [];

  const newHigh = close && high52 && close >= high52 * 0.995;
  const nearHigh = close && high52 && close >= high52 * 0.985;
  if (newHigh || nearHigh) {
    patterns.push({
      key: 'newHigh',
      label: newHigh ? '52주 신고가' : '신고가권',
      source: 'O’Neil / 신고가 모멘텀',
      score: newHigh ? 24 : 18,
      phase: newHigh ? 'triggered' : 'imminent',
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
      phase: highGap != null && highGap >= -10 ? 'triggered' : 'forming',
      detail: `MA 정배열, 저점 대비 ${lowRise.toFixed(0)}% 회복`,
    });
  }

  const range20 = high20 && low20 && close ? (high20 - low20) / close : null;
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
      phase: close >= high20 * 0.98 ? 'imminent' : 'forming',
      detail: `BB 폭 ${Math.round(bb.ratio * 100)}%, 20일 박스 ${(range20 * 100).toFixed(1)}%`,
    });
  }

  const support60 = Math.min(...rows.slice(-75, -10).flatMap((p) => [p.low, p.close]).filter(Number.isFinite));
  const recentLow = Math.min(...rows.slice(-10).flatMap((p) => [p.low, p.close]).filter(Number.isFinite));
  const spring = close && support60 && recentLow < support60 * 0.985 && close > support60 && (volRatio == null || volRatio >= 1.1);
  if (spring) {
    patterns.push({
      key: 'spring',
      label: 'Spring 회복',
      source: 'Wyckoff',
      score: 20,
      phase: 'triggered',
      detail: `지지선 이탈 후 ${((close / support60 - 1) * 100).toFixed(1)}% 회복`,
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
      phase: 'triggered',
      detail: `20일 평균 대비 ${volRatio != null ? volRatio.toFixed(1) : '-'}배`,
    });
  }

  if (macd.ok) {
    patterns.push({
      key: 'macd',
      label: macd.label,
      source: 'Murphy / MACD',
      score: macd.score,
      phase: macd.label.includes('골든') ? 'triggered' : 'forming',
      detail: '모멘텀 개선 신호',
    });
  }

  const volumeDryUp = avgVolume20 && avgVolume60 ? avgVolume20 / avgVolume60 : null;
  if (volumeDryUp != null && volumeDryUp < 0.72 && close && ma50 && close > ma50 && highGap != null && highGap > -20) {
    patterns.push({
      key: 'dryUp',
      label: '매물 소화',
      source: 'VCP 보조',
      score: 8,
      phase: 'forming',
      detail: `20일 거래량이 60일 평균의 ${Math.round(volumeDryUp * 100)}%`,
    });
  }

  const wBottom = rows.length >= 80 && (() => {
    const recent = rows.slice(-80);
    const firstHalf = recent.slice(0, 40);
    const secondHalf = recent.slice(40);
    const lowA = Math.min(...firstHalf.map((p) => p.low).filter(Number.isFinite));
    const lowB = Math.min(...secondHalf.map((p) => p.low).filter(Number.isFinite));
    return close && lowA && lowB && Math.abs(lowB / lowA - 1) < 0.08 && close > Math.max(lowA, lowB) * 1.08;
  })();
  if (wBottom) {
    patterns.push({
      key: 'wBottom',
      label: 'W 바닥 회복',
      source: 'Bollinger / 이중바닥',
      score: 12,
      phase: 'forming',
      detail: '두 번째 저점 이후 회복 시도',
    });
  }

  return {
    patterns,
    analysisPrice: close,
    high52,
    low52,
    highGap,
    lowRise,
    ma20,
    ma50,
    ma150,
    ma200,
    avgValue20,
    volRatio,
    bbRatio: bb.ratio,
    rsi: rsi14,
    atr: atr14,
  };
}

function scoreAnalysis(detected, summary, foreign, turnaround) {
  const patternScore = Math.min(58, detected.patterns.reduce((sum, p) => sum + (p.score || 0), 0));
  const foreignScore = scoreForeign(foreign);
  const valuationScore = summary.per != null && summary.per > 0 && summary.per < 45 ? 4 : 0;
  const highScore = detected.highGap != null && detected.highGap >= -5 ? 8
    : detected.highGap != null && detected.highGap >= -15 ? 4 : 0;
  const liquidityScore = detected.avgValue20 >= 30_000_000_000 ? 6
    : detected.avgValue20 >= 10_000_000_000 ? 4
      : detected.avgValue20 >= DEFAULT_MIN_VALUE ? 2 : 0;
  const financeScore = turnaround?.score || 0;
  const raw = patternScore + foreignScore + valuationScore + highScore + liquidityScore;
  return {
    total: Math.max(0, Math.min(100, raw)),
    breakdown: {
      pattern: patternScore,
      foreign: foreignScore,
      valuation: valuationScore,
      highPosition: highScore,
      liquidity: liquidityScore,
      finance: financeScore,
    },
  };
}

function buildScenario(detected) {
  const price = detected.analysisPrice;
  if (!price) return null;
  const atrValue = detected.atr;
  const stopAtr = atrValue ? price - atrValue * 2 : null;
  const invalid = [detected.ma50 ? detected.ma50 * 0.97 : null, stopAtr].filter(Number.isFinite);
  const invalidPrice = invalid.length ? Math.min(...invalid) : null;
  const breakout = detected.high52 && detected.highGap != null && detected.highGap > -12 ? detected.high52 * 1.002 : null;
  const pullback = detected.ma50 && price > detected.ma50 ? detected.ma50 : null;
  return {
    entry1: pullback ?? price,
    entry2: breakout,
    invalidPrice,
    riskPct: invalidPrice ? ((price / invalidPrice) - 1) * 100 : null,
    note: breakout ? '눌림 확인 후 1차, 52주 고점 돌파와 거래량 동반 시 2차 후보입니다.' : '추세 회복과 거래량 확인 전까지 분할 관찰이 우선입니다.',
  };
}

function dataConfidence(rows, summary, foreign, finance) {
  return {
    price: Number.isFinite(summary.price) || Number.isFinite(rows.at(-1)?.close),
    history: rows.length >= 160,
    volume: rows.some((p) => Number.isFinite(p.volume)),
    foreign: foreign.rateNow != null,
    finance: (finance.operatingIncomeSeries || []).length >= 2,
  };
}

export async function analyzeKoreanStock(stock, options = {}) {
  const code = koreanCode(stock.code || stock.symbol || stock.ticker);
  if (!code) return { ...stock, excluded: true, reason: '종목코드 확인 불가' };
  const includeFinance = options.includeFinance !== false;
  const [summary, rows, finance] = await Promise.all([
    fetchSummary(code),
    fetchHistory(code),
    includeFinance ? fetchNaverFinance(code) : Promise.resolve(EMPTY_NAVER_FINANCE),
  ]);
  if (rows.length < 160) {
    return { ...stock, code, symbol: `${code}.KS`, excluded: true, reason: '1년 가격 데이터 부족', rows: rows.length };
  }
  const detected = detectPatterns(rows, summary);
  if (options.minValue && (!detected.avgValue20 || detected.avgValue20 < options.minValue)) {
    return {
      ...stock,
      code,
      symbol: `${code}.KS`,
      excluded: true,
      reason: '유동성 필터 미달',
      avgValue20: detected.avgValue20,
    };
  }
  const foreign = foreignProfile(rows, summary);
  const turnaround = turnaroundProfile(finance);
  const scored = scoreAnalysis(detected, summary, foreign, turnaround);
  const scenario = buildScenario(detected);
  return {
    ...stock,
    code,
    symbol: `${code}.KS`,
    price: detected.analysisPrice ?? summary.price ?? rows.at(-1)?.close ?? null,
    quotePrice: summary.price ?? null,
    analysisPrice: detected.analysisPrice ?? null,
    changePct: summary.changePct,
    per: summary.per,
    pbr: summary.pbr,
    eps: summary.eps,
    marketCap: summary.marketCap ?? stock.marketCapHint ?? null,
    avgValue20: detected.avgValue20,
    volRatio: detected.volRatio,
    high52: detected.high52,
    low52: detected.low52,
    highGap: detected.highGap,
    lowRise: detected.lowRise,
    ma50: detected.ma50,
    ma200: detected.ma200,
    rsi: detected.rsi,
    atr: detected.atr,
    bbRatio: detected.bbRatio,
    patterns: detected.patterns,
    foreign,
    turnaround,
    finance,
    scenario,
    score: scored.total,
    scoreBreakdown: scored.breakdown,
    dataConfidence: dataConfidence(rows, summary, foreign, finance),
    dataReasons: {
      foreign: foreign.rateNow == null ? '네이버 일봉에 외국인 보유율이 없어 계산 불가' : foreign.note,
      finance: (finance.operatingIncomeSeries || []).length < 2 ? '연간 영업이익 데이터 부족' : '',
      per: summary.per == null ? '네이버 요약 PER 미제공' : '',
    },
  };
}
