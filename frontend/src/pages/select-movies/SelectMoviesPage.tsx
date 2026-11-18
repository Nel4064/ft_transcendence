import { useState } from 'react'
import { Link } from 'react-router-dom'
import MoviesList from '../../components/movies/MoviesList'
import Button from '../../components/button/Button'
import Input from '../../components/Input/Input'
import Heading from '../../components/Heading/Heading'

const boxClass = "flex items-center gap-4 max-w-[1000px] mx-auto mb-4 p-8 bg-surface border border-border rounded-lg shadow-card"
const selectClass = "py-4 px-5 border border-border rounded-md text-control bg-surface cursor-pointer"

function SelectMoviesPage() {
	const [searchTerm, setSearchTerm] = useState('')
	const [filter, setFilter] = useState('title')
	const [appliedTerm, setAppliedTerm] = useState('')

	return (
		<main className="py-12 px-10">
			<Heading level="section" as="h1" className="mb-6">Pick screening(s) for the club</Heading>
			<section className={boxClass}>
				<Input
					id="search"
					size="xl"
					type={filter === 'date' ? 'date' : 'text'}
					value={searchTerm}
					placeholder="Search for a movie"
					onChange={(e) => setSearchTerm(e.target.value)}
					className="flex-1"
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
			<p className="max-w-[1000px] mx-auto mb-[100px] text-center text-small text-text-muted">
				Can't find your movie?{' '}
				<Link to="/your-event" className="font-bold text-text-admin-muted hover:text-admin transition-colors duration-300">
					Create your own event
				</Link>
			</p>
			<section className="grid grid-cols-4 gap-5 max-w-[2000px] mx-auto my-[50px]">
				<MoviesList searchTerm={appliedTerm} filter={filter} perPage={20} />
			</section>
		</main>
	)
}

export default SelectMoviesPage
