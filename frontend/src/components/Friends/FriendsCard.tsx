import type { ReactNode } from "react";
import AvatarLink from "../Avatar/AvatarLink";

type FriendsCardProps = {
	user: { id: string; username: string; displayName: string; avatarUrl?: string }
	subtitle: string
	children?: ReactNode
}

const cardClass = "flex items-center justify-between p-3 bg-bg border border-border rounded-md"

function FriendsCard({ user, subtitle, children }: FriendsCardProps) {
	const name = user.displayName || user.username

	return (
		<div className={cardClass}>
			<div className="flex items-center gap-3">
				<AvatarLink userId={user.id} src={user.avatarUrl} name={name} size={40} />
				<div>
					<div className="font-semibold">{name}</div>
					<div className="text-xs text-text-muted">{subtitle}</div>
				</div>
			</div>
			<div className="flex items-center gap-2">{children}</div>
		</div>
	)
}

export default FriendsCard