const CNN_URL = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';

function normalizeRating(rating) {
  return String(rating || '')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const response = await fetch(CNN_URL, {
      headers: {
        accept: 'application/json',
        referer: 'https://edition.cnn.com/',
        'user-agent': 'Mozilla/5.0 market-dashboard/1.0',
      },
    });

    if (!response.ok) throw new Error(`CNN Fear & Greed ${response.status}`);
    const data = await response.json();
    const fg = data?.fear_and_greed || {};

    if (fg.score == null) throw new Error('Fear & Greed score missing');

    res.status(200).json({
      score: Number(fg.score),
      rating: normalizeRating(fg.rating),
      timestamp: fg.timestamp || null,
      previous: {
        week: fg.previous_1_week ?? null,
        month: fg.previous_1_month ?? null,
        year: fg.previous_1_year ?? null,
      },
    });
  } catch (error) {
    res.status(502).json({ error: String(error?.message || error) });
  }
}
