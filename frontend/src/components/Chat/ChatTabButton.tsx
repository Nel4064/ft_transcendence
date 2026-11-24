interface ChatTabButtonProps {
	label: string;
	isActive: boolean;
	onClick: () => void;
}

export default function ChatTabButton({
	label, isActive, onClick
}: ChatTabButtonProps)
{
	return (
		<button
			type="button"
			aria-pressed={isActive}
			onClick={onClick}
			className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                            ? 'bg-brand text-white'
                            : 'bg-bg text-text-muted hover:text-text'
                    }`}
		>
			{label}
		</button>
	);
}
