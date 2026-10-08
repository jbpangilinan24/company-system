import { useEffect, useRef, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  Bell,
  Building2,
  Check,
  CheckSquare,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X,
} from 'lucide-react'

import type { User } from '../types/user'
import { API_URL } from '../config/api'

import UserManagement from './UserManagement'
import ClientManagement from './ClientManagement'
import ProjectManagement from './ProjectManagement'
import TaskManagement from './TaskManagement'

type DashboardProps = {
  user: User
  onLogout: () => void
}

type DashboardStats = {
  clients: number
  projects: number
  tasks: number
  files: number

  taskStats: {
    todo: number
    inProgress: number
    review: number
    completed: number
  }
}

type Notification = {
  id: number
  type: string
  title: string
  message: string | null
  isRead: boolean

  userId: number
  taskId: number | null
  projectId: number | null
  fileId: number | null

  createdAt: string
  readAt: string | null
}

type NavigationItem = {
  label: string
  path: string
  icon: React.ComponentType<{
    size?: number
    strokeWidth?: number
    className?: string
  }>
  adminOnly?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Clients',
    path: '/clients',
    icon: Building2,
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
  },
  {
    label: 'Tasks',
    path: '/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Users',
    path: '/users',
    icon: Users,
    adminOnly: true,
  },
]

