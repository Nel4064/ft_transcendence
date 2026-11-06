import ActivitiesCard from '../../components/Activity/ActivitiesCard'

function ActivityPage() {
	return (
		<main className="max-w-[560px] mx-auto py-12 px-4">
			<h1 className="font-serif font-bold text-title text-text mb-5">Activity</h1>
			<div className="flex flex-col gap-2.5">
				<ActivitiesCard message="Perfect Days was added as a Club Pick" time="2 hours ago" unread />
				<ActivitiesCard message="Théo accepted your friend request" time="Yesterday" actor={{ displayName: "Théo", avatarUrl: null }} unread />
				<ActivitiesCard message="Anatomy of a Fall was cancelled by the cinema" time="2 days ago" />
				<ActivitiesCard message="Amine sent you a friend request" time="3 days ago" actor={{ displayName: "Amine", avatarUrl: null }} />
			</div>
		</main>
	)
}

export default ActivityPage

