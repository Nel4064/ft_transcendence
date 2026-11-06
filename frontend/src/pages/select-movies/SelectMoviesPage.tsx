import { useState } from 'react'
import MoviesList from '../../components/movies/MoviesList'
import Button from '../../components/button/Button'

const titleClass = "mb-6 font-serif font-bold text-section text-text"
const boxClass = "flex items-center gap-4 max-w-[1000px] mx-auto mb-[100px] p-8 bg-surface border border-border rounded-lg shadow-card"
const inputClass = "flex-1 py-4 px-5 border border-border rounded-md text-control"
const selectClass = "py-4 px-5 border border-border rounded-md text-control bg-surface cursor-pointer"

function SelectMoviesPage() {
	const [searchTerm, setSearchTerm] = useState('')
	const [filter, setFilter] = useState('title')
	const [appliedTerm, setAppliedTerm] = useState('')

	return (
		<main className="py-12 px-10">
			<h1 className={titleClass}>Pick screening(s) for the club</h1>
			<section className={boxClass}>
				<input
					id="search"
					type={filter === 'date' ? 'date' : 'text'}
					value={searchTerm}
					placeholder="Search for a movie"
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
				<Button variant="admin" size="xl" onClick={() => setAppliedTerm(searchTerm)}>Search</Button>
			</section>
			<section className="grid grid-cols-4 gap-5 max-w-[2000px] mx-auto my-[50px]">
				<MoviesList searchTerm={appliedTerm} filter={filter} perPage={20} />
			</section>
		</main>
	)
}

export default SelectMoviesPage
