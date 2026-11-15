import { lazy, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useApp } from './lib/store'
import type { Role } from './lib/types'
import { AppShell, PublicShell } from './components/Layout'

import { LoginPage } from './pages/auth/Login'
import { SignupPage } from './pages/auth/Signup'
import { PrivacyPage } from './pages/Privacy'
import { ForbiddenPage, NotFoundPage } from './pages/States'

// Feature pages are split into separate chunks so the first screen stays light on
// low-bandwidth connections. RouteBoundary in AppShell reports a failed chunk download
// instead of leaving a blank page.
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const ClassesPage = lazy(() => import('./pages/Classes').then((m) => ({ default: m.ClassesPage })))
const LiveClassesPage = lazy(() => import('./pages/LiveClasses').then((m) => ({ default: m.LiveClassesPage })))
const RecordingsPage = lazy(() => import('./pages/Recordings').then((m) => ({ default: m.RecordingsPage })))
const MaterialsPage = lazy(() => import('./pages/Materials').then((m) => ({ default: m.MaterialsPage })))
const QuizzesPage = lazy(() => import('./pages/Quizzes').then((m) => ({ default: m.QuizzesPage })))
const QuizRunnerPage = lazy(() => import('./pages/QuizRunner').then((m) => ({ default: m.QuizRunnerPage })))
const LabsPage = lazy(() => import('./pages/Labs').then((m) => ({ default: m.LabsPage })))
const LabDetailPage = lazy(() => import('./pages/LabDetail').then((m) => ({ default: m.LabDetailPage })))
const AIAssistantPage = lazy(() => import('./pages/AIAssistant').then((m) => ({ default: m.AIAssistantPage })))
const LibraryPage = lazy(() => import('./pages/Library').then((m) => ({ default: m.LibraryPage })))
const AttendancePage = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.AttendancePage })))
const MarksPage = lazy(() => import('./pages/Marks').then((m) => ({ default: m.MarksPage })))
const DoubtsPage = lazy(() => import('./pages/Doubts').then((m) => ({ default: m.DoubtsPage })))
const ScholarshipsPage = lazy(() => import('./pages/Scholarships').then((m) => ({ default: m.ScholarshipsPage })))
const DownloadsPage = lazy(() => import('./pages/Downloads').then((m) => ({ default: m.DownloadsPage })))
const NotificationsPage = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.NotificationsPage })))
const FeedbackPage = lazy(() => import('./pages/Feedback').then((m) => ({ default: m.FeedbackPage })))
const AdminFeedbackPage = lazy(() => import('./pages/Feedback').then((m) => ({ default: m.AdminFeedbackPage })))
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })))
const ParentLinkPage = lazy(() => import('./pages/ParentLink').then((m) => ({ default: m.ParentLinkPage })))
const AdminApprovalsPage = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminApprovalsPage })))
const AdminClassesPage = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminClassesPage })))
const AdminContentPage = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminContentPage })))
const AdminSchoolsPage = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminSchoolsPage })))
const AdminSettingsPage = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminSettingsPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/Admin').then((m) => ({ default: m.AdminUsersPage })))

const EVERYONE: Role[] = ['student', 'teacher', 'parent', 'admin']
const LEARNING: Role[] = ['student', 'teacher', 'admin']
const DOWNLOADS: Role[] = ['student', 'teacher']
const ADMINS: Role[] = ['admin']

