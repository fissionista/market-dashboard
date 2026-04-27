// 매크로 유동성 / 밸류에이션 데이터 묶음
// FRED public CSV endpoint를 사용 — 인증 키 필요 없음.

async function getText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(7000),
    headers: {
      accept: 'text/csv,text/plain,*/*',
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

async function getFredSeries(id) {
  const csv = await getText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`);
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, value] = line.split(',');
      const close = parseNum(value);
      return close == null || close <= 0 ? null : { t: new Date(date).getTime(), close, date };
    })
    .filter(Boolean);
}

function nWeeksAgo(series, n) {
  if (!series.length) return null;
  const lastT = series[series.length - 1].t;
  const targetT = lastT - n * 7 * 24 * 60 * 60 * 1000;
  let best = null;
  for (const p of series) {
    if (p.t <= targetT) best = p;
    else break;
  }
  return best;
}

function nMonthsAgo(series, n) {
  if (!series.length) return null;
  const last = series[series.length - 1];
  const target = new Date(last.date);
  target.setMonth(target.getMonth() - n);
  const targetT = target.getTime();
  let best = null;
  for (const p of series) {
    if (p.t <= targetT) best = p;
    else break;
  }
  return best;
}

async function tryFred(id) {
  try {
    const series = await getFredSeries(id);
    return series.length ? series : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=21600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // 병렬 요청
  const [m2, walcl, rrp, tga] = await Promise.all([
    tryFred('M2SL'),       // M2 (monthly, billions)
    tryFred('WALCL'),      // Fed Total Assets (weekly, millions)
    tryFred('RRPONTSYD'),  // Overnight Reverse Repo (daily, billions)
    tryFred('WTREGEN'),    // Treasury General Account (weekly, billions)
  ]);

  // M2 YoY 계산 (월별 데이터 → 12개월 전 값과 비교)
  let m2Latest = null, m2YoY = null;
  if (m2) {
    const last = m2[m2.length - 1];
    const yearAgo = nMonthsAgo(m2, 12);
    m2Latest = last ? { value: last.close, date: last.date } : null;
    if (last && yearAgo && yearAgo.close) {
      m2YoY = ((last.close - yearAgo.close) / yearAgo.close) * 100;
    }
  }

  // Net Liquidity 계산: WALCL(millions) - RRP(billions*1000) - TGA(billions*1000)
  // 단위 통일: 모두 millions of $로 환산.
  function alignByDate(seriesMap, refDates) {
    // refDates: 가장 sparse한 series의 날짜로 align
    return refDates.map((t) => {
      const out = { t };
      for (const [key, series] of Object.entries(seriesMap)) {
        if (!series) { out[key] = null; continue; }
        let best = null;
        for (const p of series) {
          if (p.t <= t) best = p;
          else break;
        }
        out[key] = best ? best.close : null;
      }
      return out;
    });
  }

  let netLiquidity = null;
  if (walcl) {
    const refDates = walcl.slice(-104).map((p) => p.t); // 최근 2년 주별
    const aligned = alignByDate({ walcl, rrp, tga }, refDates);
    const series = aligned
      .map((row) => {
        if (row.walcl == null) return null;
        const rrpM = (row.rrp ?? 0) * 1000;     // billions → millions
        const tgaM = (row.tga ?? 0) * 1000;
        return { t: row.t, value: row.walcl - rrpM - tgaM };
      })
      .filter(Boolean);

    const last = series[series.length - 1];
    const fourWeekAgo = series.length >= 5 ? series[series.length - 5] : null;
    const yearAgo = series.length >= 53 ? series[series.length - 53] : null;
    netLiquidity = {
      latest: last ? last.value : null,
      latestDate: last ? new Date(last.t).toISOString().slice(0, 10) : null,
      change4w: last && fourWeekAgo && fourWeekAgo.value
        ? ((last.value - fourWeekAgo.value) / Math.abs(fourWeekAgo.value)) * 100
        : null,
      change52w: last && yearAgo && yearAgo.value
        ? ((last.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100
        : null,
      walclLatest: walcl[walcl.length - 1]?.close ?? null,
      rrpLatest: rrp ? rrp[rrp.length - 1]?.close ?? null : null,
      tgaLatest: tga ? tga[tga.length - 1]?.close ?? null : null,
      series: series.slice(-104).map((p) => ({ t: p.t, close: p.value / 1_000_000 })), // trillions
    };
  }

  res.status(200).json({
    m2: m2Latest ? { ...m2Latest, yoy: m2YoY, series: m2.slice(-60).map((p) => ({ t: p.t, close: p.close })) } : null,
    netLiquidity,
    asOf: new Date().toISOString(),
  });
}
