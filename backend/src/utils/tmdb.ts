export type TranslationsMap = {
  en: string;
  fr: string;
  zh: string;
};

export interface TmdbGenre {
  id: number;
  name: string;
}

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

interface TmdbMovieDetailsResponse {
  genres?: TmdbGenre[];
}

export interface MovieTranslationsWithGenres {
  titleTranslations: TranslationsMap;
  synopsisTranslations: TranslationsMap;
  genres: string[];
  genreIds: number[];
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 3000;

export async function fetchMovieTranslations(
  filmTitle: string,
  synopsis: string,
): Promise<MovieTranslationsWithGenres> {
  const fallback: MovieTranslationsWithGenres = {
    titleTranslations: { en: filmTitle, fr: filmTitle, zh: filmTitle },
    synopsisTranslations: { en: synopsis, fr: synopsis, zh: synopsis },
    genres: [],
    genreIds: [],
  };

  const token = process.env.TMDB_ACCESS_KEY?.trim();
  if (!token || token === 'placeholder' || !filmTitle) {
    return fallback;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
  };

  try {
    // 1. 搜索电影拿到 TMDB movie id
    const searchUrl = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(filmTitle)}`;
    const searchRes = await fetch(searchUrl, {
      headers,
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    });
    if (!searchRes.ok) return fallback;

    const searchData = (await searchRes.json()) as TmdbSearchResponse;
    const movieId = searchData.results?.[0]?.id;
    if (!movieId) return fallback;

    // 2. 并行拉取多语言翻译与电影详情（含标准英文 genres）
    const transUrl = `${TMDB_BASE_URL}/movie/${movieId}/translations`;
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?language=en-US`;

    const [transRes, detailsRes] = await Promise.all([
      fetch(transUrl, { headers, signal: AbortSignal.timeout(TMDB_TIMEOUT_MS) }),
      fetch(detailsUrl, { headers, signal: AbortSignal.timeout(TMDB_TIMEOUT_MS) }),
    ]);

    if (!transRes.ok) return fallback;

    const transData = (await transRes.json()) as TmdbTranslationsResponse;
    const list = transData.translations ?? [];

    let genres: string[] = [];
    let genreIds: number[] = [];
    if (detailsRes.ok) {
      const detailsData = (await detailsRes.json()) as TmdbMovieDetailsResponse;
      const rawGenres = detailsData.genres ?? [];
      genres = rawGenres.map((g) => g.name).filter(Boolean);
      genreIds = rawGenres.map((g) => g.id).filter((id) => typeof id === 'number');
    }

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
      genres,
      genreIds,
    };
  } catch (err) {
    console.warn(`TMDB translation fetch failed for "${filmTitle}":`, err);
    return fallback;
  }
}