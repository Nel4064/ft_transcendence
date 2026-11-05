import ScreeningsList from '../../components/Screenings/ScreeningsList'

function ScreeningsPage() {
	return (
		<main className="py-12 px-10">
			<h1 className="mb-6 font-serif font-bold text-section text-text">Join upcoming screening(s)</h1>
			<ScreeningsList />
		</main>
	)
}

export default ScreeningsPage
