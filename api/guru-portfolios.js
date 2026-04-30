const SEC_SUBMISSIONS = 'https://data.sec.gov/submissions';
const SEC_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';
const HOUSE_TRANSACTIONS = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';
const UA = 'market-dashboard/1.0 contact@example.com';

const DEFAULT_MANAGERS = [
  { key: 'duquesne', name: 'Duquesne', person: 'Stanley Druckenmiller', cik: '0001536411' },
  { key: 'berkshire', name: 'Berkshire Hathaway', person: 'Warren Buffett', cik: '0001067983' },
  { key: 'pershing', name: 'Pershing Square', person: 'Bill Ackman', cik: '0001336528' },
  { key: 'appaloosa', name: 'Appaloosa', person: 'David Tepper', cik: '0001006438' },
  { key: 'bridgewater', name: 'Bridgewater', person: 'Ray Dalio', cik: '0001350694' },
  { key: 'scion', name: 'Scion', person: 'Michael Burry', cik: '0001649339' },
  { key: 'tiger', name: 'Tiger Global', person: 'Chase Coleman', cik: '0001167483' },
];

const PUBLIC_DISCLOSURE_MANAGERS = [
  { key: 'pelosi', name: 'Pelosi Tracker', person: 'Nancy Pelosi', sourceType: 'stock-act', matcher: /pelosi/i },
];

const TICKER_HINTS = [
  ['NATERA', 'NTRA'], ['INSMED', 'INSM'], ['TEVA', 'TEVA'], ['TAIWAN SEMICONDUCTOR', 'TSM'],
  ['COUPANG', 'CPNG'], ['WOODWARD', 'WWD'], ['COHERENT', 'COHR'], ['VISTRA', 'VST'],
  ['NVIDIA', 'NVDA'], ['MICROSOFT', 'MSFT'], ['AMAZON', 'AMZN'], ['ALPHABET', 'GOOGL'],
  ['META PLATFORMS', 'META'], ['APPLE', 'AAPL'], ['TESLA', 'TSLA'], ['BROADCOM', 'AVGO'],
  ['TAKE-TWO', 'TTWO'], ['UBER', 'UBER'], ['SERVICENOW', 'NOW'], ['SALESFORCE', 'CRM'],
  ['BANK OF AMERICA', 'BAC'], ['AMERICAN EXPRESS', 'AXP'], ['COCA COLA', 'KO'],
  ['OCCIDENTAL', 'OXY'], ['CHEVRON', 'CVX'], ['MOODYS', 'MCO'], ['KRAFT HEINZ', 'KHC'],
  ['CHUBB', 'CB'], ['DAVITA', 'DVA'], ['CITIGROUP', 'C'], ['VISA', 'V'], ['MASTERCARD', 'MA'],
  ['SPDR S&P REGIONAL BANKING', 'KRE'], ['FINANCIAL SELECT SECTOR', 'XLF'],
  ['INVESCO S&P 500 EQUAL WEIGHT', 'RSP'], ['SPDR S&P 500 ETF', 'SPY'],
  ['INVESCO QQQ', 'QQQ'], ['ISHARES RUSSELL 2000', 'IWM'], ['ISHARES 20+ YEAR TREASURY', 'TLT'],
  ['ENERGY SELECT SECTOR', 'XLE'], ['TECHNOLOGY SELECT SECTOR', 'XLK'],
  ['ALLIANCEBERNSTEIN', 'AB'], ['PALANTIR', 'PLTR'], ['TEMPUS AI', 'TEM'],
];

function secHeaders() {
  return { accept: 'application/json,text/xml,text/plain,*/*', 'user-agent': UA };
}