function RequireAuth({ children }: { children: ReactNode }) {
  const { currentUser } = useApp()
  const location = useLocation()
  if (!currentUser) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from: from === '/' ? '/dashboard' : from }} />
  }
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { currentUser } = useApp()
  if (currentUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/** Route-level permission gate. Signed-in users without access see a clear explanation. */
function Allow({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { currentUser } = useApp()
  if (!currentUser) return <Navigate to="/login" replace />
  if (!roles.includes(currentUser.role)) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}

/** The privacy notice can be read before signing in and stays inside the app afterwards. */
function PrivacyRoute() {
  const { currentUser } = useApp()
  if (currentUser) {
    return (
      <AppShell>
        <PrivacyPage />
      </AppShell>
    )
  }
  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-wrap px-4 pb-10 sm:px-6">
        <PrivacyPage />
      </main>
    </PublicShell>
  )
}

function NotFoundRoute() {
  const { currentUser } = useApp()
  if (currentUser) {
    return (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    )
  }
  return (
    <PublicShell>
      <main className="mx-auto w-full max-w-wrap px-4 pb-10 sm:px-6">
        <NotFoundPage />
      </main>
    </PublicShell>
  )
}

/** Applies per-account accessibility preferences to the whole document. */
function AppPreferences() {
  const { currentUser } = useApp()
  useEffect(() => {
    document.body.classList.toggle('text-large', currentUser?.textSize === 'large')
    document.body.classList.toggle('reduce-motion', !!currentUser?.reduceMotion)
  }, [currentUser?.textSize, currentUser?.reduceMotion])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export function App() {
  return (
    <>
      <AppPreferences />
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <PublicShell>
                <LoginPage />
              </PublicShell>
            </PublicOnly>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnly>
              <PublicShell>
                <SignupPage />
              </PublicShell>
            </PublicOnly>
          }
        />
        <Route path="/privacy" element={<PrivacyRoute />} />

        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/classes" element={<ClassesPage />} />

          <Route
            path="/live"
            element={
              <Allow roles={LEARNING}>
                <LiveClassesPage />
              </Allow>
            }
          />
          <Route
            path="/recordings"
            element={
              <Allow roles={LEARNING}>
                <RecordingsPage />
              </Allow>
            }
          />
          <Route
            path="/materials"
            element={
              <Allow roles={LEARNING}>
                <MaterialsPage />
              </Allow>
            }
          />
          <Route
            path="/quizzes"
            element={
              <Allow roles={LEARNING}>
                <QuizzesPage />
              </Allow>
            }
          />
          <Route
            path="/quizzes/:id"
            element={
              <Allow roles={LEARNING}>
                <QuizRunnerPage />
              </Allow>
            }
          />
          <Route
            path="/labs"
            element={
              <Allow roles={LEARNING}>
                <LabsPage />
              </Allow>
            }
          />
          <Route
            path="/labs/:id"
            element={
              <Allow roles={LEARNING}>
                <LabDetailPage />
              </Allow>
            }
          />
          <Route
            path="/ai"
            element={
              <Allow roles={LEARNING}>
                <AIAssistantPage />
              </Allow>
            }
          />
          <Route
            path="/library"
            element={
              <Allow roles={LEARNING}>
                <LibraryPage />
              </Allow>
            }
          />
          <Route
            path="/doubts"
            element={
              <Allow roles={LEARNING}>
                <DoubtsPage />
              </Allow>
            }
          />

          <Route path="/attendance" element={<Allow roles={EVERYONE}><AttendancePage /></Allow>} />
          <Route path="/marks" element={<Allow roles={EVERYONE}><MarksPage /></Allow>} />
          <Route path="/scholarships" element={<Allow roles={EVERYONE}><ScholarshipsPage /></Allow>} />
          <Route path="/notifications" element={<Allow roles={EVERYONE}><NotificationsPage /></Allow>} />
          <Route path="/feedback" element={<Allow roles={EVERYONE}><FeedbackPage /></Allow>} />
          <Route path="/profile" element={<Allow roles={EVERYONE}><ProfilePage /></Allow>} />

          <Route
            path="/downloads"
            element={
              <Allow roles={DOWNLOADS}>
                <DownloadsPage />
              </Allow>
            }
          />
          <Route
            path="/parent/link"
            element={
              <Allow roles={['parent']}>
                <ParentLinkPage />
              </Allow>
            }
          />

          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route
            path="/admin"
            element={
              <Allow roles={ADMINS}>
                <Navigate to="/admin/schools" replace />
              </Allow>
            }
          />
          <Route path="/admin/schools" element={<Allow roles={ADMINS}><AdminSchoolsPage /></Allow>} />
          <Route path="/admin/users" element={<Allow roles={ADMINS}><AdminUsersPage /></Allow>} />
          <Route path="/admin/classes" element={<Allow roles={ADMINS}><AdminClassesPage /></Allow>} />
          <Route path="/admin/content" element={<Allow roles={ADMINS}><AdminContentPage /></Allow>} />
          <Route path="/admin/approvals" element={<Allow roles={ADMINS}><AdminApprovalsPage /></Allow>} />
          <Route path="/admin/scholarships" element={<Allow roles={ADMINS}><ScholarshipsPage /></Allow>} />
          <Route path="/admin/feedback" element={<Allow roles={ADMINS}><AdminFeedbackPage /></Allow>} />
          <Route path="/admin/settings" element={<Allow roles={ADMINS}><AdminSettingsPage /></Allow>} />
          <Route path="/admin/*" element={<Allow roles={ADMINS}><NotFoundPage /></Allow>} />
        </Route>

        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </>
  )
}
