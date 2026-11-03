import { createBrowserRouter } from 'react-router'
import { RequireAuth, RequireCoach, RequireProfile } from './auth/guards'
import { AppShell } from './components/AppShell'
import { AthletePage } from './pages/AthletePage'
import { CoachPage } from './pages/CoachPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { InvitePage } from './pages/InvitePage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { ProgramPage } from './pages/ProgramPage'
import { SessionPage } from './pages/SessionPage'
import { SettingsPage } from './pages/SettingsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/invite/:token', element: <InvitePage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <RequireProfile />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/program/:athleteId/:programId', element: <ProgramPage /> },
              { path: '/session/:athleteId/:sessionId', element: <SessionPage /> },
              { path: '/settings', element: <SettingsPage /> },
              {
                element: <RequireCoach />,
                children: [
                  { path: '/coach', element: <CoachPage /> },
                  { path: '/athlete/:athleteId', element: <AthletePage /> },
                ],
              },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
