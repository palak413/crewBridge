import { createBrowserRouter, type RouteObject } from 'react-router'
import { LandingPage } from '../features/landing/LandingPage'
import { NotFoundPage } from './NotFoundPage'
import { Root } from './Root'
import { RouteError } from './RouteError'

const planned = () => import('../features/placeholder/PlannedPage').then((m) => ({ Component: m.PlannedPage }))

const eventForm = () => import('../features/events/EventFormPage').then((m) => ({ Component: m.EventFormPage }))

export const routes: RouteObject[] = [
  {
    element: <Root />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <div className="min-h-dvh bg-canvas" />,
    children: [
      { path: '/', element: <LandingPage /> },
      // Auth and app are code-split so the landing page doesn't download form/validation code.
      { path: '/login', lazy: () => import('../features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })) },
      { path: '/register', lazy: () => import('../features/auth/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
      {
        // AppShell picks the live (API) or demo data source and guards live sessions.
        path: '/app',
        lazy: () => import('../components/layout/AppShell').then((m) => ({ Component: m.AppShell })),
        children: [
          { index: true, lazy: () => import('../features/dashboard/OverviewPage').then((m) => ({ Component: m.OverviewPage })) },
          { path: 'events', lazy: () => import('../features/events/EventsPage').then((m) => ({ Component: m.EventsPage })) },
          { path: 'events/new', lazy: eventForm },
          { path: 'events/:eventId', lazy: () => import('../features/events/EventWorkspacePage').then((m) => ({ Component: m.EventWorkspacePage })) },
          { path: 'events/:eventId/edit', lazy: eventForm },
          { path: 'tasks', lazy: () => import('../features/tasks/TasksPage').then((m) => ({ Component: m.TasksPage })) },
          { path: 'volunteers', lazy: () => import('../features/volunteers/VolunteersPage').then((m) => ({ Component: m.VolunteersPage })) },
          { path: 'messages', lazy: () => import('../features/messages/MessagesPage').then((m) => ({ Component: m.MessagesPage })) },
          { path: 'analytics', lazy: planned },
          { path: 'settings', lazy: planned },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const router = createBrowserRouter(routes)
