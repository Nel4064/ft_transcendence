import FriendsManager from '../../components/Friends/FriendsManager';
import Heading from '../../components/Heading/Heading';

export default function FriendsPage() {

    return (
        <main className="max-w-[800px] mx-auto py-12 px-4">
            <Heading level="title" className="mb-5">Friends</Heading>
            <FriendsManager />
        </main>
    );
}