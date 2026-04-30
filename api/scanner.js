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

// 주도 섹터 ETF — 한국 시장
// 김종봉/정규준 강조: 같은 섹터 ETF가 신고가권이면 그 섹터 종목에 가산점
const SECTOR_ETFS = [
  { code: '091160', name: '반도체', tag: 'semicon' },
  { code: '364980', name: 'K-2차전지', tag: 'battery' },
  { code: '117460', name: '에너지화학', tag: 'energy' },
  { code: '139220', name: '건설', tag: 'construction' },
  { code: '139260', name: '경기소비재', tag: 'consumer' },
  { code: '227560', name: '헬스케어', tag: 'healthcare' },
  { code: '266390', name: '바이오', tag: 'bio' },
  { code: '139250', name: '미디어컨텐츠', tag: 'media' },
  { code: '102110', name: '코스피200', tag: 'index_kospi' },
  { code: '229200', name: '코스닥150', tag: 'index_kosdaq' },
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

// 외국인 수급 정밀 점수 (김종봉/정규준식)
// "양수냐 아니냐"가 아니라 "5일+20일 지속성·강도·반전"을 본다
function scoreForeign(foreign) {
  const { net5Value, net20Value, strength } = foreign || {};
  if (net5Value == null) return { score: 0, label: '외국인 수급 데이터 대기' };
  if (net5Value > 0 && net20Value != null && net20Value > 0) {
    if (strength != null && strength >= 1.4) return { score: 14, label: '외국인 5일+20일 매수 + 가속' };
    return { score: 10, label: '외국인 5일+20일 매수 (지속)' };
  }
  if (net5Value > 0 && net20Value != null && net20Value < 0) {
    return { score: 8, label: '외국인 20일 매도 → 5일 매수 반전' };
  }
  if (net5Value > 0) return { score: 5, label: '외국인 5일 매수 (단기)' };
  if (net5Value < 0 && net20Value != null && net20Value > 0) {
    return { score: 2, label: '외국인 20일 매수 + 단기 차익실현' };
  }
  if (net5Value < 0 && net20Value != null && net20Value < 0) {
    return { score: -6, label: '외국인 5일+20일 매도 지속' };
  }
  if (net5Value < 0) return { score: -3, label: '외국인 5일 매도' };
  return { score: 0, label: '외국인 수급 중립' };
}

// 영업이익 턴어라운드 감지 (Lynch · 박영옥)
// 적자→흑자, 급증, 회복, 안정 성장 4단계로 점수
function detectTurnaround(opIncomeArr) {
  if (!opIncomeArr || opIncomeArr.length < 2) return null;
  const valid = opIncomeArr.filter((x) => Number.isFinite(x?.value));
  if (valid.length < 2) return null;
  const recent = valid.at(-1).value;
  const prev = valid.at(-2).value;
  const beforePrev = valid.length >= 3 ? valid.at(-3).value : null;
  const fmtBn = (v) => `${(v / 1e8).toFixed(0)}억`;

  // 적자 → 흑자 전환 (가장 강력)
  if (prev < 0 && recent > 0) {
    return { score: 14, label: `영업익 적자→흑자 (${fmtBn(prev)}→${fmtBn(recent)})`, key: 'opTurnFlip' };
  }
  // 급증 (전년 대비 50%+)
  if (prev > 0 && recent > prev * 1.5) {
    return { score: 10, label: `영업익 +${Math.round((recent / prev - 1) * 100)}% 급증`, key: 'opSurge' };
  }
  // 회복 (감소 후 회복)
  if (beforePrev != null && beforePrev > 0 && prev > 0 && prev < beforePrev && recent > prev * 1.2) {
    return { score: 8, label: `영업익 회복 (${fmtBn(prev)}→${fmtBn(recent)})`, key: 'opRecovery' };
  }
  // 안정 성장 (3분기/년 연속 증가)
  if (valid.length >= 3 && valid.slice(-3).every((x, i, arr) => i === 0 || x.value > arr[i - 1].value) && recent > 0) {
    return { score: 6, label: '영업익 3분기 연속 성장', key: 'opSteady' };
  }
  // 악화 페널티
  if (prev > 0 && recent > 0 && recent < prev * 0.6) {
    return { score: -6, label: `영업익 둔화 -${Math.round((1 - recent / prev) * 100)}%`, key: 'opSlump' };
  }
  if (prev > 0 && recent < 0) {
    return { score: -10, label: `영업익 흑자→적자 (${fmtBn(prev)}→${fmtBn(recent)})`, key: 'opLoss' };
  }
  return null;
}

// 네이버 모바일 stock API에서 영업이익 시계열 추출
// 다양한 응답 형태에 대응 (네이버 응답 schema가 종목/시기별로 차이)
function walkForOpIncome(obj, depth = 0) {
  if (depth > 6 || obj == null) return null;
  if (Array.isArray(obj)) {
    if (obj.length >= 2 && obj.every((x) => x && typeof x === 'object')) {
      const keys = ['operatingIncome', '영업이익', 'OPERATING_INCOME', 'operatingProfit', 'OPERATING_PROFIT', 'opIncome'];
      const matchKey = keys.find((k) => obj[0][k] !== undefined);
      if (matchKey) {
        return obj.map((x) => ({
          period: x.period ?? x.PERIOD ?? x.term ?? x.bsnsYr ?? x.fiscalYear ?? x.YYYY ?? null,
          value: cleanNumber(x[matchKey]),
        })).filter((x) => Number.isFinite(x.value));
      }
    }
    for (const item of obj) {
      const r = walkForOpIncome(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (/영업이익|operatingIncome|operatingProfit|OPERATING_(INCOME|PROFIT)/i.test(key) && Array.isArray(val)) {
        const arr = val.map((x) => (typeof x === 'object' && x ? cleanNumber(x.value ?? x.amt ?? x.amount ?? x.v) : cleanNumber(x)))
          .filter((v) => Number.isFinite(v));
        if (arr.length >= 2) return arr.map((value, i) => ({ period: i, value }));
      }
      const r = walkForOpIncome(val, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

async function fetchFinancials(code) {
  const tries = [
    `https://m.stock.naver.com/api/stock/${code}/finance/main`,
    `https://m.stock.naver.com/api/stock/${code}/finance`,
    `https://m.stock.naver.com/api/stock/${code}/integration`,
  ];
  for (const url of tries) {
    try {
      const data = await fetchJson(url, {
        headers: headers({
          referer: `https://m.stock.naver.com/domestic/stock/${code}/finance`,
          accept: 'application/json,text/plain,*/*',
        }),
      }, 4500);
      const op = walkForOpIncome(data);
      if (op && op.length >= 2) return { operatingIncome: op };
    } catch {}
  }
  return null;
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

  // === Wyckoff Spring (저점 가짜 이탈 후 회복) ===
  if (rows.length >= 40 && close) {
    const last20 = rows.slice(-20);
    const last20Lows = last20.map((p) => p.low ?? p.close).filter(Number.isFinite);
    const localMin = Math.min(...last20Lows);
    const localMinIdx = last20Lows.indexOf(localMin);
    const daysSinceLow = last20Lows.length - 1 - localMinIdx;
    const prevWindow = rows.slice(-40, -20).map((p) => p.low ?? p.close).filter(Number.isFinite);
    const prevMin = prevWindow.length ? Math.min(...prevWindow) : null;
    const wasNewLow = prevMin != null && localMin < prevMin * 1.01;
    const recoveryPct = ((close - localMin) / localMin) * 100;
    if (wasNewLow && daysSinceLow >= 3 && daysSinceLow <= 15 && recoveryPct >= 5 && recoveryPct < 25) {
      const strong = volRatio != null && volRatio >= 1.5 && last && Number.isFinite(last.open) && last.close > last.open;
      patterns.push({
        key: 'spring',
        label: 'Wyckoff Spring',
        source: 'Wyckoff 저점 가짜 이탈',
        score: strong ? 22 : 16,
        detail: `${daysSinceLow}일 전 저점 ${localMin.toFixed(0)} → +${recoveryPct.toFixed(1)}% 회복${strong ? ' (거래량 동반)' : ''}`,
      });
    }
  }

  // === MACD 골든크로스 (Murphy) — 0선 위 우선 ===
  const closesArr = rows.map((p) => p.close).filter(Number.isFinite);
  if (closesArr.length >= 35) {
    const calcEma = (arr, period) => {
      if (arr.length < period) return null;
      const k = 2 / (period + 1);
      let e = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
      const out = new Array(arr.length).fill(null);
      out[period - 1] = e;
      for (let i = period; i < arr.length; i += 1) {
        e = arr[i] * k + e * (1 - k);
        out[i] = e;
      }
      return out;
    };
    const ema12 = calcEma(closesArr, 12);
    const ema26 = calcEma(closesArr, 26);
    if (ema12 && ema26) {
      const macdLine = closesArr.map((_, i) => (ema12[i] != null && ema26[i] != null ? ema12[i] - ema26[i] : null));
      const macdValid = macdLine.filter((v) => v != null);
      if (macdValid.length >= 11) {
        const signalArr = calcEma(macdValid, 9);
        if (signalArr) {
          const lastM = macdValid[macdValid.length - 1];
          const prevM = macdValid[macdValid.length - 2];
          const lastS = signalArr[signalArr.length - 1];
          const prevS = signalArr[signalArr.length - 2];
          const lastHist = lastM - lastS;
          const prevHist = prevM - prevS;
          const goldenCross = prevHist <= 0 && lastHist > 0;
          const aboveZero = lastM > 0;
          if (goldenCross) {
            patterns.push({
              key: 'macdGolden',
              label: aboveZero ? 'MACD 골든크로스 (0선 위)' : 'MACD 골든크로스',
              source: 'Murphy MACD',
              score: aboveZero ? 14 : 8,
              detail: `MACD ${lastM.toFixed(2)} > Signal ${lastS.toFixed(2)} · hist ${prevHist.toFixed(2)}→${lastHist.toFixed(2)}`,
            });
          }
        }
      }
    }
  }

  // === 양봉 + 구름대 돌파 (Honma · 일목) ===
  if (rows.length >= 53 && last && prev) {
    const calcCloud = (arr) => {
      const window = (n) => arr.slice(-n);
      const hi = (n) => Math.max(...window(n).flatMap((p) => [p.high, p.close]).filter(Number.isFinite));
      const lo = (n) => Math.min(...window(n).flatMap((p) => [p.low, p.close]).filter(Number.isFinite));
      if (arr.length < 52) return null;
      const tenkan = (hi(9) + lo(9)) / 2;
      const kijun = (hi(26) + lo(26)) / 2;
      const spanA = (tenkan + kijun) / 2;
      const spanB = (hi(52) + lo(52)) / 2;
      return { tenkan, kijun, spanA, spanB, top: Math.max(spanA, spanB), bottom: Math.min(spanA, spanB), bull: spanA > spanB };
    };
    const cloudNow = calcCloud(rows);
    const cloudPrev = calcCloud(rows.slice(0, -1));
    if (cloudNow && cloudPrev) {
      const isBull = Number.isFinite(last.open) && last.close > last.open;
      const yestBelowOrIn = prev.close <= cloudPrev.top;
      const todayAbove = close > cloudNow.top;
      const strongVol = volRatio != null && volRatio >= 1.4;
      if (yestBelowOrIn && todayAbove && isBull) {
        patterns.push({
          key: 'cloudBreak',
          label: '양봉 + 구름대 돌파',
          source: 'Honma · 일목',
          score: strongVol ? 18 : 12,
          detail: `구름 상단 ${cloudNow.top.toFixed(0)} 돌파 · 양봉${strongVol ? ` + 거래량 ${volRatio.toFixed(1)}배` : ''}${cloudNow.bull ? ' · 양운' : ' · 음운'}`,
        });
      }
    }
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
  const [summary, rows, financials] = await Promise.all([
    fetchSummary(stock.code),
    fetchHistory(stock.code),
    fetchFinancials(stock.code),
  ]);
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
  const foreignAnalysis = scoreForeign(foreign);
  const turnaround = financials ? detectTurnaround(financials.operatingIncome) : null;
  const suffix = stock.market === 'KOSDAQ150' ? '.KQ' : '.KS';
  const score = Math.max(0, Math.min(100,
    detected.patterns.reduce((sum, p) => sum + p.score, 0)
    + foreignAnalysis.score
    + (turnaround?.score ?? 0)
    + (detected.highGap != null && detected.highGap >= -5 ? 8 : 0)
    + (summary.per != null && summary.per > 0 && summary.per < 45 ? 4 : 0)
  ));
  return {
    ...stock,
    symbol: `${stock.code}${suffix}`,
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
    foreignAnalysis,
    turnaround,
    score,
    dataReasons: {
      foreign: foreign.rateNow == null ? '네이버 일봉에 외국인 보유율이 없어 계산 불가' : foreign.note,
      per: summary.per == null ? '네이버 요약 PER 미제공' : '',
      financials: financials ? '네이버 모바일 재무 API에서 영업이익 시계열 추출' : '재무 데이터 미연결 — 턴어라운드 점수 0',
    },
  };
}

// G. 시장 환경 게이트 (정규준 강조)
// 코스피·코스닥 각각 200일선 위/아래 + 우상향 여부로 강세/중립/약세 판정
async function fetchYahooHistory(symbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
    const data = await fetchJson(url, { headers: headers() }, 6500);
    const result = data?.chart?.result?.[0];
    return (result?.indicators?.quote?.[0]?.close || []).filter(Number.isFinite);
  } catch {
    return [];
  }
}

function judgeMarket(closes) {
  if (closes.length < 220) return { env: 'unknown', label: '데이터 대기', last: null, ma200: null };
  const last = closes.at(-1);
  const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
  const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const ma200Prev = closes.slice(-220, -20).reduce((a, b) => a + b, 0) / 200;
  const above200 = last > ma200;
  const rising200 = ma200 > ma200Prev * 1.005;
  const above50 = last > ma50;
  let env = 'neutral', label = '중립';
  if (above200 && rising200) { env = 'bull'; label = '강세장'; }
  else if (!above200 && !rising200) { env = 'bear'; label = '약세장'; }
  else if (above200 && above50) { env = 'recovering'; label = '회복 시도'; }
  return { env, label, last, ma200, ma50, ma200Prev, above200, rising200 };
}

async function getMarketEnvironment() {
  const [kospiCloses, kosdaqCloses] = await Promise.all([
    fetchYahooHistory('^KS11'),
    fetchYahooHistory('^KQ11'),
  ]);
  const kospi = judgeMarket(kospiCloses);
  const kosdaq = judgeMarket(kosdaqCloses);
  const penaltyMap = { bull: 0, recovering: -3, neutral: -5, bear: -10, unknown: 0 };
  const note = (m) => {
    if (m.env === 'bull') return '200일선 위 + 우상향 — 종목 선택 폭이 넓습니다.';
    if (m.env === 'bear') return '200일선 아래 + 둔화 — Spring/회복 패턴 외엔 보수적으로.';
    if (m.env === 'recovering') return '회복 시도 중 — 점수 -3 페널티 (정규준식 신중).';
    if (m.env === 'neutral') return '추세 혼재 — 점수 -5 페널티.';
    return '시장 데이터 대기.';
  };
  return {
    kospi: { ...kospi, penalty: penaltyMap[kospi.env], note: note(kospi) },
    kosdaq: { ...kosdaq, penalty: penaltyMap[kosdaq.env], note: note(kosdaq) },
  };
}

// F. 섹터 강도 (김종봉 강조)
// 주요 섹터 ETF의 52주 고점 거리 → 신고가권 섹터에 속하는 종목에 가산
async function getSectorStrength() {
  const settled = await Promise.allSettled(SECTOR_ETFS.map(async (s) => {
    const [summary, history] = await Promise.all([fetchSummary(s.code), fetchHistory(s.code)]);
    if (history.length < 60) return null;
    const last = summary.price ?? history.at(-1)?.close ?? null;
    if (!last) return null;
    const high52 = Math.max(...history.flatMap((p) => [p.high, p.close]).filter(Number.isFinite));
    const ma200 = history.length >= 200 ? avg(history.slice(-200).map((p) => p.close)) : null;
    const gap = (last - high52) / high52 * 100;
    const isStrong = gap >= -3;
    const status = gap >= -1 ? '신고가' : gap >= -3 ? '신고가권' : gap >= -10 ? '강세' : gap >= -25 ? '조정' : '약세';
    return { ...s, last, high52, gap, ma200, isStrong, status };
  }));
  return settled.map((r) => (r.status === 'fulfilled' ? r.value : null)).filter(Boolean);
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
    const [kospi200, kosdaq150, marketEnv, sectorStrength] = await Promise.all([
      fetchKospi200(),
      fetchKosdaq150(),
      getMarketEnvironment(),
      getSectorStrength(),
    ]);
    const universe = scope === 'kospi200' ? kospi200 : scope === 'kosdaq150' ? kosdaq150 : [...kospi200, ...kosdaq150];
    const scanned = await mapLimit(uniqueUniverse(universe), 24, (stock) => scanOne(stock, minValue));
    const reasonStats = formatReasonStats(scanned);

    // 신고가권 섹터 (가산점 대상)
    const strongSectors = sectorStrength.filter((s) => s.isStrong).map((s) => s.tag);
    const sectorBonusMap = {
      // 종목 키워드 → 섹터 태그 매핑 (가산점 적용용)
      semicon: /반도체|메모리|HBM|소부장/i,
      battery: /2차전지|배터리|양극재|음극재|전해질|분리막/i,
      energy: /화학|정유|에너지|탄소중립/i,
      bio: /바이오|제약|신약|헬스/i,
      healthcare: /의료|병원|진단/i,
    };

    function applyAdjustments(row) {
      if (!row || row.excluded) return row;
      const isKosdaq = row.market === 'KOSDAQ150';
      const env = isKosdaq ? marketEnv.kosdaq : marketEnv.kospi;
      const marketPenalty = env.penalty || 0;
      let sectorBonus = 0;
      let sectorMatched = null;
      for (const tag of strongSectors) {
        const re = sectorBonusMap[tag];
        if (re && re.test(`${row.name || ''}`)) {
          sectorBonus = 5;
          sectorMatched = tag;
          break;
        }
      }
      const baseScore = row.score || 0;
      const adjustedScore = Math.max(0, Math.min(100, baseScore + marketPenalty + sectorBonus));
      return {
        ...row,
        baseScore,
        marketPenalty,
        marketEnv: env.label,
        sectorBonus,
        sectorMatched,
        score: adjustedScore,
      };
    }

    const adjusted = scanned.map(applyAdjustments);
    let candidates = adjusted.filter((row) => row && !row.excluded && row.patterns?.length);
    if (pattern !== 'all') candidates = candidates.filter((row) => row.patterns.some((p) => p.key === pattern) || (pattern === 'foreignStrong' && row.foreign?.net5Value > 0 && (row.foreign?.strength ?? 0) >= 1));
    candidates.sort((a, b) => b.score - a.score || (b.avgValue20 || 0) - (a.avgValue20 || 0));
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      scope,
      pattern,
      minValue,
      universe: { kospi200: kospi200.length, kosdaq150: kosdaq150.length, total: uniqueUniverse(universe).length },
      scanned: scanned.length,
      liquidityPassed: adjusted.filter((row) => row && !row.excluded).length,
      candidateCount: candidates.length,
      reasonStats,
      marketEnv,
      sectorStrength,
      sourceNotes: [
        'KOSPI200 구성은 네이버 KPI200 편입종목 페이지를 사용합니다.',
        'KOSDAQ150 구성은 Investing 구성종목 페이지를 우선 사용하고 실패 시 로컬 예비 목록을 사용합니다.',
        '외국인 수급 점수: 5일·20일 순매수 모두 양수면 +10~14, 20일 매도→5일 매수 반전이면 +8 (김종봉/정규준식).',
        '영업이익 턴어라운드(Lynch/박영옥식): 적자→흑자 전환 +14, 급증 +10, 회복 +8, 안정 성장 +6, 둔화/적자 전환 페널티.',
        '시장 환경 게이트(정규준식): KOSPI/KOSDAQ 200일선 기준 강세/중립/약세 판정 후 점수에 페널티(-3 ~ -10) 적용.',
        '섹터 강도(김종봉식): 주요 섹터 ETF가 신고가권일 때 해당 섹터 종목에 +5 보너스.',
        '재무 데이터는 네이버 모바일 stock API에서 영업이익 시계열을 추출합니다. 응답 schema가 종목별로 차이가 있어 일부 종목은 미연결될 수 있습니다.',
      ],
      items: candidates.slice(0, limit),
    });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
