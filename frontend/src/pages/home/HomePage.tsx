import ScreeningsList from '../../components/Screenings/ScreeningsList'
import Heading from '../../components/Heading/Heading'


function HomePage() {
	return (
		<>
			<main>
				<section className="py-20 px-10 text-center bg-bg">
					<h1 className="font-serif font-bold text-display text-text">Discover movies.<br />Meet people.</h1>
					<p className="my-8 font-serif font-light text-section text-text-muted"> Create movie events, join discussions, and connect with movie lovers. </p>
				</section>

				<section className="py-12 px-10">
					<div className="flex justify-between items-center mb-6">
						<Heading level="section">Upcoming Screenings...</Heading>
					</div>

					<ScreeningsList upcomingOnly/>
				</section>
			</main>
		</>
	)
}

export default HomePage
