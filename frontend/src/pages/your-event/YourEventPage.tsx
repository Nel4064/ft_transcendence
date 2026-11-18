import { useState, type ChangeEvent, type FormEvent } from 'react'
import Button from '../../components/button/Button'

const titleClass = "mb-6 font-serif font-bold text-section text-text"
const formClass = "flex flex-col gap-4 max-w-[800px] mx-auto p-8 bg-surface border border-border rounded-lg shadow-card"
const fieldClass = "flex flex-col gap-1"
const labelClass = "text-small font-medium text-text"
const inputClass = "py-2 px-3 border border-border rounded-md text-control bg-surface text-text focus:outline-none focus:border-admin"

const emptyForm = {
	filmTitle: '',
	director: '',
	cast: '',
	synopsis: '',
	genres: '',
	runtimeMinutes: '',
	startsAt: '',
	endsAt: '',
	cinemaName: '',
	cinemaAddress: '',
	cinemaPostalCode: '',
	cinemaCity: '',
}

type FormKey = keyof typeof emptyForm

// Un champ = une ligne du formulaire (clé de l'objet form, label, type d'input, contraintes)
const fields: { name: FormKey; label: string; type?: string; required?: boolean; maxLength?: number }[] = [
	{ name: 'filmTitle', label: 'Movie title', required: true },
	{ name: 'director', label: 'Director' },
	{ name: 'cast', label: 'Cast' },
	{ name: 'genres', label: 'Genres (comma separated)' },
	{ name: 'runtimeMinutes', label: 'Runtime (minutes)', type: 'number' },
	{ name: 'startsAt', label: 'Starts at', type: 'datetime-local', required: true },
	{ name: 'endsAt', label: 'Ends at', type: 'datetime-local', required: true },
	{ name: 'cinemaName', label: 'Venue name', required: true, maxLength: 60 },
	{ name: 'cinemaAddress', label: 'Address', required: true, maxLength: 100 },
	{ name: 'cinemaPostalCode', label: 'Postal code', required: true, maxLength: 5 },
	{ name: 'cinemaCity', label: 'City', required: true, maxLength: 40 },
]

function YourEventPage() {
	const [form, setForm] = useState(emptyForm)

	// onChange générique : le "name" de l'input indique quelle clé de form mettre à jour
	function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
		setForm({ ...form, [e.target.name]: e.target.value })
	}

	function handleSubmit(e: FormEvent) {
		e.preventDefault()
		console.log(form)
	}

	return (
		<main className="py-12 px-10">
			<h1 className={`${titleClass} text-center`}>Create your own event</h1>
			<form onSubmit={handleSubmit} className={formClass}>
				{fields.map((f) => (
					<div key={f.name} className={fieldClass}>
						<label htmlFor={f.name} className={labelClass}>{f.label}</label>
						<input
							id={f.name}
							name={f.name}
							type={f.type ?? 'text'}
							value={form[f.name]}
							onChange={handleChange}
							required={f.required}
							maxLength={f.maxLength}
							className={inputClass}
						/>
					</div>
				))}

				<div className={fieldClass}>
					<label htmlFor="synopsis" className={labelClass}>Synopsis</label>
					<textarea
						id="synopsis"
						name="synopsis"
						value={form.synopsis}
						onChange={handleChange}
						className={`${inputClass} h-[120px] resize-y`}
					/>
				</div>

				<Button variant="admin" size="lg" type="submit">Create</Button>
			</form>
		</main>
	)
}

export default YourEventPage
