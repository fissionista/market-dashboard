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
  // === 추가: 주요 KOSPI 대형주 ===
  ['SK하이닉스', '000660.KS', 'SK하이닉스', 'KOSPI', 'KR', '하이닉스 반도체 메모리 hbm dram sk hynix'],
  ['LG에너지솔루션', '373220.KS', 'LG에너지솔루션', 'KOSPI', 'KR', '엘지에너지솔루션 2차전지 배터리 lg energy'],
  ['삼성바이오로직스', '207940.KS', '삼성바이오로직스', 'KOSPI', 'KR', '삼바 바이오 cdmo'],
  ['현대차', '005380.KS', '현대차', 'KOSPI', 'KR', '현대자동차 자동차 hyundai'],
  ['기아', '000270.KS', '기아', 'KOSPI', 'KR', '기아자동차 kia'],
  ['셀트리온', '068270.KS', '셀트리온', 'KOSPI', 'KR', '바이오 celltrion'],
  ['POSCO홀딩스', '005490.KS', 'POSCO홀딩스', 'KOSPI', 'KR', '포스코홀딩스 포스코 철강 2차전지'],
  ['삼성SDI', '006400.KS', '삼성SDI', 'KOSPI', 'KR', '2차전지 배터리'],
  ['LG화학', '051910.KS', 'LG화학', 'KOSPI', 'KR', '엘지화학 화학 소재'],
  ['NAVER', '035420.KS', 'NAVER', 'KOSPI', 'KR', '네이버 플랫폼 ai'],
  ['카카오', '035720.KS', '카카오', 'KOSPI', 'KR', '플랫폼 kakao'],
  ['현대모비스', '012330.KS', '현대모비스', 'KOSPI', 'KR', '자동차 부품'],
  ['KB금융', '105560.KS', 'KB금융', 'KOSPI', 'KR', 'kb 금융 은행'],
  ['신한지주', '055550.KS', '신한지주', 'KOSPI', 'KR', '신한 금융 은행'],
  ['하나금융지주', '086790.KS', '하나금융지주', 'KOSPI', 'KR', '하나금융 은행'],
  ['우리금융지주', '316140.KS', '우리금융지주', 'KOSPI', 'KR', '우리금융 은행'],
  ['삼성생명', '032830.KS', '삼성생명', 'KOSPI', 'KR', '보험'],
  ['삼성화재', '000810.KS', '삼성화재', 'KOSPI', 'KR', '보험'],
  ['SK텔레콤', '017670.KS', 'SK텔레콤', 'KOSPI', 'KR', 'sk텔레콤 통신 skt'],
  ['KT', '030200.KS', 'KT', 'KOSPI', 'KR', '케이티 통신'],
  ['LG유플러스', '032640.KS', 'LG유플러스', 'KOSPI', 'KR', '엘지유플러스 통신 lguplus'],
  ['SK이노베이션', '096770.KS', 'SK이노베이션', 'KOSPI', 'KR', '에너지 정유 2차전지'],
  ['S-Oil', '010950.KS', 'S-Oil', 'KOSPI', 'KR', '에쓰오일 에스오일 정유 oil'],
  ['한국전력', '015760.KS', '한국전력', 'KOSPI', 'KR', '한전 전력 kepco'],
  ['두산에너빌리티', '034020.KS', '두산에너빌리티', 'KOSPI', 'KR', '두산 원전 smr'],
  ['한국가스공사', '036460.KS', '한국가스공사', 'KOSPI', 'KR', '가스공사 kogas'],
  ['HD한국조선해양', '009540.KS', 'HD한국조선해양', 'KOSPI', 'KR', '한국조선해양 조선 hd'],
  ['HD현대중공업', '329180.KS', 'HD현대중공업', 'KOSPI', 'KR', '현대중공업 조선'],
  ['HD현대미포', '010620.KS', 'HD현대미포', 'KOSPI', 'KR', '현대미포 조선'],
  ['HD현대마린솔루션', '443060.KS', 'HD현대마린솔루션', 'KOSPI', 'KR', '현대 조선 ai'],
  ['삼성중공업', '010140.KS', '삼성중공업', 'KOSPI', 'KR', '조선'],
  ['한화오션', '042660.KS', '한화오션', 'KOSPI', 'KR', '대우조선해양 조선'],
  ['한화에어로스페이스', '012450.KS', '한화에어로스페이스', 'KOSPI', 'KR', '한화 방산 우주'],
  ['한국항공우주', '047810.KS', '한국항공우주', 'KOSPI', 'KR', 'kai 방산 우주'],
  ['LIG넥스원', '079550.KS', 'LIG넥스원', 'KOSPI', 'KR', '방산 미사일'],
  ['현대로템', '064350.KS', '현대로템', 'KOSPI', 'KR', '방산 철도 K2전차'],
  ['풍산', '103140.KS', '풍산', 'KOSPI', 'KR', '방산 비철금속 동'],
  ['한화시스템', '272210.KS', '한화시스템', 'KOSPI', 'KR', '한화 방산 it'],
  ['CJ제일제당', '097950.KS', 'CJ제일제당', 'KOSPI', 'KR', 'cj 식품 제당'],
  ['오리온', '271560.KS', '오리온', 'KOSPI', 'KR', '식품 제과 orion'],
  ['농심', '004370.KS', '농심', 'KOSPI', 'KR', '식품 라면'],
  ['아모레퍼시픽', '090430.KS', '아모레퍼시픽', 'KOSPI', 'KR', 'amore 화장품 코스메틱'],
  ['LG생활건강', '051900.KS', 'LG생활건강', 'KOSPI', 'KR', '엘지생활건강 화장품 생활'],
  ['신세계', '004170.KS', '신세계', 'KOSPI', 'KR', '백화점 유통'],
  ['이마트', '139480.KS', '이마트', 'KOSPI', 'KR', '유통 대형마트 emart'],
  ['롯데쇼핑', '023530.KS', '롯데쇼핑', 'KOSPI', 'KR', '롯데 백화점 유통'],
  ['한미약품', '128940.KS', '한미약품', 'KOSPI', 'KR', '제약'],
  ['한미사이언스', '008930.KS', '한미사이언스', 'KOSPI', 'KR', '한미 지주 제약'],
  ['종근당', '185750.KS', '종근당', 'KOSPI', 'KR', '제약'],
  ['유한양행', '000100.KS', '유한양행', 'KOSPI', 'KR', '유한 제약 렉라자'],
  ['SK바이오팜', '326030.KS', 'SK바이오팜', 'KOSPI', 'KR', 'sk 바이오 신약'],
  ['SK바이오사이언스', '302440.KS', 'SK바이오사이언스', 'KOSPI', 'KR', 'sk 바이오 백신'],
  ['고려아연', '010130.KS', '고려아연', 'KOSPI', 'KR', '비철금속 아연 2차전지'],
  ['삼성물산', '028260.KS', '삼성물산', 'KOSPI', 'KR', '지주 건설'],
  ['삼성전기', '009150.KS', '삼성전기', 'KOSPI', 'KR', 'mlcc 카메라모듈'],
  ['LG전자', '066570.KS', 'LG전자', 'KOSPI', 'KR', '엘지전자 가전 디스플레이'],
  ['LG디스플레이', '034220.KS', 'LG디스플레이', 'KOSPI', 'KR', '엘지디스플레이 oled'],
  ['SK스퀘어', '402340.KS', 'SK스퀘어', 'KOSPI', 'KR', 'sk 지주'],
  ['SK', '034730.KS', 'SK', 'KOSPI', 'KR', 'sk 지주'],
  ['LG', '003550.KS', 'LG', 'KOSPI', 'KR', '엘지 지주'],
  ['HMM', '011200.KS', 'HMM', 'KOSPI', 'KR', '해운 컨테이너'],
  ['한국타이어앤테크놀로지', '161390.KS', '한국타이어앤테크놀로지', 'KOSPI', 'KR', '한국타이어 타이어'],
  ['한온시스템', '018880.KS', '한온시스템', 'KOSPI', 'KR', '자동차 공조'],
  ['만도', '204320.KS', '만도', 'KOSPI', 'KR', '자동차 부품'],
  ['엔씨소프트', '036570.KS', '엔씨소프트', 'KOSPI', 'KR', '엔씨 게임 nc'],
  ['크래프톤', '259960.KS', '크래프톤', 'KOSPI', 'KR', '게임 배그 krafton'],
  ['넷마블', '251270.KS', '넷마블', 'KOSPI', 'KR', '게임'],
  ['카카오뱅크', '323410.KS', '카카오뱅크', 'KOSPI', 'KR', '카뱅 인터넷은행'],
  ['카카오페이', '377300.KS', '카카오페이', 'KOSPI', 'KR', '카페이 핀테크'],
  ['두산', '000150.KS', '두산', 'KOSPI', 'KR', '두산그룹 지주'],
  ['두산밥캣', '241560.KS', '두산밥캣', 'KOSPI', 'KR', '두산 건설장비'],
  ['두산로보틱스', '454910.KS', '두산로보틱스', 'KOSPI', 'KR', '두산 로봇'],
  ['현대건설', '000720.KS', '현대건설', 'KOSPI', 'KR', '건설 원전'],
  ['GS건설', '006360.KS', 'GS건설', 'KOSPI', 'KR', '지에스건설 건설'],
  ['DL이앤씨', '375500.KS', 'DL이앤씨', 'KOSPI', 'KR', '디엘이앤씨 건설'],
  ['포스코퓨처엠', '003670.KS', '포스코퓨처엠', 'KOSPI', 'KR', '포스코케미칼 2차전지 양극재'],
  ['엘앤에프', '066970.KQ', '엘앤에프', 'KOSDAQ', 'KR', '2차전지 양극재'],
  ['SKC', '011790.KS', 'SKC', 'KOSPI', 'KR', 'sk 동박 2차전지'],
  ['한미반도체', '042700.KS', '한미반도체', 'KOSPI', 'KR', '반도체 장비 hbm tsv'],
  ['이수페타시스', '007660.KS', '이수페타시스', 'KOSPI', 'KR', '기판 ai mlb'],
  ['HPSP', '403870.KQ', 'HPSP', 'KOSDAQ', 'KR', '반도체 장비 hbm'],
  ['주성엔지니어링', '036930.KQ', '주성엔지니어링', 'KOSDAQ', 'KR', '반도체 장비'],
  ['솔브레인', '357780.KQ', '솔브레인', 'KOSDAQ', 'KR', '반도체 소재'],
  ['리노공업', '058470.KQ', '리노공업', 'KOSDAQ', 'KR', '반도체 검사'],
  ['에스앤에스텍', '101490.KQ', '에스앤에스텍', 'KOSDAQ', 'KR', '반도체 블랭크마스크'],
  ['ISC', '095340.KQ', 'ISC', 'KOSDAQ', 'KR', '반도체 검사'],
  ['이오테크닉스', '039030.KQ', '이오테크닉스', 'KOSDAQ', 'KR', '반도체 장비 레이저'],
  ['에스에프에이', '056190.KQ', '에스에프에이', 'KOSDAQ', 'KR', 'sfa 반도체 디스플레이'],
  ['원익QnC', '074600.KQ', '원익QnC', 'KOSDAQ', 'KR', '원익qnc 반도체 쿼츠'],
  ['티씨케이', '064760.KQ', '티씨케이', 'KOSDAQ', 'KR', 'tcc 반도체 sic'],
  ['하나마이크론', '067310.KQ', '하나마이크론', 'KOSDAQ', 'KR', '반도체 후공정'],
  ['SFA반도체', '036540.KQ', 'SFA반도체', 'KOSDAQ', 'KR', '반도체 후공정'],
  ['알테오젠', '196170.KQ', '알테오젠', 'KOSDAQ', 'KR', '바이오 알테 머크'],
  ['HLB', '028300.KQ', 'HLB', 'KOSDAQ', 'KR', '에이치엘비 바이오 신약'],
  ['에코프로', '086520.KQ', '에코프로', 'KOSDAQ', 'KR', '2차전지 양극재 지주'],
  ['에코프로비엠', '247540.KQ', '에코프로비엠', 'KOSDAQ', 'KR', '2차전지 양극재'],
  ['에코프로에이치엔', '383310.KQ', '에코프로에이치엔', 'KOSDAQ', 'KR', '에코프로HN 2차전지'],
  ['레인보우로보틱스', '277810.KQ', '레인보우로보틱스', 'KOSDAQ', 'KR', '로봇 휴머노이드'],
  ['로보스타', '090360.KQ', '로보스타', 'KOSDAQ', 'KR', '로봇'],
  ['로보티즈', '108490.KQ', '로보티즈', 'KOSDAQ', 'KR', '로봇'],
  ['루닛', '328130.KQ', '루닛', 'KOSDAQ', 'KR', 'ai 의료 lunit'],
  ['클래시스', '214150.KQ', '클래시스', 'KOSDAQ', 'KR', '의료기기 미용'],
  ['파마리서치', '214450.KQ', '파마리서치', 'KOSDAQ', 'KR', '의료기기 리쥬란'],
  ['JYP Ent.', '035900.KQ', 'JYP Ent.', 'KOSDAQ', 'KR', 'jyp 엔터테인먼트'],
  ['에스엠', '041510.KQ', '에스엠', 'KOSDAQ', 'KR', 'sm 엔터테인먼트'],
  ['하이브', '352820.KS', '하이브', 'KOSPI', 'KR', '엔터 하이브 hybe bts'],
  ['CJ ENM', '035760.KQ', 'CJ ENM', 'KOSDAQ', 'KR', 'cjenm 미디어'],
  ['스튜디오드래곤', '253450.KQ', '스튜디오드래곤', 'KOSDAQ', 'KR', '드라마 콘텐츠'],
  ['콘텐트리중앙', '036420.KQ', '콘텐트리중앙', 'KOSDAQ', 'KR', '콘텐트리'],
  ['셀트리온헬스케어', '091990.KQ', '셀트리온헬스케어', 'KOSDAQ', 'KR', '셀트리온 바이오'],
  ['카카오게임즈', '293490.KQ', '카카오게임즈', 'KOSDAQ', 'KR', '카카오 게임'],
  ['펄어비스', '263750.KQ', '펄어비스', 'KOSDAQ', 'KR', '게임 검은사막'],
  ['위메이드', '112040.KQ', '위메이드', 'KOSDAQ', 'KR', '게임 미르'],
  ['셀바스AI', '108860.KQ', '셀바스AI', 'KOSDAQ', 'KR', '셀바스ai 음성ai'],
  ['더존비즈온', '012510.KS', '더존비즈온', 'KOSPI', 'KR', '소프트웨어 erp'],
  ['엠씨넥스', '097520.KQ', '엠씨넥스', 'KOSDAQ', 'KR', '카메라모듈'],
  ['엔켐', '348370.KQ', '엔켐', 'KOSDAQ', 'KR', '2차전지 전해액'],
  ['더본코리아', '475560.KQ', '더본코리아', 'KOSDAQ', 'KR', '백종원 외식 프랜차이즈'],
  ['포스코DX', '022100.KQ', '포스코DX', 'KOSDAQ', 'KR', '포스코dx 시스템 ai'],
  ['파두', '440110.KQ', '파두', 'KOSDAQ', 'KR', '반도체 ssd 컨트롤러'],
  ['리가켐바이오', '141080.KQ', '리가켐바이오', 'KOSDAQ', 'KR', '레고켐 바이오'],
  ['SK오션플랜트', '100090.KS', 'SK오션플랜트', 'KOSPI', 'KR', 'sk 해상풍력'],
  // === 추가: 미국 대형주 ===
  ['프리포트', 'FCX', 'Freeport-McMoRan', 'NYSE', 'US', '구리 광산'],
  ['셰브론', 'CVX', 'Chevron', 'NYSE', 'US', '에너지 정유'],
  ['엑슨모빌', 'XOM', 'Exxon Mobil', 'NYSE', 'US', '에너지'],
  ['옥시덴탈', 'OXY', 'Occidental Petroleum', 'NYSE', 'US', '에너지'],
  ['JP모건', 'JPM', 'JPMorgan Chase', 'NYSE', 'US', '제이피모건 금융'],
  ['뱅크오브아메리카', 'BAC', 'Bank of America', 'NYSE', 'US', '금융'],
  ['골드만삭스', 'GS', 'Goldman Sachs', 'NYSE', 'US', '금융'],
  ['모건스탠리', 'MS', 'Morgan Stanley', 'NYSE', 'US', '금융'],
  ['버크셔', 'BRK-B', 'Berkshire Hathaway', 'NYSE', 'US', '버크셔해서웨이 워렌버핏 buffett'],
  ['일라이릴리', 'LLY', 'Eli Lilly', 'NYSE', 'US', '바이오 비만치료제'],
  ['노보노디스크', 'NVO', 'Novo Nordisk', 'NYSE', 'US', '바이오 위고비'],
  ['유나이티드헬스', 'UNH', 'UnitedHealth Group', 'NYSE', 'US', '의료 보험'],
  ['존슨앤존슨', 'JNJ', 'Johnson & Johnson', 'NYSE', 'US', '바이오 제약 jnj'],
  ['화이자', 'PFE', 'Pfizer', 'NYSE', 'US', '바이오 제약'],
  ['머크', 'MRK', 'Merck', 'NYSE', 'US', '바이오 제약'],
  ['애브비', 'ABBV', 'AbbVie', 'NYSE', 'US', '바이오 제약'],
  ['월마트', 'WMT', 'Walmart', 'NYSE', 'US', '유통 walmart'],
  ['홈디포', 'HD', 'Home Depot', 'NYSE', 'US', '리테일 home depot'],
  ['코스트코', 'COST', 'Costco', 'Nasdaq', 'US', '유통'],
  ['맥도날드', 'MCD', 'McDonald', 'NYSE', 'US', '맥도날드 외식'],
  ['스타벅스', 'SBUX', 'Starbucks', 'Nasdaq', 'US', '커피 외식'],
  ['나이키', 'NKE', 'Nike', 'NYSE', 'US', '의류'],
  ['디즈니', 'DIS', 'Walt Disney', 'NYSE', 'US', '미디어 disney'],
  ['넷플릭스', 'NFLX', 'Netflix', 'Nasdaq', 'US', '스트리밍'],
  ['우버', 'UBER', 'Uber', 'NYSE', 'US', '모빌리티'],
  ['보잉', 'BA', 'Boeing', 'NYSE', 'US', '항공 방산'],
  ['록히드마틴', 'LMT', 'Lockheed Martin', 'NYSE', 'US', '방산'],
  ['레이시온', 'RTX', 'RTX Corporation', 'NYSE', 'US', '레이시온 방산'],
  ['노스럽그루먼', 'NOC', 'Northrop Grumman', 'NYSE', 'US', '방산'],
  ['커터필러', 'CAT', 'Caterpillar', 'NYSE', 'US', '캐터필러 건설장비'],
  ['ASML', 'ASML', 'ASML Holding', 'Nasdaq', 'US', 'asml 반도체 euv'],
  ['TSMC', 'TSM', 'Taiwan Semiconductor', 'NYSE', 'US', 'tsmc 파운드리'],
  ['AMD', 'AMD', 'Advanced Micro Devices', 'Nasdaq', 'US', '반도체 cpu gpu'],
  ['인텔', 'INTC', 'Intel', 'Nasdaq', 'US', '반도체'],
  ['퀄컴', 'QCOM', 'Qualcomm', 'Nasdaq', 'US', '반도체 모뎀'],
  ['ARM', 'ARM', 'Arm Holdings', 'Nasdaq', 'US', '반도체 ip'],
  ['오라클', 'ORCL', 'Oracle', 'NYSE', 'US', 'oracle 클라우드 db'],
  ['세일즈포스', 'CRM', 'Salesforce', 'NYSE', 'US', 'crm saas'],
  ['어도비', 'ADBE', 'Adobe', 'Nasdaq', 'US', 'adobe 소프트웨어'],
  ['서비스나우', 'NOW', 'ServiceNow', 'NYSE', 'US', 'saas'],
  ['스노우플레이크', 'SNOW', 'Snowflake', 'NYSE', 'US', '클라우드 데이터'],
  ['크라우드스트라이크', 'CRWD', 'CrowdStrike', 'Nasdaq', 'US', '보안'],
  ['데이터독', 'DDOG', 'Datadog', 'Nasdaq', 'US', '관측'],
  ['클라우드플레어', 'NET', 'Cloudflare', 'NYSE', 'US', 'cdn 보안'],
  ['로블록스', 'RBLX', 'Roblox', 'NYSE', 'US', '게임 메타버스'],
  ['Coinbase', 'COIN', 'Coinbase', 'Nasdaq', 'US', '코인베이스 코인 거래소'],
  ['코인베이스', 'COIN', 'Coinbase', 'Nasdaq', 'US', 'coinbase'],
  ['리플', 'XRP-USD', 'Ripple', 'Crypto', 'ETC', 'xrp 코인'],
  ['솔라나', 'SOL-USD', 'Solana', 'Crypto', 'ETC', 'sol 코인'],
  ['이더리움', 'ETH-USD', 'Ethereum', 'Crypto', 'ETC', 'eth 코인'],
  ['MicroStrategy', 'MSTR', 'MicroStrategy', 'Nasdaq', 'US', '마이크로스트래티지 비트코인'],
  ['마이크로스트래티지', 'MSTR', 'MicroStrategy', 'Nasdaq', 'US', 'mstr btc'],
  ['로빈후드', 'HOOD', 'Robinhood', 'Nasdaq', 'US', 'hood 증권'],
  ['SOFI', 'SOFI', 'SoFi Technologies', 'Nasdaq', 'US', '소파이 핀테크'],
  ['뉴스케일', 'SMR', 'NuScale Power', 'NYSE', 'US', 'smr 원전'],
  ['오클로', 'OKLO', 'Oklo', 'NYSE', 'US', 'smr 원전'],
  ['카메코', 'CCJ', 'Cameco', 'NYSE', 'US', '우라늄 원전'],
  ['리비안', 'RIVN', 'Rivian', 'Nasdaq', 'US', '전기차'],
  ['루시드', 'LCID', 'Lucid', 'Nasdaq', 'US', '전기차'],
  ['리오토', 'LI', 'Li Auto', 'Nasdaq', 'US', '전기차 중국'],
  ['니오', 'NIO', 'NIO', 'NYSE', 'US', '전기차 중국'],
  ['샤오펑', 'XPEV', 'XPeng', 'NYSE', 'US', '전기차 중국'],
  ['BYD', '1211.HK', 'BYD', 'HKEX', 'ETC', 'byd 비야디 전기차'],
  ['알리바바', 'BABA', 'Alibaba', 'NYSE', 'US', '알리 알리바바'],
  ['핀듀오듀오', 'PDD', 'PDD Holdings', 'Nasdaq', 'US', '테무 temu'],
  ['JD닷컴', 'JD', 'JD.com', 'Nasdaq', 'US', '제이디닷컴'],
  ['비자', 'V', 'Visa', 'NYSE', 'US', 'visa 결제'],
  ['마스터카드', 'MA', 'Mastercard', 'NYSE', 'US', '결제'],
  ['아메리칸익스프레스', 'AXP', 'American Express', 'NYSE', 'US', 'amex 카드'],
  ['페이팔', 'PYPL', 'PayPal', 'Nasdaq', 'US', '결제 핀테크'],
  ['SEA', 'SE', 'Sea Limited', 'NYSE', 'US', 'shopee 쇼피 쇼피파이'],
  ['Shopify', 'SHOP', 'Shopify', 'NYSE', 'US', '쇼피파이 ecommerce'],
  ['에어비앤비', 'ABNB', 'Airbnb', 'Nasdaq', 'US', '숙박 abnb'],
  ['부킹', 'BKNG', 'Booking', 'Nasdaq', 'US', '여행'],
  ['델타항공', 'DAL', 'Delta Air Lines', 'NYSE', 'US', '항공'],
  ['유나이티드항공', 'UAL', 'United Airlines', 'Nasdaq', 'US', '항공'],
  ['포드', 'F', 'Ford', 'NYSE', 'US', '자동차'],
  ['GM', 'GM', 'General Motors', 'NYSE', 'US', '제너럴모터스 자동차'],
  ['Apple', 'AAPL', 'Apple', 'Nasdaq', 'US', 'apple iphone'],
  ['Tesla', 'TSLA', 'Tesla', 'Nasdaq', 'US', 'tesla 전기차'],
  // === ETF ===
  ['QQQ', 'QQQ', 'Invesco QQQ Trust', 'Nasdaq', 'US', '나스닥100 etf'],
  ['SPY', 'SPY', 'SPDR S&P 500 ETF', 'NYSEArca', 'US', 'sp500 etf'],
  ['VOO', 'VOO', 'Vanguard S&P 500 ETF', 'NYSEArca', 'US', 'sp500 etf 뱅가드'],
  ['IWM', 'IWM', 'iShares Russell 2000 ETF', 'NYSEArca', 'US', '러셀 etf 중소형'],
  ['DIA', 'DIA', 'SPDR Dow Jones Industrial', 'NYSEArca', 'US', '다우존스 etf'],
  ['TLT', 'TLT', 'iShares 20+ Year Treasury Bond ETF', 'Nasdaq', 'US', '미국채 장기채 etf'],
  ['IEF', 'IEF', 'iShares 7-10 Year Treasury Bond ETF', 'Nasdaq', 'US', '미국채 중기채 etf'],
  ['SHY', 'SHY', 'iShares 1-3 Year Treasury Bond ETF', 'Nasdaq', 'US', '미국채 단기채 etf'],
  ['HYG', 'HYG', 'iShares iBoxx High Yield Corporate Bond ETF', 'NYSEArca', 'US', '하이일드 회사채 etf'],
  ['LQD', 'LQD', 'iShares iBoxx Investment Grade Corporate Bond ETF', 'NYSEArca', 'US', '투자등급 회사채 etf'],
  ['XLK', 'XLK', 'Technology Select Sector SPDR', 'NYSEArca', 'US', '기술 섹터 etf'],
  ['XLF', 'XLF', 'Financial Select Sector SPDR', 'NYSEArca', 'US', '금융 섹터 etf'],
  ['XLE', 'XLE', 'Energy Select Sector SPDR', 'NYSEArca', 'US', '에너지 섹터 etf'],
  ['XLV', 'XLV', 'Health Care Select Sector SPDR', 'NYSEArca', 'US', '헬스케어 섹터 etf'],
  ['XLI', 'XLI', 'Industrial Select Sector SPDR', 'NYSEArca', 'US', '산업 섹터 etf'],
  ['XLU', 'XLU', 'Utilities Select Sector SPDR', 'NYSEArca', 'US', '유틸리티 섹터 etf'],
  ['XLP', 'XLP', 'Consumer Staples Select SPDR', 'NYSEArca', 'US', '필수소비재 섹터 etf'],
  ['XLY', 'XLY', 'Consumer Discretionary Select SPDR', 'NYSEArca', 'US', '경기소비재 섹터 etf'],
  ['ITA', 'ITA', 'iShares U.S. Aerospace & Defense ETF', 'NYSEArca', 'US', '방산 etf'],
  ['ICLN', 'ICLN', 'iShares Global Clean Energy ETF', 'Nasdaq', 'US', '클린에너지 etf'],
  ['URA', 'URA', 'Global X Uranium ETF', 'NYSEArca', 'US', '우라늄 etf 원전'],
  ['GLD', 'GLD', 'SPDR Gold Trust', 'NYSEArca', 'US', '금 etf gold'],
  ['SLV', 'SLV', 'iShares Silver Trust', 'NYSEArca', 'US', '은 etf silver'],
  ['USO', 'USO', 'United States Oil Fund', 'NYSEArca', 'US', '원유 etf'],
  ['IBIT', 'IBIT', 'iShares Bitcoin Trust', 'Nasdaq', 'US', '비트코인 etf 블랙록'],
  ['FBTC', 'FBTC', 'Fidelity Wise Origin Bitcoin Fund', 'Nasdaq', 'US', '비트코인 etf 피델리티'],
  // === KODEX/TIGER 한국 ETF (자주 검색) ===
  ['KODEX 미국S&P500', '379780.KS', 'KODEX 미국S&P500TR', 'KOSPI ETF', 'KR', '코덱스 미국 sp500 etf'],
  ['TIGER 미국S&P500', '360750.KS', 'TIGER 미국S&P500', 'KOSPI ETF', 'KR', '타이거 미국 sp500'],
  ['TIGER 미국나스닥100', '133690.KS', 'TIGER 미국나스닥100', 'KOSPI ETF', 'KR', '타이거 나스닥'],
  ['KODEX 미국나스닥100TR', '379810.KS', 'KODEX 미국나스닥100TR', 'KOSPI ETF', 'KR', '코덱스 나스닥'],
  ['TIGER 미국필라델피아반도체', '381180.KS', 'TIGER 미국필라델피아반도체', 'KOSPI ETF', 'KR', '필라델피아 반도체 미국'],
  ['ACE 미국빅테크TOP7Plus', '465580.KS', 'ACE 미국빅테크TOP7Plus', 'KOSPI ETF', 'KR', '미국빅테크 ace'],
  ['RISE 미국S&P500', '379800.KS', 'RISE 미국S&P500', 'KOSPI ETF', 'KR', 'rise sp500'],
  ['KODEX 2차전지산업', '305720.KS', 'KODEX 2차전지산업', 'KOSPI ETF', 'KR', '2차전지 etf'],
  ['TIGER 2차전지테마', '305540.KS', 'TIGER 2차전지테마', 'KOSPI ETF', 'KR', '2차전지 etf 타이거'],
  ['KODEX K-방산', '449450.KS', 'KODEX K-방산', 'KOSPI ETF', 'KR', '방산 etf'],
  ['TIGER 방산', '466920.KS', 'TIGER 방산', 'KOSPI ETF', 'KR', '방산 etf 타이거'],
  ['KODEX AI반도체핵심장비', '479850.KS', 'KODEX AI반도체핵심장비', 'KOSPI ETF', 'KR', 'ai 반도체 etf'],
  ['SOL AI반도체소부장', '469150.KS', 'SOL AI반도체소부장', 'KOSPI ETF', 'KR', 'ai 반도체 소재 etf'],
  ['TIGER 200', '102110.KS', 'TIGER 200', 'KOSPI ETF', 'KR', '코스피200 etf'],
  ['KODEX 200', '069500.KS', 'KODEX 200', 'KOSPI ETF', 'KR', '코스피200 etf'],
  ['KODEX 코스닥150', '229200.KS', 'KODEX 코스닥150', 'KOSPI ETF', 'KR', '코스닥150 etf'],
  ['TIGER 코스닥150', '232080.KS', 'TIGER 코스닥150', 'KOSPI ETF', 'KR', '코스닥150 etf'],
  ['KODEX 인버스', '114800.KS', 'KODEX 인버스', 'KOSPI ETF', 'KR', '인버스 etf'],
  ['KODEX 200선물인버스2X', '252670.KS', 'KODEX 200선물인버스2X', 'KOSPI ETF', 'KR', '곱버스 인버스'],
  ['KODEX 레버리지', '122630.KS', 'KODEX 레버리지', 'KOSPI ETF', 'KR', '레버리지 etf'],
  ['TIGER 차이나전기차SOLACTIVE', '371460.KS', 'TIGER 차이나전기차', 'KOSPI ETF', 'KR', '중국 전기차 etf'],
  ['KODEX 미국30년국채액티브', '472170.KS', 'KODEX 미국30년국채액티브', 'KOSPI ETF', 'KR', '미국 장기채 etf 코덱스'],
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

  // 한국어 쿼리는 일단 로컬 매치(약한 매치 포함)부터 우선 반환. Yahoo는 한국어를 잘 못 찾고
  // 외부 API들(KRX, Naver autocomplete)은 인증/세션 문제로 자주 빈 응답이라
  // 로컬에서 부분 매치라도 잡힌 경우 그걸 먼저 보여줘 사용자 경험을 보장한다.
  if (isKr && local.length) {
    res.status(200).json({ results: uniqueBySymbol(local).slice(0, 20) });
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

  // 한국어 쿼리인데 로컬·KRX·Naver 모두 비었으면 Yahoo는 의미 없는 결과만 반환하므로 호출 생략.
  if (isKr) {
    res.status(200).json({
      results: [],
      hint: '한국 종목명을 정확히 입력하거나 6자리 종목코드를 입력해 주세요. 예: 삼성전자, 005930, NAVER',
    });
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
