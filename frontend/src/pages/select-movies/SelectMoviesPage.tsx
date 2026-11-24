import { useState } from 'react'
import MoviesList from '../../components/movies/MoviesList'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'

const boxClass = "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full max-w-[1000px] mx-auto mb-10 sm:mb-16 lg:mb-24 p-4 sm:p-6 lg:p-8 bg-surface border border-border rounded-lg shadow-card"
const selectClass = "w-full sm:w-auto py-3.5 sm:py-4 px-4 sm:px-5 border border-border rounded-md text-control bg-surface cursor-pointer"

function SelectMoviesPage() {
	const [searchTerm, setSearchTerm] = useState('')
	const [filter, setFilter] = useState('title')
	const [appliedTerm, setAppliedTerm] = useState('')

	return (
		<main className="w-full max-w-[1600px] mx-auto py-8 px-4 sm:py-10 sm:px-6 lg:py-12 lg:px-10">
			<Heading level="section" as="h1" className="mb-6 text-center sm:text-left">
				Pick screening(s) for the club
			</Heading>

			<section className={boxClass}>
				<Input
					id="search"
					size="xl"
					type={filter === 'date' ? 'date' : 'text'}
					value={searchTerm}
					placeholder="Search for a movie"
					onChange={(e) => setSearchTerm(e.target.value)}
					className="w-full sm:flex-1"
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
				<Button
					variant="admin"
					size="xl"
					onClick={() => setAppliedTerm(searchTerm)}
					className="w-full sm:w-auto justify-center"
				>
					Search
				</Button>
			</section>

			<section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 max-w-[1600px] mx-auto my-8 sm:my-12 justify-items-center">
				<MoviesList searchTerm={appliedTerm} filter={filter} perPage={20} />
			</section>
		</main>
	)
}

export default SelectMoviesPage