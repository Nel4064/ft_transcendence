export type TranslationsMap = {
  en: string;
  fr: string;
  zh: string;
};

interface TmdbSearchResponse {
  results?: Array<{ id: number; title?: string; overview?: string }>;
}

interface TmdbTranslationsResponse {
  translations?: Array<{
    iso_639_1: string;
    iso_3166_1: string;
    data: {
      title?: string;
      overview?: string;
    };
  }>;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function fetchMovieTranslations(
  filmTitle: string,
  synopsis: string,
): Promise<{
  titleTranslations: TranslationsMap;
  synopsisTranslations: TranslationsMap;
}> {
  const fallback = {
    titleTranslations: { en: filmTitle, fr: filmTitle, zh: filmTitle },
    synopsisTranslations: { en: synopsis, fr: synopsis, zh: synopsis },
  };

  const token = process.env.TMDB_ACCESS_KEY;
  if (!token || !filmTitle) {
    return fallback;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
  };

  try {
    // 1. 搜索电影拿到 TMDB movie id
    const searchUrl = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(filmTitle)}`;
    const searchRes = await fetch(searchUrl, { headers });
    if (!searchRes.ok) return fallback;

    const searchData = (await searchRes.json()) as TmdbSearchResponse;
    const movieId = searchData.results?.[0]?.id;
    if (!movieId) return fallback;

    // 2. 一次性拉取该电影的所有语言翻译
    const transUrl = `${TMDB_BASE_URL}/movie/${movieId}/translations`;
    const transRes = await fetch(transUrl, { headers });
    if (!transRes.ok) return fallback;

    const transData = (await transRes.json()) as TmdbTranslationsResponse;
    const list = transData.translations ?? [];

    const pick = (lang: string, preferredRegion?: string) => {
      const matches = list.filter((t) => t.iso_639_1 === lang);
      if (preferredRegion) {
        const exact = matches.find((t) => t.iso_3166_1 === preferredRegion);
        if (exact) return exact.data;
      }
      return matches[0]?.data;
    };

    const en = pick('en', 'US');
    const fr = pick('fr', 'FR');
    const zh = pick('zh', 'CN');

    return {
      titleTranslations: {
        en: en?.title?.trim() || filmTitle,
        fr: fr?.title?.trim() || filmTitle,
        zh: zh?.title?.trim() || filmTitle,
      },
      synopsisTranslations: {
        en: en?.overview?.trim() || synopsis,
        fr: fr?.overview?.trim() || synopsis,
        zh: zh?.overview?.trim() || synopsis,
      },
    };
  } catch (err) {
    console.warn(`TMDB translation fetch failed for "${filmTitle}":`, err);
    return fallback;
  }
}