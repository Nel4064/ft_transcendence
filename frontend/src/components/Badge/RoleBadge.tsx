import { useTranslation } from 'react-i18next'
import Badge from './Badge'
import Icon from '../Icon/Icon'

type RoleBadgeProps = {
    role: 'ADMIN' | 'USER'
}

function RoleBadge({ role }: RoleBadgeProps) {
    const { t } = useTranslation()
    if (role === 'ADMIN')
        return <Badge tone="admin" icon={<Icon name="shield" size={14} />}>{t('userProfile.roles.admin')}</Badge>
    return <Badge tone="brand">{t('userProfile.roles.member')}</Badge>
}

export default RoleBadge
