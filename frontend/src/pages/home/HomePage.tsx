import ScreeningsList from '../../components/Screenings/ScreeningsList'
import Heading from '../../components/Heading/Heading'


function HomePage() {
	return (
		<main className="w-full">
			<section className="w-full py-12 px-4 sm:py-16 sm:px-6 text-center bg-bg">
				<div className="max-w-3xl mx-auto">
					<h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-display text-text">
						Discover movies.<br />Meet people.
					</h1>
					<p className="my-6 sm:my-8 font-serif font-light text-base sm:text-lg lg:text-section text-text-muted">
						Create movie events, join discussions, and connect with movie lovers.
					</p>
				</div>
			</section>

			<section className="w-full max-w-[1400px] mx-auto py-8 px-4 sm:py-10 sm:px-6">
				<div className="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-2 mb-6">
					<Heading level="section">Upcoming Screenings...</Heading>
				</div>

				<ScreeningsList upcomingOnly />
			</section>
		</main>
	)
}

export default HomePage
