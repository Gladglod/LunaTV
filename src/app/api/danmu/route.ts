import { NextResponse } from 'next/server';

import { getAvailableDanmuApiSites, getCacheTime } from '@/lib/config';
import { searchFromDanmuApi } from '@/lib/downstream';

export const runtime = 'nodejs';

//
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const episode = searchParams.get('episode') ?? '1';

  if (!query || !episode) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [], error: '缺少必要参数: q' },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  }

  const apiSites = await getAvailableDanmuApiSites();

  try {
    if (apiSites.length < 0) {
      return NextResponse.json(
        {
          error: `未找到有效的弹幕源`,
          results: [],
        },
        { status: 404 }
      );
    }
    const targetSite = apiSites[0];

    const results = await searchFromDanmuApi(targetSite, query, episode);
    // todo
    const normalizedQuery = query.toLowerCase();
    const filtered = results.filter((r) =>
      r.title?.toLowerCase().includes(normalizedQuery)
    );
    const cacheTime = await getCacheTime();

    return NextResponse.json(
      { results: filtered ?? [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        results: [],
        error: '搜索失败',
      },
      { status: 500 }
    );
  }
}
