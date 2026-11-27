import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'zh', label: '中文' },
]

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language?.split('-')[0] || 'en'

  function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
    const lang = e.target.value
    i18n.changeLanguage(lang)
    localStorage.setItem('i18nextLng', lang)
  }

  return (
    <select
      aria-label="Language"
      value={currentLang}
      onChange={handleLanguageChange}
      className="px-3 py-1.5 text-small bg-surface text-text border border-border rounded-md shadow-card cursor-pointer focus:outline-none focus:border-brand"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  )
}

export default LanguageSwitcher