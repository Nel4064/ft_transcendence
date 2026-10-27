import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar/Navbar'
import HomePage from './pages/home/HomePage'
import ActivityPage from './pages/activity/ActivityPage'
import SignInPage from './pages/sign-in/SignInPage'
import SignUpPage from './pages/sign-up/SignUpPage'
import SearchMoviesPage from './pages/search-movies/SearchMoviesPage'
import BottomNav from './components/BottomNav/BottomNav'
import PrivacyPolicyPage from './pages/privacy-policy/PrivacyPolicyPage'
import TermsOfServicePage from './pages/terms-of-service/TermsOfServicePage'
import CalendarPage from './pages/calendar/CalendarPage'
import { AuthProvider } from './context/AuthContext'
import ProfilePage from './pages/profile/ProfilePage'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import MovieDetailsPage from './pages/movie-details/MovieDetailsPage'


function App() {
	return (
		<AuthProvider>
			<BrowserRouter>
			<div className="min-h-screen flex flex-col">
			<Navbar />
			<div className="flex-1">
				<Routes>
				{/* Pages publiques */}
				<Route path="/" element={<HomePage />} />
				<Route path="/signin" element={<SignInPage />} />
				<Route path="/signup" element={<SignUpPage />} />
				<Route path="/privacypolicy" element={<PrivacyPolicyPage />} />
				<Route path="/termsofservice" element={<TermsOfServicePage />} />

				{/* Pages réservées aux utilisateurs connectés */}
				<Route element={<ProtectedRoute />}>
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/activity" element={<ActivityPage />} />
					<Route path="/calendar" element={<CalendarPage />} />
					<Route path="/movies/:title" element={<MovieDetailsPage />} />
				</Route>

				<Route element={<ProtectedRoute adminOnly />}>
					<Route path="/search-movies" element={<SearchMoviesPage />} />
				</Route>

					<Route path="*" element={
					<main className="max-w-[1200px] mx-auto py-12 px-10">
						<h1 className="font-serif font-bold text-4xl text-text">404 Not Found</h1>
					</main>
				} />
			</Routes>
			</div>
			<BottomNav />
			</div>
			</BrowserRouter>
		</AuthProvider>
	)
}

export default App
