export type TranslationsMap = Partial<Record<'en' | 'fr' | 'zh' | string, string | null>>;

export function getLocalizedValue(
  map: TranslationsMap | null | undefined,
  lang: string,
  fallback = '',
): string {
  const normalizedLang = lang.split('-')[0].toLowerCase();
  return (
    map?.[normalizedLang]?.trim() ||
    map?.en?.trim() ||
    map?.fr?.trim() ||
    map?.zh?.trim() ||
    fallback
  );
}