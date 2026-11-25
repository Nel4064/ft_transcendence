import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MoviesList from '../../components/movies/MoviesList'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'
import { useSearchParams } from 'react-router-dom'

const boxClass = "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full max-w-[1000px] mx-auto mb-10 sm:mb-16 lg:mb-24 p-4 sm:p-6 lg:p-8 bg-surface border border-border rounded-lg shadow-card"
const selectClass = "w-full sm:w-auto py-3.5 sm:py-4 px-4 sm:px-5 border border-border rounded-md text-control bg-surface cursor-pointer"

function SelectMoviesPage() {
	const { t } = useTranslation()
	const [searchParams, setSearchParams] = useSearchParams()

	// 从 URL 读取已生效的搜索词和筛选类型（返回页面时自动恢复）
	const appliedTerm = searchParams.get('q') ?? ''
	const appliedFilter = searchParams.get('filter') ?? 'title'

	const [searchTerm, setSearchTerm] = useState(appliedTerm)
	const [filter, setFilter] = useState(appliedFilter)

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
				<Input
					id="search"
					size="xl"
					type={filter === 'date' ? 'date' : 'text'}
					value={searchTerm}
					placeholder={t('selectMovies.searchPlaceholder')}
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full sm:flex-1"
				/>
				<select
					value={filter}
					onChange={(e) => { setFilter(e.target.value); setSearchTerm('') }}
					className={selectClass}
				>
					<option value="title">{t('selectMovies.filter.title')}</option>
					<option value="cinema">{t('selectMovies.filter.cinema')}</option>
					<option value="date">{t('selectMovies.filter.date')}</option>
				</select>
				<Button
					variant="admin"
					size="xl"
					onClick={handleSearch}
					className="w-full sm:w-auto justify-center"
				>
					{t('selectMovies.searchButton')}
				</Button>
			</section>

			<section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 max-w-[1600px] mx-auto my-8 sm:my-12 justify-items-center">
				<MoviesList searchTerm={appliedTerm} filter={appliedFilter} perPage={20} />
			</section>
		</main>
	)
}

export default SelectMoviesPage