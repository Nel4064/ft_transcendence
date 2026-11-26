import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../button/Button'
import Icon from '../Icon/Icon'

type BackButtonProps = {
    label?: string
    onClick?: () => void
}

function BackButton({ label, onClick }: BackButtonProps) {
    const navigate = useNavigate()
    const { t } = useTranslation()

    return (
        <Button
            type="button"
            variant="secondary"
            className="w-fit flex items-center gap-1.5"
            onClick={onClick ?? (() => navigate(-1))}
        >
            <Icon name="arrow-back" size={16} />
            {label ?? t('common.back', 'Back')}
        </Button>
    )
}

export default BackButton