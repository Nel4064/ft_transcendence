import Card from '../Card/Card'

type ScreeningsCardProps = { id: string; movie: string; image: string }

function ScreeningsCard({ id, movie, image }: ScreeningsCardProps) {
    return (
        <Card
            hoverable
            image={image}
            imageHeight="lg"
            title={movie}
            to={`/screenings/${id}`}
            className="w-64 shrink-0 snap-start"
        />
    )
}

export default ScreeningsCard