function Dashboard({
  user,
  onLogout,
}: DashboardProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false)

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false)

  const [dashboardStats, setDashboardStats] =
    useState<DashboardStats | null>(null)

  const [dashboardLoading, setDashboardLoading] =
    useState(true)

  const [dashboardError, setDashboardError] =
    useState('')

  const [notifications, setNotifications] =
    useState<Notification[]>([])

  const [unreadCount, setUnreadCount] =
    useState(0)

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false)

  const [
    notificationsLoading,
    setNotificationsLoading,
  ] = useState(false)

  /*
  * Tracks an in-progress notification request.
  * A ref updates immediately, unlike state, so two
  * quick calls can't both start a request.
  */
  const notificationsRequestInProgress =
    useRef(false)


  // --------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------

  const loadNotifications = async () => {
    // Skip if a refresh is already in progress.
    if (notificationsRequestInProgress.current) {
      return
    }

    try {
      notificationsRequestInProgress.current = true

      setNotificationsLoading(true)

      /*
      * The dropdown shows unread notifications only.
      * The badge uses the server's count, which isn't
      * limited to the 50 notifications in the list.
      */
      const [
        notificationsResponse,
        countResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/notifications?unread=true`,
          {
            credentials: 'include',
          }
        ),

        fetch(
          `${API_URL}/api/notifications/unread-count`,
          {
            credentials: 'include',
          }
        ),
      ])

      const notificationsData =
        await notificationsResponse.json()

      const countData =
        await countResponse.json()

      if (!notificationsResponse.ok) {
        throw new Error(
          notificationsData.message ||
            'Unable to load notifications'
        )
      }

      if (!countResponse.ok) {
        throw new Error(
          countData.message ||
            'Unable to load unread notification count'
        )
      }

      setNotifications(
        notificationsData.notifications || []
      )

      setUnreadCount(countData.count ?? 0)
    } catch (error) {
      console.error(
        'LOAD NOTIFICATIONS ERROR:',
        error
      )
    } finally {
      notificationsRequestInProgress.current = false

      setNotificationsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [user.id])

  // --------------------------------------------------
  // LOAD DASHBOARD
  // --------------------------------------------------

  const loadDashboard = async () => {
    try {
      setDashboardLoading(true)
      setDashboardError('')

      const response = await fetch(
        `${API_URL}/api/dashboard`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to load dashboard'
        )
      }

      setDashboardStats(data)
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard'
      )
    } finally {
      setDashboardLoading(false)
    }
  }

  // Reload stats whenever we return to Dashboard.
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      loadDashboard()
    }
  }, [location.pathname])

  // Close mobile navigation after changing page.
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  const visibleNavigationItems =
    navigationItems.filter(
      (item) =>
        !item.adminOnly ||
        user.role === 'ADMIN'
    )

  const getPageTitle = () => {
    const currentItem =
      visibleNavigationItems.find(
        (item) =>
          item.path === location.pathname
      )

    return currentItem?.label || 'Dashboard'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
  }

  const getRelativeTime = (
    dateString: string
  ) => {
    const date = new Date(dateString)
    const now = new Date()

    const difference =
      now.getTime() - date.getTime()

    const seconds = Math.floor(
      difference / 1000
    )

    if (seconds < 60) {
      return 'Just now'
    }

    const minutes = Math.floor(
      seconds / 60
    )

    if (minutes < 60) {
      return `${minutes}m ago`
    }

    const hours = Math.floor(
      minutes / 60
    )

    if (hours < 24) {
      return `${hours}h ago`
    }

    const days = Math.floor(
      hours / 24
    )

    if (days < 7) {
      return `${days}d ago`
    }

    return date.toLocaleDateString()
  }

  const markNotificationRead = async (
    notification: Notification
  ) => {
    /*
    * Already-read notifications don't
    * need another API request.
    */
    if (notification.isRead) {
      return true
    }

    try {
      const response = await fetch(
        `${API_URL}/api/notifications/${notification.id}/read`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to update notification'
        )
      }

      // The dropdown shows unread only, so remove it.
      // It stays in the database as read.
      setNotifications(
        (currentNotifications) =>
          currentNotifications.filter(
            (currentNotification) =>
              currentNotification.id !==
              notification.id
          )
      )

      setUnreadCount((current) =>
        Math.max(0, current - 1)
      )

      return true
    } catch (error) {
      console.error(
        'MARK NOTIFICATION READ ERROR:',
        error
      )

      return false
    }
  }

  const handleNotificationClick =
    async (
      notification: Notification
    ) => {
      const success =
        await markNotificationRead(
          notification
        )

      if (!success) {
        return
      }

      setNotificationsOpen(false)

      /*
      * Task-related notifications
      */
      if (notification.taskId) {
        navigate(
          `/tasks?task=${notification.taskId}`
        )
        return
      }

      /*
      * Project-related notifications
      */
      if (notification.projectId) {
        navigate('/projects')
        return
      }

      /*
      * Notifications without a linked
      * record simply get marked as read.
      */
    }

  const markAllNotificationsRead =
    async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/notifications/read-all`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to update notifications'
        )
      }

      // All are read now, so the unread-only dropdown is empty.
      setNotifications([])

      setUnreadCount(0)
    } catch (error) {
      console.error(
        'MARK ALL NOTIFICATIONS READ ERROR:',
        error
      )
    }
  }

  // --------------------------------------------------
  // SIDEBAR
  // --------------------------------------------------

  const SidebarContent = ({
    mobile = false,
  }: {
    mobile?: boolean
  }) => (
    <div className="flex h-full flex-col">
      {/* BRAND */}

      <div
        className={`flex h-20 items-center border-b border-slate-800 ${
          sidebarCollapsed && !mobile
            ? 'justify-center px-3'
            : 'justify-between px-5'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-900">
            CS
          </div>

          {(!sidebarCollapsed || mobile) && (
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">
                Company System
              </p>

              <p className="text-xs text-slate-400">
                Internal Workspace
              </p>
            </div>
          )}
        </div>

        {mobile && (
          <button
            type="button"
            onClick={() =>
              setMobileSidebarOpen(false)
            }
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* NAVIGATION */}

      <div className="flex-1 overflow-y-auto px-3 py-5">
        {(!sidebarCollapsed || mobile) && (
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
        )}

        <nav className="space-y-1">
          {visibleNavigationItems.map(
            (item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={
                    sidebarCollapsed &&
                    !mobile
                      ? item.label
                      : undefined
                  }
                  className={({
                    isActive,
                  }) =>
                    `group flex items-center rounded-xl text-sm font-medium transition ${
                      sidebarCollapsed &&
                      !mobile
                        ? 'justify-center px-3 py-3'
                        : 'gap-3 px-3 py-3'
                    } ${
                      isActive
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={19}
                        strokeWidth={
                          isActive
                            ? 2.2
                            : 1.8
                        }
                        className="shrink-0"
                      />

                      {(!sidebarCollapsed ||
                        mobile) && (
                        <>
                          <span className="flex-1">
                            {item.label}
                          </span>

                          {isActive && (
                            <ChevronRight
                              size={16}
                              className="opacity-50"
                            />
                          )}
                        </>
                      )}
                    </>
                  )}
                </NavLink>
              )
            }
          )}
        </nav>
      </div>

      {/* USER */}

      <div className="border-t border-slate-800 p-3">
        <div
          className={`rounded-xl bg-slate-800/60 ${
            sidebarCollapsed && !mobile
              ? 'p-2'
              : 'p-3'
          }`}
        >
          <div
            className={`flex items-center ${
              sidebarCollapsed && !mobile
                ? 'justify-center'
                : 'gap-3'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {getInitials(user.name)}
            </div>

            {(!sidebarCollapsed ||
              mobile) && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user.name}
                </p>

                <p className="mt-0.5 text-xs capitalize text-slate-400">
                  {user.role.toLowerCase()}
                </p>
              </div>
            )}
          </div>

          {(!sidebarCollapsed || mobile) && (
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <LogOut size={17} />
              Log out
            </button>
          )}

          {sidebarCollapsed && !mobile && (
            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              aria-label="Log out"
              className="mt-2 flex w-full items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-white"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // --------------------------------------------------
  // DASHBOARD HOME
  // --------------------------------------------------

  const DashboardHome = () => (
    <>
      {/* WELCOME */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Welcome back, {user.name}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Here's an overview of your workspace.
        </p>

        {dashboardError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {dashboardError}
          </div>
        )}
      </div>

      {/* STAT CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NavLink
          to="/clients"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Clients
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {dashboardLoading
                  ? '...'
                  : dashboardStats?.clients ??
                    0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white">
              <Building2 size={20} />
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-400">
            View all clients →
          </p>
        </NavLink>

        <NavLink
          to="/projects"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Projects
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {dashboardLoading
                  ? '...'
                  : dashboardStats?.projects ??
                    0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white">
              <FolderKanban size={20} />
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-400">
            View all projects →
          </p>
        </NavLink>

        <NavLink
          to="/tasks"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Tasks
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {dashboardLoading
                  ? '...'
                  : dashboardStats?.tasks ??
                    0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white">
              <CheckSquare size={20} />
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-400">
            View all tasks →
          </p>
        </NavLink>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Files
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {dashboardLoading
                  ? '...'
                  : dashboardStats?.files ??
                    0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
              <FolderKanban size={20} />
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-slate-400">
            File management coming next
          </p>
        </div>
      </div>

      {/* TASK OVERVIEW */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Task Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current workload across all task statuses.
          </p>
        </div>

        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />

              <p className="text-sm font-medium text-slate-500">
                To Do
              </p>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {dashboardLoading
                ? '...'
                : dashboardStats?.taskStats
                    .todo ?? 0}
            </p>
          </div>

          <div className="bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />

              <p className="text-sm font-medium text-slate-500">
                In Progress
              </p>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {dashboardLoading
                ? '...'
                : dashboardStats?.taskStats
                    .inProgress ?? 0}
            </p>
          </div>

          <div className="bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />

              <p className="text-sm font-medium text-slate-500">
                Review
              </p>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {dashboardLoading
                ? '...'
                : dashboardStats?.taskStats
                    .review ?? 0}
            </p>
          </div>

          <div className="bg-white p-6">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              <p className="text-sm font-medium text-slate-500">
                Completed
              </p>
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">
              {dashboardLoading
                ? '...'
                : dashboardStats?.taskStats
                    .completed ?? 0}
            </p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* DESKTOP SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden bg-slate-950 transition-all duration-300 lg:block ${
          sidebarCollapsed
            ? 'w-20'
            : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* MOBILE OVERLAY */}

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setMobileSidebarOpen(false)
          }
          aria-hidden="true"
        />
      )}

      {/* MOBILE SIDEBAR */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 transition-transform duration-300 lg:hidden ${
          mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <SidebarContent mobile />
      </aside>

      {/* MAIN AREA */}

      <div
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed
            ? 'lg:pl-20'
            : 'lg:pl-64'
        }`}
      >
        {/* TOP BAR */}

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* MOBILE MENU */}

              <button
                type="button"
                onClick={() =>
                  setMobileSidebarOpen(true)
                }
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>

              {/* DESKTOP COLLAPSE */}

              <button
                type="button"
                onClick={() =>
                  setSidebarCollapsed(
                    (current) =>
                      !current
                  )
                }
                className="hidden rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 lg:flex"
                aria-label={
                  sidebarCollapsed
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
                }
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen
                    size={19}
                  />
                ) : (
                  <PanelLeftClose
                    size={19}
                  />
                )}
              </button>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Workspace
                </p>

                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {getPageTitle()}
                </h2>
              </div>
            </div>

            {/* TOP ACTIONS */}
            <div className="flex items-center gap-3">

              {/* NOTIFICATIONS */}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    // Refresh only when opening, not closing.
                    if (!notificationsOpen) {
                      loadNotifications()
                    }

                    setNotificationsOpen(
                      (current) => !current
                    )
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Notifications"
                  aria-expanded={
                    notificationsOpen
                  }
                >
                  <Bell size={19} />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                      {unreadCount > 99
                        ? '99+'
                        : unreadCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATION PANEL */}

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">

                    {/* HEADER */}

                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Notifications
                        </h3>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} unread`
                            : 'You’re all caught up'}
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={
                            markAllNotificationsRead
                          }
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Check size={14} />
                          Mark all read
                        </button>
                      )}
                    </div>

                    {/* CONTENT */}

                    <div className="max-h-[420px] overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="px-5 py-10 text-center text-sm text-slate-500">
                          Loading notifications...
                        </div>
                      ) : notifications.length ===
                        0 ? (
                        <div className="px-5 py-10 text-center">
                          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                            <Bell size={20} />
                          </div>

                          <p className="mt-3 text-sm font-medium text-slate-900">
                            No notifications
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            You're all caught up.
                          </p>
                        </div>
                      ) : (
                        notifications.map(
                          (notification) => (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              onClick={() =>
                                handleNotificationClick(
                                  notification
                                )
                              }
                              className={`relative flex w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition last:border-b-0 hover:bg-slate-50 ${
                                !notification.isRead
                                  ? 'bg-blue-50/50'
                                  : 'bg-white'
                              }`}
                            >
                              <div className="pt-1.5">
                                <span
                                  className={`block h-2 w-2 rounded-full ${
                                    !notification.isRead
                                      ? 'bg-blue-500'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p
                                    className={`text-sm ${
                                      !notification.isRead
                                        ? 'font-semibold text-slate-900'
                                        : 'font-medium text-slate-700'
                                    }`}
                                  >
                                    {
                                      notification.title
                                    }
                                  </p>

                                  <span className="shrink-0 text-[11px] text-slate-400">
                                    {getRelativeTime(
                                      notification.createdAt
                                    )}
                                  </span>
                                </div>

                                {notification.message && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500">
                                    {
                                      notification.message
                                    }
                                  </p>
                                )}
                              </div>
                            </button>
                          )
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* USER */}

              <div className="hidden text-right sm:block">
                <p className="max-w-40 truncate text-sm font-medium text-slate-900">
                  {user.name}
                </p>

                <p className="text-xs capitalize text-slate-500">
                  {user.role.toLowerCase()}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {getInitials(user.name)}
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1600px]">
            <Routes>
              {/* DASHBOARD */}

              <Route
                path="/dashboard"
                element={
                  <DashboardHome />
                }
              />

              {/* CLIENTS */}

              <Route
                path="/clients"
                element={
                  <ClientManagement />
                }
              />

              {/* PROJECTS */}

              <Route
                path="/projects"
                element={
                  <ProjectManagement />
                }
              />

              {/* TASKS */}

              <Route
                path="/tasks"
                element={
                  <TaskManagement
                    user={user}
                  />
                }
              />

              {/* USERS */}

              <Route
                path="/users"
                element={
                  user.role ===
                  'ADMIN' ? (
                    <UserManagement />
                  ) : (
                    <Navigate
                      to="/dashboard"
                      replace
                    />
                  )
                }
              />

              {/* ROOT */}

              <Route
                path="/"
                element={
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                }
              />

              {/* UNKNOWN URL */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                }
              />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard