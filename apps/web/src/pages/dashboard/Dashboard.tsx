import { useApp } from '../../lib/store'
import { StudentDashboard } from './Student'
import { TeacherDashboard } from './Teacher'
import { ParentDashboard } from './Parent'
import { AdminDashboard } from './Admin'

export function Dashboard() {
  const { currentUser } = useApp()
  if (!currentUser) return null
  if (currentUser.role === 'teacher') return <TeacherDashboard />
  if (currentUser.role === 'parent') return <ParentDashboard />
  if (currentUser.role === 'admin') return <AdminDashboard />
  return <StudentDashboard />
}
