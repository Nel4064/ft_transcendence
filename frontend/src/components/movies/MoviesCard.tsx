import Card from '../Card/Card';

type MoviesCardProps = { movie: string; image: string }

function MoviesCard({ movie, image }: MoviesCardProps) {
    return (
        <Card
            padding="lg"
            hoverable
            image={image}
            title={movie}
            to={`/movies/${encodeURIComponent(movie)}`}
            className="w-full max-w-[700px]"
        />
    )
}
export default MoviesCard
