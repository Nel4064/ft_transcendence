import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Avatar from "../Avatar/Avatar";

type FriendsCardProps = {
	user: { id: string; username: string; displayName: string; avatarUrl?: string }
	subtitle: string
	children?: ReactNode
}

const cardClass = "flex items-center justify-between p-3 bg-bg border border-border rounded-md"
const avatarButtonClass = "cursor-pointer hover:opacity-80 transition-opacity"

function FriendsCard({ user, subtitle, children }: FriendsCardProps) {
	const navigate = useNavigate()
	const { t } = useTranslation()
	const name = user.displayName || user.username

	return (
		<div className={cardClass}>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate(`/users/${user.id}`)}
					className={avatarButtonClass}
					title={t("friends.viewProfile")}
				>
					<Avatar src={user.avatarUrl} name={name} size={40} />
				</button>
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