import Badge from './Badge'
import Icon from '../Icon/Icon'

type RoleBadgeProps = {
    role: 'ADMIN' | 'USER'
}

function RoleBadge({ role }: RoleBadgeProps) {
    if (role === 'ADMIN')
        return <Badge tone="admin" icon={<Icon name="shield" size={14} />}>Admin</Badge>
    return <Badge tone="brand">Member</Badge>
}

export default RoleBadge