async function getText(url, timeout = 12000) {
  const res = await fetch(url, { headers: secHeaders(), signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function getJson(url, timeout = 12000) {
  const res = await fetch(url, { headers: secHeaders(), signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function cik10(cik) {
  return String(cik).replace(/\D/g, '').padStart(10, '0');
}

function cikNoZero(cik) {
  return String(Number(String(cik).replace(/\D/g, '')));
}

function noDash(accession) {
  return String(accession || '').replace(/-/g, '');
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function tagValue(block, tag) {
  const re = new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, 'i');
  const match = block.match(re);
  return match ? decodeEntities(match[1]) : '';
}

function num(value) {
  const n = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeIssuer(name = '') {
  return String(name).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveTicker(name) {
  const normalized = normalizeIssuer(name);
  const hit = TICKER_HINTS.find(([needle]) => normalized.includes(needle));
  return hit?.[1] || '';
}

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return null;
}

function dateIso(value) {
  const d = parseDate(value);
  return d ? d.toISOString().slice(0, 10) : '';
}

function amountMidpoint(amount) {
  const nums = String(amount || '').match(/\$?[\d,]+/g)?.map((x) => Number(x.replace(/[^\d]/g, ''))).filter(Number.isFinite) || [];
  if (!nums.length) return null;
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function publicTradeTicker(row) {
  const t = String(row.ticker || row.symbol || '').replace(/[^A-Z.]/gi, '').toUpperCase();
  if (t && t !== '--') return t;
  return resolveTicker(row.asset_description || row.assetDescription || row.issuer || '');
}

function publicTradePerson(row) {
  return String(row.representative || row.name || row.office || `${row.first_name || ''} ${row.last_name || ''}`).trim();
}

async function loadPublicDisclosureManager(manager) {
  const data = await getJson(HOUSE_TRANSACTIONS, 15000);
  const rows = Array.isArray(data) ? data : [];
  const filtered = rows
    .filter((row) => manager.matcher.test(publicTradePerson(row)))
    .map((row) => ({
      ...row,
      ticker: publicTradeTicker(row),
      tradeDate: dateIso(row.transaction_date || row.transactionDate),
      disclosureDate: dateIso(row.disclosure_date || row.disclosureDate || row.filing_date),
      amountUsd: amountMidpoint(row.amount),
      tradeType: String(row.type || '').toLowerCase(),
      issuer: row.asset_description || row.assetDescription || row.issuer || '',
    }))
    .filter((row) => row.ticker)
    .sort((a, b) => (parseDate(b.disclosureDate || b.tradeDate)?.getTime() || 0) - (parseDate(a.disclosureDate || a.tradeDate)?.getTime() || 0))
    .slice(0, 40);

  const byTicker = new Map();
  filtered.forEach((row) => {
    const key = row.ticker;
    if (!byTicker.has(key)) {
      byTicker.set(key, {
        issuer: row.issuer || key,
        title: 'STOCK Act',
        cusip: `PUBLIC-${key}`,
        ticker: key,
        value: 0,
        valueUsd: 0,
        shares: null,
        weightPct: null,
        statusKey: 'held',
        statusLabel: '공시',
        transactions: 0,
        latestTradeDate: row.tradeDate,
        amountLabel: row.amount || '',
      });
    }
    const item = byTicker.get(key);
    const usd = row.amountUsd || 0;
    const isSale = /sale|sold/i.test(row.tradeType);
    const isBuy = /purchase|buy|bought/i.test(row.tradeType);
    item.valueUsd += Math.max(usd, 0);
    item.value += Math.max(usd, 0) / 1000;
    item.transactions += 1;
    item.latestTradeDate = row.tradeDate || item.latestTradeDate;
    item.statusKey = isSale && !isBuy ? 'reduced' : isBuy ? 'new' : item.statusKey;
    item.statusLabel = item.statusKey === 'reduced' ? '매도' : item.statusKey === 'new' ? '매수' : '공시';
    item.amountLabel = row.amount || item.amountLabel;
  });

  const holdings = [...byTicker.values()].sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
  const totalValue = holdings.reduce((sum, row) => sum + (row.value || 0), 0);
  const max = Math.max(...holdings.map((row) => row.value || 0), 0);
  const enriched = holdings.map((row) => ({ ...row, weightPct: totalValue ? (row.value / totalValue) * 100 : max ? (row.value / max) * 100 : null }));

  return {
    ...manager,
    latest: {
      accessionNumber: 'STOCK-ACT',
      filingDate: filtered[0]?.disclosureDate || '',
      reportDate: filtered[0]?.tradeDate || filtered[0]?.disclosureDate || '',
      infoTableUrl: HOUSE_TRANSACTIONS,
      totalValue,
      holdingsCount: enriched.length,
    },
    previous: null,
    holdings: enriched,
  };
}

function parseInfoTable(xml) {
  const blocks = [...xml.matchAll(/<(?:\w+:)?infoTable\b[\s\S]*?<\/(?:\w+:)?infoTable>/gi)].map((m) => m[0]);
  return blocks.map((block) => {
    const issuer = tagValue(block, 'nameOfIssuer');
    const title = tagValue(block, 'titleOfClass');
    const cusip = tagValue(block, 'cusip').toUpperCase();
    const value = num(tagValue(block, 'value'));
    const shares = num(tagValue(block, 'sshPrnamt'));
    const putCall = tagValue(block, 'putCall').toUpperCase();
    return {
      issuer,
      title,
      cusip,
      value,
      valueUsd: value != null ? value * 1000 : null,
      shares,
      putCall,
      ticker: resolveTicker(issuer),
    };
  }).filter((row) => row.issuer && row.cusip && row.value != null);
}

async function filingRows(cik) {
  const data = await getJson(`${SEC_SUBMISSIONS}/CIK${cik10(cik)}.json`);
  const recent = data?.filings?.recent || {};
  const accessions = recent.accessionNumber || [];
  return accessions.map((accessionNumber, i) => ({
    accessionNumber,
    form: recent.form?.[i],
    filingDate: recent.filingDate?.[i],
    reportDate: recent.reportDate?.[i],
    primaryDocument: recent.primaryDocument?.[i],
  })).filter((row) => /^13F-HR/i.test(row.form || ''));
}

async function infoTableUrl(cik, accession) {
  const base = `${SEC_ARCHIVES}/${cikNoZero(cik)}/${noDash(accession)}`;
  const index = await getJson(`${base}/index.json`);
  const files = index?.directory?.item || [];
  const xml = files.find((f) => /info.*table.*\.xml$/i.test(f.name))
    || files.find((f) => /form13f.*\.xml$/i.test(f.name))
    || files.find((f) => /\.xml$/i.test(f.name) && !/primary_doc/i.test(f.name));
  if (!xml?.name) throw new Error('13F information table XML not found');
  return `${base}/${xml.name}`;
}

async function loadFiling(manager, filing) {
  const url = await infoTableUrl(manager.cik, filing.accessionNumber);
  const xml = await getText(url);
  const holdings = parseInfoTable(xml);
  const totalValue = holdings.reduce((sum, row) => sum + (row.value || 0), 0);
  const enriched = holdings.map((row) => ({
    ...row,
    weightPct: totalValue ? (row.value / totalValue) * 100 : null,
  })).sort((a, b) => (b.value || 0) - (a.value || 0));
  return { ...filing, infoTableUrl: url, totalValue, holdings: enriched };
}

function compareHoldings(current, previous) {
  const prevMap = new Map((previous?.holdings || []).map((row) => [`${row.cusip}:${row.putCall || ''}`, row]));
  return (current?.holdings || []).map((row) => {
    const prev = prevMap.get(`${row.cusip}:${row.putCall || ''}`);
    const valueChangePct = prev?.value ? ((row.value / prev.value) - 1) * 100 : null;
    const shareChangePct = prev?.shares ? ((row.shares / prev.shares) - 1) * 100 : null;
    const statusKey = !prev ? 'new'
      : valueChangePct != null && valueChangePct >= 20 ? 'increased'
        : valueChangePct != null && valueChangePct <= -20 ? 'reduced'
          : 'held';
    const statusLabel = statusKey === 'new' ? '신규'
      : statusKey === 'increased' ? '증가'
        : statusKey === 'reduced' ? '감소'
          : '유지';
    return { ...row, previousValue: prev?.value ?? null, valueChangePct, shareChangePct, statusKey, statusLabel };
  });
}

async function loadManager(manager) {
  const rows = await filingRows(manager.cik);
  const latestMeta = rows.find((row) => row.form === '13F-HR') || rows[0];
  const previousMeta = rows.find((row) => row.accessionNumber !== latestMeta?.accessionNumber && row.form === '13F-HR')
    || rows.find((row) => row.accessionNumber !== latestMeta?.accessionNumber);
  if (!latestMeta) throw new Error('13F filing not found');
  const [latest, previous] = await Promise.all([
    loadFiling(manager, latestMeta),
    previousMeta ? loadFiling(manager, previousMeta).catch(() => null) : Promise.resolve(null),
  ]);
  const holdings = compareHoldings(latest, previous);
  const totalValue = holdings.reduce((sum, row) => sum + (row.value || 0), 0);
  return {
    ...manager,
    latest: {
      accessionNumber: latest.accessionNumber,
      filingDate: latest.filingDate,
      reportDate: latest.reportDate,
      infoTableUrl: latest.infoTableUrl,
      totalValue,
      holdingsCount: holdings.length,
    },
    previous: previous ? {
      accessionNumber: previous.accessionNumber,
      filingDate: previous.filingDate,
      reportDate: previous.reportDate,
      totalValue: previous.totalValue,
      holdingsCount: previous.holdings.length,
    } : null,
    holdings,
  };
}

async function mapLimit(items, limit, worker) {
  const out = [];
  let idx = 0;
  async function run() {
    while (idx < items.length) {
      const current = idx;
      idx += 1;
      try {
        out[current] = await worker(items[current], current);
      } catch (error) {
        out[current] = { ...items[current], error: String(error?.message || error), holdings: [] };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

function buildConsensus(managers) {
  const map = new Map();
  managers.forEach((manager) => {
    const perManager = new Map();
    (manager.holdings || []).forEach((row) => {
      const key = row.ticker || row.cusip;
      if (!key) return;
      if (!perManager.has(key)) {
        perManager.set(key, {
          key,
          ticker: row.ticker,
          issuer: row.issuer,
          cusip: row.cusip,
          value: 0,
          weightPct: 0,
          rows: 0,
        });
      }
      const aggregate = perManager.get(key);
      aggregate.value += row.value || 0;
      aggregate.weightPct += row.weightPct || 0;
      aggregate.rows += 1;
    });
    perManager.forEach((row, key) => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          ticker: row.ticker,
          issuer: row.issuer,
          cusip: row.cusip,
          managers: [],
          totalValue: 0,
          totalWeight: 0,
        });
      }
      const item = map.get(key);
      item.managers.push({ key: manager.key, name: manager.name, person: manager.person, weightPct: row.weightPct, value: row.value, rows: row.rows });
      item.totalValue += row.value || 0;
      item.totalWeight += row.weightPct || 0;
    });
  });
  return [...map.values()]
    .filter((row) => row.managers.length >= 2)
    .sort((a, b) => b.managers.length - a.managers.length || b.totalValue - a.totalValue)
    .map((row) => ({ ...row, managerCount: row.managers.length, totalValueUsd: row.totalValue * 1000 }))
    .slice(0, 30);
}

function buildMoves(managers, type) {
  return managers.flatMap((manager) => (manager.holdings || [])
    .filter((row) => type === 'buy' ? row.statusKey === 'new' || (row.valueChangePct ?? 0) >= 30 : (row.valueChangePct ?? 0) <= -30)
    .map((row) => ({ ...row, manager: manager.name, person: manager.person })))
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 30);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const limit = Math.max(5, Math.min(25, Number(req.query.limit || 12)));
  const keys = String(req.query.managers || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const allManagers = [...DEFAULT_MANAGERS, ...PUBLIC_DISCLOSURE_MANAGERS];
  const selected = keys.length ? allManagers.filter((m) => keys.includes(m.key)) : allManagers;

  try {
    const managers = await mapLimit(selected, 3, (manager) => (
      manager.sourceType === 'stock-act' ? loadPublicDisclosureManager(manager) : loadManager(manager)
    ));
    const okManagers = managers.filter((m) => !m.error);
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      caveat: '13F와 STOCK Act 공시는 지연 공개 자료입니다. 현금, 숏, 파생·비상장 포지션이 빠질 수 있어 매수 신호가 아니라 아이디어 출처로만 봅니다.',
      managers: managers.map((manager) => ({
        ...manager,
        holdings: (manager.holdings || []).slice(0, limit),
      })),
      consensus: buildConsensus(okManagers),
      buys: buildMoves(okManagers, 'buy'),
      reductions: buildMoves(okManagers, 'sell'),
    });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
