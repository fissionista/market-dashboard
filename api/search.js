function inferCountry(item) {
  const symbol = String(item.symbol || '');
  const exchange = String(item.exchDisp || item.exchange || '').toLowerCase();
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ') || exchange.includes('korea') || exchange.includes('kosdaq')) return 'KR';
  if (exchange.includes('nasdaq') || exchange.includes('nyse') || exchange.includes('amex') || exchange.includes('us')) return 'US';
  return 'ETC';
}

const ALIASES = [
  ['삼성전자', '005930.KS', '삼성전자', 'Korea', 'KR', '반도체 메모리 hbm ai 스마트폰'],
  ['삼전', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['삼성', '005930.KS', '삼성전자', 'Korea', 'KR'],
  ['삼성전자우', '005935.KS', '삼성전자우', 'Korea', 'KR'],
  ['sk하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR', '반도체 메모리 hbm ai'],
  ['에스케이하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['하이닉스', '000660.KS', 'SK하이닉스', 'Korea', 'KR'],
  ['한미반도체', '042700.KS', '한미반도체', 'Korea', 'KR', '반도체 hbm 장비 ai'],
  ['두산에너빌리티', '034020.KS', '두산에너빌리티', 'Korea', 'KR', '전력 에너지 원전 smr'],
  ['두산에너', '034020.KS', '두산에너빌리티', 'Korea', 'KR'],
  ['한국전력', '015760.KS', '한국전력', 'Korea', 'KR'],
  ['한전', '015760.KS', '한국전력', 'Korea', 'KR'],
  ['현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR', '전력 변압기 전력인프라'],
  ['hd현대일렉트릭', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['hd현대', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR'],
  ['ls', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR', '전력 전력인프라 변압기 배전'],
  ['ls일렉트릭', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['ls electric', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['엘에스일렉트릭', '010120.KS', 'LS ELECTRIC', 'Korea', 'KR'],
  ['ls전선', '006260.KS', 'LS', 'Korea', 'KR'],
  ['엘에스', '006260.KS', 'LS', 'Korea', 'KR'],
  ['전선', '001440.KS', '대한전선', 'Korea', 'KR', '전력 전선 전력인프라 구리 케이블'],
  ['대한전선', '001440.KS', '대한전선', 'Korea', 'KR', '전력 전선 케이블'],
  ['가온전선', '000500.KS', '가온전선', 'Korea', 'KR', '전력 전선 케이블'],
  ['효성중공업', '298040.KS', '효성중공업', 'Korea', 'KR', '전력 변압기 전력인프라'],
  ['일진전기', '103590.KS', '일진전기', 'Korea', 'KR', '전력 전선 변압기'],
  ['제룡전기', '033100.KQ', '제룡전기', 'Korea', 'KR', '전력 변압기'],
  ['산일전기', '062040.KS', '산일전기', 'Korea', 'KR', '전력 변압기'],
  ['한화에어로스페이스', '012450.KS', '한화에어로스페이스', 'Korea', 'KR'],
  ['한화에어로', '012450.KS', '한화에어로스페이스', 'Korea', 'KR'],
  ['한국항공우주', '047810.KS', '한국항공우주', 'Korea', 'KR'],
  ['kai', '047810.KS', '한국항공우주', 'Korea', 'KR'],
  ['lig넥스원', '079550.KS', 'LIG넥스원', 'Korea', 'KR'],
  ['넥스원', '079550.KS', 'LIG넥스원', 'Korea', 'KR'],
  ['네이버', '035420.KS', 'NAVER', 'Korea', 'KR'],
  ['naver', '035420.KS', 'NAVER', 'Korea', 'KR'],
  ['카카오', '035720.KS', '카카오', 'Korea', 'KR'],
  ['현대차', '005380.KS', '현대차', 'Korea', 'KR'],
  ['현대모비스', '012330.KS', '현대모비스', 'Korea', 'KR', '자동차 부품 자율주행'],
  ['만도', '204320.KS', 'HL만도', 'Korea', 'KR', '자동차 부품 자율주행'],
  ['hl만도', '204320.KS', 'HL만도', 'Korea', 'KR', '자동차 부품 자율주행'],
  ['한국타이어', '161390.KS', '한국타이어앤테크놀로지', 'Korea', 'KR', '자동차 타이어'],
  ['한온시스템', '018880.KS', '한온시스템', 'Korea', 'KR', '자동차 부품 공조'],
  ['기아', '000270.KS', '기아', 'Korea', 'KR'],
  ['셀트리온', '068270.KS', '셀트리온', 'Korea', 'KR'],
  ['셀트리온제약', '068760.KQ', '셀트리온제약', 'Korea', 'KR', '바이오 제약'],
  ['삼성바이오로직스', '207940.KS', '삼성바이오로직스', 'Korea', 'KR'],
  ['삼바', '207940.KS', '삼성바이오로직스', 'Korea', 'KR'],
  ['유한양행', '000100.KS', '유한양행', 'Korea', 'KR', '바이오 제약'],
  ['한미약품', '128940.KS', '한미약품', 'Korea', 'KR', '바이오 제약'],
  ['hlb', '028300.KQ', 'HLB', 'Korea', 'KR', '바이오 제약'],
  ['리가켐바이오', '141080.KQ', '리가켐바이오', 'Korea', 'KR', '바이오 제약'],
  ['삼천당제약', '000250.KQ', '삼천당제약', 'Korea', 'KR', '바이오 제약'],
  ['lg에너지솔루션', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['엘지에너지솔루션', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['lg엔솔', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR'],
  ['lg화학', '051910.KS', 'LG화학', 'Korea', 'KR'],
  ['포스코홀딩스', '005490.KS', 'POSCO홀딩스', 'Korea', 'KR'],
  ['posco', '005490.KS', 'POSCO홀딩스', 'Korea', 'KR'],
  ['포스코퓨처엠', '003670.KS', '포스코퓨처엠', 'Korea', 'KR'],
  ['에코프로비엠', '247540.KQ', '에코프로비엠', 'Korea', 'KR'],
  ['에코프로', '086520.KQ', '에코프로', 'Korea', 'KR'],
  ['에코프로머티', '450080.KS', '에코프로머티', 'Korea', 'KR', '2차전지 배터리 소재'],
  ['엘앤에프', '066970.KQ', '엘앤에프', 'Korea', 'KR', '2차전지 배터리 양극재'],
  ['천보', '278280.KQ', '천보', 'Korea', 'KR', '2차전지 배터리 소재'],
  ['대주전자재료', '078600.KQ', '대주전자재료', 'Korea', 'KR', '2차전지 배터리 실리콘 음극재'],
  ['나노신소재', '121600.KQ', '나노신소재', 'Korea', 'KR', '2차전지 배터리 소재'],
  ['알테오젠', '196170.KQ', '알테오젠', 'Korea', 'KR'],
  ['레인보우로보틱스', '277810.KQ', '레인보우로보틱스', 'Korea', 'KR'],
  ['로보티즈', '108490.KQ', '로보티즈', 'Korea', 'KR'],
  ['두산로보틱스', '454910.KS', '두산로보틱스', 'Korea', 'KR'],
  ['로봇', '277810.KQ', '레인보우로보틱스', 'Korea', 'KR', '로봇 휴머노이드 자동화'],
  ['뉴로메카', '348340.KQ', '뉴로메카', 'Korea', 'KR', '로봇 협동로봇 자동화'],
  ['에스피지', '058610.KQ', '에스피지', 'Korea', 'KR', '로봇 감속기 자동화'],
  ['로보스타', '090360.KQ', '로보스타', 'Korea', 'KR', '로봇 자동화'],
  ['카카오뱅크', '323410.KS', '카카오뱅크', 'Korea', 'KR'],
  ['크래프톤', '259960.KS', '크래프톤', 'Korea', 'KR'],
  ['카카오게임즈', '293490.KQ', '카카오게임즈', 'Korea', 'KR', '게임'],
  ['펄어비스', '263750.KQ', '펄어비스', 'Korea', 'KR', '게임'],
  ['넷마블', '251270.KS', '넷마블', 'Korea', 'KR', '게임'],
  ['엔씨소프트', '036570.KS', '엔씨소프트', 'Korea', 'KR', '게임'],
  ['하이브', '352820.KS', '하이브', 'Korea', 'KR'],
  ['jyp', '035900.KQ', 'JYP Ent.', 'Korea', 'KR', '엔터 엔터테인먼트 아이돌'],
  ['에스엠', '041510.KQ', '에스엠', 'Korea', 'KR', '엔터 엔터테인먼트 아이돌'],
  ['sm', '041510.KQ', '에스엠', 'Korea', 'KR', '엔터 엔터테인먼트 아이돌'],
  ['와이지', '122870.KQ', '와이지엔터테인먼트', 'Korea', 'KR', '엔터 엔터테인먼트 아이돌'],
  ['삼성sdi', '006400.KS', '삼성SDI', 'Korea', 'KR'],
  ['삼성전기', '009150.KS', '삼성전기', 'Korea', 'KR'],
  ['db하이텍', '000990.KS', 'DB하이텍', 'Korea', 'KR', '반도체 파운드리'],
  ['리노공업', '058470.KQ', '리노공업', 'Korea', 'KR', '반도체 장비 부품'],
  ['이오테크닉스', '039030.KQ', '이오테크닉스', 'Korea', 'KR', '반도체 장비'],
  ['원익ips', '240810.KQ', '원익IPS', 'Korea', 'KR', '반도체 장비'],
  ['주성엔지니어링', '036930.KQ', '주성엔지니어링', 'Korea', 'KR', '반도체 장비'],
  ['테스', '095610.KQ', '테스', 'Korea', 'KR', '반도체 장비'],
  ['하나마이크론', '067310.KQ', '하나마이크론', 'Korea', 'KR', '반도체 후공정'],
  ['심텍', '222800.KQ', '심텍', 'Korea', 'KR', '반도체 기판'],
  ['isc', '095340.KQ', 'ISC', 'Korea', 'KR', '반도체 테스트 소켓'],
  ['솔브레인', '357780.KQ', '솔브레인', 'Korea', 'KR', '반도체 소재'],
  ['동진쎄미켐', '005290.KQ', '동진쎄미켐', 'Korea', 'KR', '반도체 소재'],
  ['hpsp', '403870.KQ', 'HPSP', 'Korea', 'KR', '반도체 장비'],
  ['현대로템', '064350.KS', '현대로템', 'Korea', 'KR'],
  ['hd현대중공업', '329180.KS', 'HD현대중공업', 'Korea', 'KR'],
  ['현대중공업', '329180.KS', 'HD현대중공업', 'Korea', 'KR'],
  ['hd한국조선해양', '009540.KS', 'HD한국조선해양', 'Korea', 'KR'],
  ['한국조선해양', '009540.KS', 'HD한국조선해양', 'Korea', 'KR'],
  ['한화오션', '042660.KS', '한화오션', 'Korea', 'KR', '조선 방산 해양'],
  ['삼성중공업', '010140.KS', '삼성중공업', 'Korea', 'KR', '조선 해양'],
  ['현대미포', '010620.KS', 'HD현대미포', 'Korea', 'KR', '조선'],
  ['한화시스템', '272210.KS', '한화시스템', 'Korea', 'KR', '방산 우주 위성'],
  ['풍산', '103140.KS', '풍산', 'Korea', 'KR', '방산 구리'],
  ['kb금융', '105560.KS', 'KB금융', 'Korea', 'KR'],
  ['신한지주', '055550.KS', '신한지주', 'Korea', 'KR'],
  ['하나금융지주', '086790.KS', '하나금융지주', 'Korea', 'KR'],
  ['우리금융지주', '316140.KS', '우리금융지주', 'Korea', 'KR'],
  ['기업은행', '024110.KS', '기업은행', 'Korea', 'KR', '은행 금융 배당'],
  ['삼성화재', '000810.KS', '삼성화재', 'Korea', 'KR', '보험 금융 배당'],
  ['삼성생명', '032830.KS', '삼성생명', 'Korea', 'KR', '보험 금융 배당'],
  ['메리츠금융지주', '138040.KS', '메리츠금융지주', 'Korea', 'KR', '보험 금융 배당'],
  ['sk텔레콤', '017670.KS', 'SK텔레콤', 'Korea', 'KR', '통신 배당'],
  ['kt', '030200.KS', 'KT', 'Korea', 'KR', '통신 배당'],
  ['lg유플러스', '032640.KS', 'LG유플러스', 'Korea', 'KR', '통신 배당'],
  ['아모레퍼시픽', '090430.KS', '아모레퍼시픽', 'Korea', 'KR', '화장품 소비재'],
  ['lg생활건강', '051900.KS', 'LG생활건강', 'Korea', 'KR', '화장품 소비재'],
  ['cj제일제당', '097950.KS', 'CJ제일제당', 'Korea', 'KR', '음식료 소비재'],
  ['오리온', '271560.KS', '오리온', 'Korea', 'KR', '음식료 소비재'],
  ['농심', '004370.KS', '농심', 'Korea', 'KR', '음식료 소비재'],
  ['대한항공', '003490.KS', '대한항공', 'Korea', 'KR', '항공 여행'],
  ['호텔신라', '008770.KS', '호텔신라', 'Korea', 'KR', '여행 면세점'],
  ['이마트', '139480.KS', '이마트', 'Korea', 'KR', '유통 소비재'],
  ['반도체', '000660.KS', 'SK하이닉스', 'Korea', 'KR', '반도체 hbm ai 메모리'],
  ['반도체삼성', '005930.KS', '삼성전자', 'Korea', 'KR', '반도체 메모리 hbm ai'],
  ['반도체한미', '042700.KS', '한미반도체', 'Korea', 'KR', '반도체 hbm 장비'],
  ['전력', '267260.KS', 'HD현대일렉트릭', 'Korea', 'KR', '전력 변압기 전력인프라'],
  ['전력두산', '034020.KS', '두산에너빌리티', 'Korea', 'KR', '전력 원전 에너지'],
  ['방산', '012450.KS', '한화에어로스페이스', 'Korea', 'KR', '방산 우주 항공'],
  ['방산lig', '079550.KS', 'LIG넥스원', 'Korea', 'KR', '방산 미사일'],
  ['조선', '329180.KS', 'HD현대중공업', 'Korea', 'KR', '조선 해양'],
  ['조선한화', '042660.KS', '한화오션', 'Korea', 'KR', '조선 해양 방산'],
  ['바이오', '196170.KQ', '알테오젠', 'Korea', 'KR', '바이오 제약'],
  ['바이오셀트리온', '068270.KS', '셀트리온', 'Korea', 'KR', '바이오 제약'],
  ['2차전지', '373220.KS', 'LG에너지솔루션', 'Korea', 'KR', '2차전지 배터리'],
  ['배터리', '006400.KS', '삼성SDI', 'Korea', 'KR', '2차전지 배터리'],
  ['게임', '259960.KS', '크래프톤', 'Korea', 'KR', '게임'],
  ['엔터', '352820.KS', '하이브', 'Korea', 'KR', '엔터 엔터테인먼트 아이돌'],
  ['금융', '105560.KS', 'KB금융', 'Korea', 'KR', '은행 금융 배당'],
  ['화장품', '090430.KS', '아모레퍼시픽', 'Korea', 'KR', '화장품 소비재'],
  ['엔비디아', 'NVDA', 'NVIDIA', 'Nasdaq', 'US'],
  ['팔란티어', 'PLTR', 'Palantir', 'Nasdaq', 'US'],
  ['테슬라', 'TSLA', 'Tesla', 'Nasdaq', 'US'],
  ['애플', 'AAPL', 'Apple', 'Nasdaq', 'US'],
  ['마이크로소프트', 'MSFT', 'Microsoft', 'Nasdaq', 'US'],
  ['아마존', 'AMZN', 'Amazon', 'Nasdaq', 'US'],
  ['메타', 'META', 'Meta', 'Nasdaq', 'US'],
  ['구글', 'GOOGL', 'Alphabet', 'Nasdaq', 'US'],
].map(([key, symbol, name, exchange, country, tags = '']) => ({ key, symbol, name, exchange, country, tags }));

function uniqueBySymbol(items) {
  return items.filter((x, i, arr) => arr.findIndex((y) => String(y.symbol).toUpperCase() === String(x.symbol).toUpperCase()) === i);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const q = String(req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'q required' });
    return;
  }

  try {
    const lower = q.toLowerCase().replace(/\s+/g, '');
    const local = uniqueBySymbol(ALIASES.filter((x) => {
      const key = x.key.toLowerCase().replace(/\s+/g, '');
      const name = x.name.toLowerCase().replace(/\s+/g, '');
      const symbol = x.symbol.toLowerCase();
      const tags = String(x.tags || '').toLowerCase().replace(/\s+/g, '');
      return key.includes(lower) || lower.includes(key) || name.includes(lower) || lower.includes(name) || symbol.includes(lower) || tags.includes(lower);
    }));
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
    const merged = uniqueBySymbol([...local, ...results]);
    res.status(200).json({ results: merged });
  } catch (error) {
    const lower = q.toLowerCase().replace(/\s+/g, '');
    const local = uniqueBySymbol(ALIASES.filter((x) => {
      const key = x.key.toLowerCase().replace(/\s+/g, '');
      const name = x.name.toLowerCase().replace(/\s+/g, '');
      const symbol = x.symbol.toLowerCase();
      const tags = String(x.tags || '').toLowerCase().replace(/\s+/g, '');
      return key.includes(lower) || lower.includes(key) || name.includes(lower) || lower.includes(name) || symbol.includes(lower) || tags.includes(lower);
    }));
    res.status(local.length ? 200 : 502).json({ error: String(error?.message || error), results: local });
  }
}
