import { useNavigate } from 'react-router-dom'
import Button from '../button/Button'
import Icon from '../Icon/Icon'

type BackButtonProps = {
    label?: string
}

function BackButton({ label = 'Back' }: BackButtonProps) {
    const navigate = useNavigate()

    return (
        <Button variant="secondary" className="w-fit flex items-center gap-1.5" onClick={() => navigate(-1)}>
            <Icon name="arrow-back" size={16} />
            {label}
        </Button>
    )
}

export default BackButton
