import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar/Navbar'
import HomePage from './pages/home/HomePage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import SignInPage from './pages/sign-in/SignInPage'
import SignUpPage from './pages/sign-up/SignUpPage'
import SelectMoviesPage from './pages/select-movies/SelectMoviesPage'
import BottomNav from './components/BottomNav/BottomNav'
import PrivacyPolicyPage from './pages/privacy-policy/PrivacyPolicyPage'
import TermsOfServicePage from './pages/terms-of-service/TermsOfServicePage'
import FriendsPage from './pages/friends/FriendsPage'
import { AuthProvider } from './context/AuthContext'
import { DialogProvider } from './context/DialogContext'
import ProfilePage from './pages/profile/ProfilePage'
import EditProfilePage from './pages/profile/EditProfilePage'
import Security2FAPage from './pages/profile/Security2FAPage'
import PrivacyGDPRPage from './pages/profile/PrivacyGDPRPage'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import MovieDetailsPage from './pages/movie-details/MovieDetailsPage'
import ScreenDetailsPage from './pages/screenings-details/ScreenDetailsPage'
import UserProfilePage from './pages/profile/UserProfilePage'
import ScreeningsPage from './pages/screenings/ScreeningsPage'
import CalendarPage from './pages/calendar/CalendarPage'
import ChatPage from './pages/chat/ChatPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import StatusPage from './pages/status/StatusPage'


function App() {
	return (
		<AuthProvider>
		<DialogProvider>
			<BrowserRouter>
			<div className="min-h-screen flex flex-col">
			<Navbar />
			<div className="flex-1">
				<Routes>
				<Route path="/" element={<HomePage />} />
				<Route path="/signin" element={<SignInPage />} />
				<Route path="/signup" element={<SignUpPage />} />
				<Route path="/privacypolicy" element={<PrivacyPolicyPage />} />
				<Route path="/termsofservice" element={<TermsOfServicePage />} />
				<Route path="/status" element={<StatusPage />} />

				<Route element={<ProtectedRoute />}>
					<Route path="/profile" element={<ProfilePage />} />
					<Route path="/notifications" element={<NotificationsPage />} />
					<Route path="/screenings" element={<ScreeningsPage />} />
					<Route path="/movies/:title" element={<MovieDetailsPage />} />
					<Route path="/screenings/:id" element={<ScreenDetailsPage />} />
					<Route path="/friends" element={<FriendsPage />} />
					<Route path="/users/:id" element={<UserProfilePage />} />
					<Route path="/chat/:friendId" element={<ChatPage />} />
					<Route path="/calendar" element={<CalendarPage />} />
					<Route path="/profile/security" element={<Security2FAPage />} />
					<Route path="/profile/privacy" element={<PrivacyGDPRPage />} />
					<Route path="/profile/edit" element={<EditProfilePage />} />					
				</Route>

				<Route element={<ProtectedRoute adminOnly />}>
					<Route path="/select-movies" element={<SelectMoviesPage />} />
					<Route path="/admin" element={<AdminDashboard />} />
				</Route>

					<Route path="*" element={
					<main className="max-w-[1200px] mx-auto py-12 px-10">
						<h1 className="font-serif font-bold text-title text-text">404 Not Found</h1>
					</main>
				} />
			</Routes>
			</div>
			<BottomNav />
			</div>
			</BrowserRouter>
		</DialogProvider>
		</AuthProvider>
	)
}

export default App
