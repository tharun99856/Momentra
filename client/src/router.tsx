import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import RouteGuard from './components/RouteGuard'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import { SearchPage } from './pages/SearchPage'
import { MyPhotosPage } from './pages/MyPhotosPage'
import { FavouritesPage } from './pages/FavouritesPage'
import UploadPage from './pages/UploadPage'
import { ProfilePage } from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'

export const router = createBrowserRouter([
  // Public marketing page
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Authenticated app
  {
    path: '/dashboard',
    element: <RouteGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
        ],
      },
    ],
  },
  {
    path: '/',
    element: <RouteGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: 'events', element: <EventsPage /> },
          { path: 'events/:id', element: <EventDetailPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'my-photos', element: <MyPhotosPage /> },
          { path: 'favourites', element: <FavouritesPage /> },
          { path: 'upload', element: <UploadPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
