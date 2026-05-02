import {
  DEFAULT_MIN_VALUE,
  analyzeKoreanStock,
  cleanNumber,
  decodeEscaped,
  decodeKor,
  getMarketEnvironment,
  getSectorStrength,
} from './lib/korea-analysis.js';

const NAVER_ENTRY = 'https://finance.naver.com/sise/entryJongmok.naver';
const INVESTING_KQ150 = 'https://kr.investing.com/indices/kosdaq-150-components';
const UA = 'Mozilla/5.0 market-dashboard/1.0';

const FALLBACK_KOSPI200 = [
  ['005930', '삼성전자'], ['000660', 'SK하이닉스'], ['005380', '현대차'],
  ['034020', '두산에너빌리티'], ['012450', '한화에어로스페이스'], ['207940', '삼성바이오로직스'],
  ['009150', '삼성전기'], ['006400', '삼성SDI'], ['035420', 'NAVER'], ['035720', '카카오'],
  ['267260', 'HD현대일렉트릭'], ['298040', '효성중공업'], ['010120', 'LS ELECTRIC'],
  ['042700', '한미반도체'], ['005490', 'POSCO홀딩스'], ['373220', 'LG에너지솔루션'],
  ['000270', '기아'], ['068270', '셀트리온'], ['105560', 'KB금융'], ['055550', '신한지주'],
  ['015760', '한국전력'], ['096770', 'SK이노베이션'], ['086790', '하나금융지주'], ['032830', '삼성생명'],
];

const FALLBACK_KOSDAQ150 = [
  ['000250', '삼천당제약'], ['086520', '에코프로'], ['247540', '에코프로비엠'],
  ['005290', '동진쎄미켐'], ['036830', '솔브레인'], ['240810', '원익IPS'],
  ['222800', '심텍'], ['058470', '리노공업'], ['178320', '서진시스템'],
  ['039030', '이오테크닉스'], ['067310', '하나마이크론'], ['095340', 'ISC'],
  ['196170', '알테오젠'], ['028300', 'HLB'], ['214450', '파마리서치'],
  ['214370', '케어젠'], ['112040', '위메이드'], ['145020', '휴젤'],
  ['089030', '테크윙'], ['032500', '케이엠더블유'], ['060250', 'NHN KCP'], ['141080', '리가켐바이오'],
];

function headers(extra = {}) {
  return { accept: 'application/json,text/html,text/plain,*/*', 'user-agent': UA, ...extra };
}

async function fetchText(url, options = {}, timeout = 9000, encoding = 'utf8') {
  const guard = AbortSignal.timeout(timeout);
  const res = await fetch(url, { ...options, signal: guard });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  if (encoding === 'euc-kr') return decodeKor(await res.arrayBuffer());
  return res.text();
}

function uniqueUniverse(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (!/^\d{6}$/.test(row.code) || seen.has(row.code)) return false;
    seen.add(row.code);
    return true;
  });
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
  const rows = uniqueUniverse(settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])));
  return rows.length ? rows : FALLBACK_KOSPI200.map(([code, name]) => ({ code, name, market: 'KOSPI200', source: 'fallback' }));
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
    const scanned = await mapLimit(uniqueUniverse(universe), 20, (stock) => analyzeKoreanStock(stock, {
      minValue,
      includeFinance: false,
      marketEnv,
      sectorStrength,
    }));
    const reasonStats = formatReasonStats(scanned);
    let candidates = scanned.filter((row) => row && !row.excluded && row.patterns?.length);
    if (pattern !== 'all') {
      candidates = candidates.filter((row) => row.patterns.some((p) => p.key === pattern)
        || (pattern === 'foreignStrong' && row.foreign?.net5Value > 0 && (row.foreign?.strength ?? 0) >= 1));
    }
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
      marketEnv,
      sectorStrength,
      sourceNotes: [
        '스캐너와 종목 클릭 모달은 같은 한국 종목 분석 엔진을 사용합니다.',
        'KOSPI200은 네이버 KPI200 편입 종목 페이지를 사용합니다.',
        'KOSDAQ150은 Investing 구성 종목 페이지를 우선 사용하고 실패 시 로컬 예비 목록을 사용합니다.',
        '외국인 5일 순매수는 외국인 보유율 변화와 시가총액 기반 추정치입니다.',
        '시장 환경 게이트(정규준식): KOSPI/KOSDAQ 200일선 기준 강세/회복/중립/약세 판정 후 점수 페널티(-3 ~ -10) 적용.',
        '섹터 강도(김종봉식): 주요 섹터 ETF가 신고가권일 때 해당 섹터 종목명 키워드 매칭 시 +5 보너스.',
      ],
      items: candidates.slice(0, limit),
    });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
