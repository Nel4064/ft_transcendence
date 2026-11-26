import Badge from './Badge'
import Icon from '../Icon/Icon'

const LANGUAGE_LABELS: Record<string, string> = {
    EN: 'English',
    FR: 'Français',
    ZH: '中文',
}

type LanguageBadgeProps = {
    language: string
}

function LanguageBadge({ language }: LanguageBadgeProps) {
    return (
        <Badge icon={<Icon name="world" size={14} />}>
            {LANGUAGE_LABELS[language] || language}
        </Badge>
    )
}

export default LanguageBadge
