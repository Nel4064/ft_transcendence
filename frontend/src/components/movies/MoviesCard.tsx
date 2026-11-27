import Card from '../Card/Card';

type MoviesCardProps = {
    movie: string;
    displayTitle?: string;
    image: string;
};

function MoviesCard({ movie, displayTitle, image }: MoviesCardProps) {
    return (
        <Card
            padding="lg"
            hoverable
            image={image}
            title={displayTitle ?? movie}
            to={`/movies/${encodeURIComponent(movie)}`}
            className="w-full max-w-[700px]"
        />
    );
}

export default MoviesCard;
