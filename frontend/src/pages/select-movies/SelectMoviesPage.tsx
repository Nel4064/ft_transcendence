import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MoviesList from '../../components/movies/MoviesList'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'
import { useSearchParams } from 'react-router-dom'

const boxClass = "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full max-w-[1000px] mx-auto mb-10 sm:mb-16 lg:mb-24 p-4 sm:p-6 lg:p-8 bg-surface border border-border rounded-lg shadow-card"
const selectClass = "w-full sm:w-auto py-3.5 sm:py-4 px-4 sm:px-5 border border-border rounded-md text-control bg-surface cursor-pointer"

const GENRE_OPTIONS = [
	'Action',
	'Adventure',
	'Animation',
	'Comedy',
	'Crime',
	'Documentary',
	'Drama',
	'Family',
	'Fantasy',
	'History',
	'Horror',
	'Music',
	'Mystery',
	'Romance',
	'Science Fiction',
	'Thriller',
	'War',
	'Western',
] as const

function SelectMoviesPage() {
	const { t } = useTranslation()
	const [searchParams, setSearchParams] = useSearchParams()

	// 从 URL 读取已生效的搜索词和筛选类型（返回页面时自动恢复）
	const appliedTerm = searchParams.get('q') ?? ''
	const appliedFilter = searchParams.get('filter') ?? 'title'

	const [searchTerm, setSearchTerm] = useState(appliedTerm)
	const [filter, setFilter] = useState(appliedFilter)

	function handleFilterChange(nextFilter: string) {
		setFilter(nextFilter)
		setSearchTerm('')
	}

	function handleSearch() {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev)
			if (searchTerm.trim()) {
				next.set('q', searchTerm.trim())
			} else {
				next.delete('q')
			}
			if (filter !== 'title') {
				next.set('filter', filter)
			} else {
				next.delete('filter')
			}
			next.delete('page') // 重新搜索时重置回第 1 页
			return next
		})
	}

	return (
		<main className="w-full max-w-[1600px] mx-auto py-8 px-4 sm:py-10 sm:px-6 lg:py-12 lg:px-10">
			<Heading level="section" as="h1" className="mb-6 text-center sm:text-left">
				{t('selectMovies.heading')}
			</Heading>

			<section className={boxClass}>
				{filter === 'genre' ? (
					<select
						id="search"
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className={`${selectClass} w-full sm:flex-1`}
					>
						<option value="">{t('selectMovies.selectGenrePlaceholder')}</option>
						{GENRE_OPTIONS.map((genre) => (
							<option key={genre} value={genre}>
								{t(`selectMovies.genres.${genre}`, genre)}
							</option>
						))}
					</select>
				) : (
					<Input
						id="search"
						size="xl"
						type={filter === 'date' ? 'date' : 'text'}
						value={searchTerm}
						placeholder={t('selectMovies.searchPlaceholder')}
						onChange={(e) => setSearchTerm(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
						className="w-full sm:flex-1"
					/>
				)}

				<select
					value={filter}
					onChange={(e) => handleFilterChange(e.target.value)}
					className={selectClass}
				>
					<option value="title">{t('selectMovies.filters.title')}</option>
					<option value="cinema">{t('selectMovies.filters.cinema')}</option>
					<option value="date">{t('selectMovies.filters.date')}</option>
					<option value="genre">{t('selectMovies.filters.genre')}</option>
				</select>

				<Button variant="admin" size="lg" onClick={handleSearch}>
					{t('selectMovies.searchButton')}
				</Button>
			</section>

			<section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				<MoviesList searchTerm={appliedTerm} filter={appliedFilter} perPage={12} />
			</section>
		</main>
	)
}

export default SelectMoviesPage