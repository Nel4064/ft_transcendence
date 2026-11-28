import { useTranslation } from 'react-i18next'
import Button from '../button/Button'

// 'admin' for admin features, 'primary' (brand color) everywhere else
type PaginationVariant = 'primary' | 'admin'

type PaginationProps = {
	page: number
	totalPages: number
	onPageChange: (page: number) => void
	variant?: PaginationVariant
	className?: string
}

function Pagination({ page, totalPages, onPageChange, variant = 'primary', className = '' }: PaginationProps) {
	const { t } = useTranslation()

	if (totalPages <= 1) return null

	return (
		<div className={`flex items-center justify-center gap-4 mt-4 ${className}`.trim()}>
			<Button variant={variant} onClick={() => onPageChange(page - 1)} disabled={page === 1}>
				{t('common.pagination.previous')}
			</Button>
			<span>{t('common.pagination.pageInfo', { page, totalPages })}</span>
			<Button variant={variant} onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
				{t('common.pagination.next')}
			</Button>
		</div>
	)
}

export default Pagination
