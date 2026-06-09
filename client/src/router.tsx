import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import RouteGuard from './components/RouteGuard'
import HomePage from './pages/HomePage'
import EventsPage from './pages/EventsPage'
import EventDetailPage from './pages/EventDetailPage'
import { SearchPage } from './pages/SearchPage'
import { MyPhotosPage } from './pages/MyPhotosPage'
import { FavouritesPage } from './pages/FavouritesPage'
import UploadPage from './pages/UploadPage'
import { ProfilePage } from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import NotFoundPage from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RouteGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'events', element: <EventsPage /> },
          { path: 'events/:id', element: <EventDetailPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'my-photos', element: <MyPhotosPage /> },
          { path: 'favourites', element: <FavouritesPage /> },
          { path: 'upload', element: <UploadPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '*', element: <NotFoundPage /> },
])
