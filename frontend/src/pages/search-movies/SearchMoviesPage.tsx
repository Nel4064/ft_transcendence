import { useState } from 'react'
import MoviesList from '../../components/movies/MoviesList'

const boxClass = "flex items-center gap-4 max-w-[1000px] mx-auto my-[100px] p-8 bg-surface border border-border rounded-lg shadow-card"
const inputClass = "flex-1 py-4 px-5 border border-border rounded-md text-xl"
const buttonClass = "py-4 px-8 rounded-md bg-admin hover:bg-admin-hover text-white text-xl font-bold cursor-pointer transition-colors"
const selectClass = "py-4 px-5 border border-border rounded-md text-xl bg-surface cursor-pointer"

function SearchMoviesPage() {
	const [searchTerm, setSearchTerm] = useState('')
	const [filter, setFilter] = useState('title')
	const [appliedTerm, setAppliedTerm] = useState('')

	return (
		<main>
			<section className={boxClass}>
				<input
					id="search"
					type="text"
					value={searchTerm}
					placeholder={filter === 'date' ? 'MM/DD/YYYY' : 'Search for a movie'}
					onChange={(e) => setSearchTerm(e.target.value)}
					className={inputClass}
				/>
				<select
					value={filter}
					onChange={(e) => { setFilter(e.target.value); setSearchTerm('') }}
					className={selectClass}
				>
					<option value="title">Title</option>
					<option value="cinema">Cinema</option>
					<option value="date">Date</option>
				</select>
				<button onClick={() => setAppliedTerm(searchTerm)} className={buttonClass}>Search</button>
			</section>
			<section className="grid grid-cols-4 gap-5 max-w-[2000px] mx-auto my-[50px]">
				<MoviesList searchTerm={appliedTerm} filter={filter} perPage={20} />
			</section>
		</main>
	)
}

export default SearchMoviesPage
