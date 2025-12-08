import React, { useEffect, useState } from 'react';

import { DanmuResult, EpisodeItem } from '@/lib/types';

interface DanmuSelectorProps {
  videoTitle?: string;
  danmuSearchLoading?: boolean;
  value?: number;
  onChange?: (episodeId: number) => void;
}

const DanmuSelector: React.FC<DanmuSelectorProps> = ({
  videoTitle,
  value,
  onChange,
}) => {
  const [danmuSources, setDanmuSources] = useState<DanmuResult[]>([]);
  const [activeSource, setActiveSource] = useState<DanmuResult | null>(null);
  const [loading, setLoading] = useState(false);

  // 用来从选中集数反查它属于哪个源 → 用于高亮源
  const activeSourceId = danmuSources.find((s) =>
    s.episodes.some((e) => e.episodeId === value)
  )?.id;

  const fetchDanmuData = async (
    query: string,
    episode: number
  ): Promise<DanmuResult[]> => {
    try {
      const response = await fetch(
        `/api/danmu?q=${encodeURIComponent(query.trim())}&episode=${episode}`
      );
      if (!response.ok) throw new Error('搜索失败');

      const data = await response.json();
      return data?.results ?? [];
    } catch {
      return [];
    }
  };

  /** 加载资源并做缓存 **/
  useEffect(() => {
    if (!videoTitle) return;

    const cacheKey = `danmu_cache_${videoTitle}`;
    const TTL = 1000 * 60 * 30;
    const now = Date.now();

    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed.data) && now - parsed.time < TTL) {
          if (parsed.data.length !== 0) {
            setDanmuSources(parsed.data);
            return;
          }
        }
      } catch (err) {
        throw new Error('弹幕缓存解析失败');
      }
    }

    const loadData = async () => {
      setLoading(true);
      const results = await fetchDanmuData(videoTitle, value ? value : 1);
      setDanmuSources(results);
      setLoading(false);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: results, time: Date.now() })
      );
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoTitle]);

  useEffect(() => {
    if (!videoTitle) return;
    const cacheKey = `danmu_cache_${videoTitle}`;
    const loadData = async () => {
      setLoading(true);
      const results = await fetchDanmuData(videoTitle, value ? value : 1);
      setDanmuSources(results);
      setLoading(false);
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data: results, time: Date.now() })
      );
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleBack = () => setActiveSource(null);

  const handleSourceClick = (source: DanmuResult) => setActiveSource(source);

  /** 选中某一集 **/
  const handleEpisodeClick = (episode: EpisodeItem) => {
    if (!activeSource) return;

    // === 记录当前选择信息 ===
    localStorage.setItem(
      'danmu_selected',
      JSON.stringify({
        sourceId: activeSource.id,
        sourceTitle: activeSource.title,
        episodeId: episode.episodeId,
        episodeTitle: episode.episodeTitle,
      })
    );

    onChange?.(episode.episodeId);
  };

  return (
    <div className='flex flex-col h-full'>
      {/* 加载动画 */}
      {loading && (
        <div className='flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-300'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mb-2' />
          <span className='text-sm'>加载弹幕源中...</span>
        </div>
      )}

      {!loading && danmuSources.length === 0 && (
        <div className='flex items-center justify-center py-8'>
          <div className='text-center'>
            <div className='text-gray-400 text-2xl mb-2'>💬</div>
            <p className='text-sm text-gray-600 dark:text-gray-300'>
              暂无可用弹幕源
            </p>
          </div>
        </div>
      )}

      {/* 一级列表：源 */}
      {!activeSource && !loading && danmuSources.length > 0 && (
        <div className='flex-1 overflow-y-auto space-y-2 pb-4'>
          {danmuSources.map((source) => {
            const isActiveSource = source.id === activeSourceId;

            return (
              <div
                key={source.id}
                onClick={() => handleSourceClick(source)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                  isActiveSource
                    ? 'bg-green-500/20 border border-green-500/40 scale-[1.02]'
                    : 'hover:bg-gray-200/50 dark:hover:bg-white/10 hover:scale-[1.02]'
                }`}
              >
                <div className='flex-shrink-0 w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200'>
                  源
                </div>

                <div className='flex-1 min-w-0'>
                  <h3
                    className={`font-medium text-sm truncate ${
                      isActiveSource
                        ? 'text-green-600 dark:text-green-300'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {source.title}
                  </h3>
                  <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                    {source.episodes.length} 集弹幕
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 二级列表：episodes */}
      {activeSource && !loading && (
        <div className='flex-1 flex flex-col overflow-y-auto pb-4'>
          <button
            onClick={handleBack}
            className='text-left mb-3 text-sm text-gray-600 dark:text-gray-300 hover:text-green-500'
          >
            ← 返回
          </button>

          <h2 className='text-base font-medium text-gray-900 dark:text-gray-100 mb-3'>
            {activeSource.title} 的弹幕集数
          </h2>

          <div className='flex flex-wrap gap-3 overflow-y-auto flex-1 content-start pb-4'>
            {activeSource.episodes.map((ep) => {
              const isActive = ep.episodeId === value;
              return (
                <button
                  key={ep.episodeId}
                  onClick={() => handleEpisodeClick(ep)}
                  className={`h-10 min-w-10 px-3 py-2 flex items-center justify-center text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap font-mono
                    ${
                      isActive
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 dark:bg-green-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20'
                    }`.trim()}
                >
                  {ep.episodeTitle}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DanmuSelector;
