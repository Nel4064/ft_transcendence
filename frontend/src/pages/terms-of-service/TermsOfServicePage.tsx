import Heading from '../../components/Heading/Heading'

const textClass = "my-4 text-body text-text"

function TermsOfServicePage() {
	return (
		<main className="max-w-[1200px] mx-auto py-12 px-10">
			<section>
				<Heading>Terms of Service</Heading>
				<p className={textClass}>These terms govern your use of CineClub, a scheduling and social platform for the members of a local independent-cinema club. By creating an account, you agree to them.</p>
				<Heading level="subtitle">Membership</Heading>
				<p className={textClass}>Accounts are for individual club members. You're responsible for keeping your login credentials confidential and for activity under your account.</p>
				<Heading level="subtitle">Acceptable use</Heading>
				<p className={textClass}>Be respectful in chat, RSVP honestly, and don't attempt to access another member's account or misuse the schedule.</p>
				<Heading level="subtitle">Screening data</Heading>
				<p className={textClass}>Screening times are pulled from the public datacinesindes.fr feed and may occasionally be inaccurate or change without notice on the cinema's side — always double-check before travelling.</p>
				<Heading level="subtitle">Termination</Heading>
				<p className={textClass}>You may delete your account at any time. We may suspend accounts that violate these terms.</p>
			</section>
		</main>
	)
}

export default TermsOfServicePage
