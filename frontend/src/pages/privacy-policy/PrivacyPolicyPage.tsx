
import Heading from '../../components/Heading/Heading'
const textClass = "my-4 text-body text-text"



function PrivacyPolicyPage() {
	return (
		<main className="max-w-[1200px] mx-auto py-12 px-10">
			<section>
				<Heading>Privacy Policy</Heading>
				<p className={textClass}>CineClub is a scheduling and social platform for members of a local 
					independent-cinema club. This page explains what personal data we collect, 
					why, and what control members have over it.</p>
				<Heading level="subtitle">What we collect</Heading>
				<p className={textClass}>Account data (email, display name, avatar, bio), activity data (RSVPs, 
					friend connections, chat messages), 
					and — if used — your 42 Intra login or two-factor authentication secret.</p>
				<Heading level="subtitle">Why we collect it</Heading>
				<p className={textClass}>To operate the club's shared screening schedule, 
					let members recognise and message each other, 
					generate your personal calendar export, and secure your account.</p>
				<Heading level="subtitle">Third parties</Heading>
				<p className={textClass}>Screening times come from the public datacinesindes.fr feed.
					We do not sell or share your data with advertisers.</p>
				<Heading level="subtitle">Your rights</Heading>
				<p className={textClass}>You can export a copy of everything we hold about your account, or request permanent deletion, at any time from your profile settings.</p>
			</section>
		</main>
	)
}

export default PrivacyPolicyPage
