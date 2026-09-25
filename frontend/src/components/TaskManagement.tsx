import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Clock3,
  EllipsisVertical,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react'

import {
  useSearchParams,
} from 'react-router-dom'

import { API_URL } from '../config/api'
import type { User } from '../types/user'

import Alert from './ui/Alert'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import PageHeader from './ui/PageHeader'

type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'COMPLETED'

type TaskPriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT'

type Project = {
  id: number
  name: string
  client: {
    id: number
    name: string
    company?: string | null
  }
}

type AssignableUser = {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'MEMBER'
}

type Task = {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  projectId: number
  assignedToId: number | null

  project: {
    id: number
    name: string

    client: {
      id: number
      name: string
      company?: string | null
    }
  }

  assignedTo: AssignableUser | null

  createdAt?: string
  updatedAt?: string
}

type TaskForm = {
  title: string
  projectId: string
  assignedToId: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string
  description: string
}

type TaskManagementProps = {
  user: User
}

const emptyForm: TaskForm = {
  title: '',
  projectId: '',
  assignedToId: '',
  status: 'TODO',
  priority: 'NORMAL',
  dueDate: '',
  description: '',
}

const taskStatuses: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
]

const taskPriorities: TaskPriority[] = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
]

function TaskManagement({
  user,
}: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<AssignableUser[]>([])

  const [loading, setLoading] = useState(true)

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [myTasksOnly, setMyTasksOnly] = useState(false)

  // --------------------------------------------------
  // ADD / EDIT MODAL
  // --------------------------------------------------

  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] =
    useState<Task | null>(null)

  const [form, setForm] =
    useState<TaskForm>(emptyForm)

  const [saving, setSaving] = useState(false)
  const [formMessage, setFormMessage] = useState('')

  // --------------------------------------------------
  // PAGE MESSAGE
  // --------------------------------------------------

  const [pageMessage, setPageMessage] = useState('')

  const [pageMessageType, setPageMessageType] =
    useState<'success' | 'error'>('success')

  // --------------------------------------------------
  // DROPDOWNS
  // --------------------------------------------------

  const [openActionId, setOpenActionId] =
    useState<number | null>(null)

  const [openStatusId, setOpenStatusId] =
    useState<number | null>(null)

  const [openPriorityId, setOpenPriorityId] =
    useState<number | null>(null)

  const [updatingTaskId, setUpdatingTaskId] =
    useState<number | null>(null)

  // --------------------------------------------------
  // TASK DETAILS
  // --------------------------------------------------

  const [selectedTask, setSelectedTask] =
    useState<Task | null>(null)

  const [searchParams, setSearchParams] =
    useSearchParams()

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadData = async () => {
    try {
      setLoading(true)
      setPageMessage('')

      const [
        tasksResponse,
        projectsResponse,
        usersResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/api/tasks`, {
          credentials: 'include',
        }),

        fetch(`${API_URL}/api/projects`, {
          credentials: 'include',
        }),

        fetch(`${API_URL}/api/users/assignable`, {
          credentials: 'include',
        }),
      ])

      const tasksData = await tasksResponse.json()
      const projectsData =
        await projectsResponse.json()
      const usersData = await usersResponse.json()

      if (!tasksResponse.ok) {
        throw new Error(
          tasksData.message ||
            'Unable to load tasks'
        )
      }

      if (!projectsResponse.ok) {
        throw new Error(
          projectsData.message ||
            'Unable to load projects'
        )
      }

      if (!usersResponse.ok) {
        throw new Error(
          usersData.message ||
            'Unable to load users'
        )
      }

      setTasks(tasksData.tasks)
      setProjects(projectsData.projects)
      setUsers(usersData.users)
    } catch (error) {
      setPageMessageType('error')

      setPageMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load tasks'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --------------------------------------------------
  // OPEN TASK FROM URL
  // --------------------------------------------------

  useEffect(() => {
    const taskParam =
      searchParams.get('task')

    if (!taskParam) {
      setSelectedTask(null)
      return
    }

    const taskId = Number(taskParam)

    if (
      !Number.isInteger(taskId) ||
      taskId <= 0
    ) {
      setSelectedTask(null)
      return
    }

    const task = tasks.find(
      (currentTask) =>
        currentTask.id === taskId
    )

    if (task) {
      setSelectedTask(task)
    }
  }, [tasks, searchParams])

  // --------------------------------------------------
  // FILTER TASKS
  // --------------------------------------------------

  const filteredTasks = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase()

    return tasks.filter((task) => {
      const matchesSearch =
        !searchValue ||
        task.title
          .toLowerCase()
          .includes(searchValue) ||
        task.project.name
          .toLowerCase()
          .includes(searchValue) ||
        task.project.client.name
          .toLowerCase()
          .includes(searchValue) ||
        task.assignedTo?.name
          .toLowerCase()
          .includes(searchValue) ||
        task.description
          ?.toLowerCase()
          .includes(searchValue)

      const matchesProject =
        !projectFilter ||
        String(task.project.id) ===
          projectFilter

      const matchesUser =
        !userFilter ||
        String(task.assignedTo?.id) ===
          userFilter

      const matchesStatus =
        !statusFilter ||
        task.status === statusFilter

      const matchesPriority =
        !priorityFilter ||
        task.priority === priorityFilter

      const matchesMyTasks =
        !myTasksOnly ||
        task.assignedTo?.id === user.id

      return (
        matchesSearch &&
        matchesProject &&
        matchesUser &&
        matchesStatus &&
        matchesPriority &&
        matchesMyTasks
      )
    })
  }, [
    tasks,
    search,
    projectFilter,
    userFilter,
    statusFilter,
    priorityFilter,
    myTasksOnly,
    user.id,
  ])

  // --------------------------------------------------
  // CLOSE DROPDOWNS
  // --------------------------------------------------

  const closeAllDropdowns = () => {
    setOpenActionId(null)
    setOpenStatusId(null)
    setOpenPriorityId(null)
  }

  // --------------------------------------------------
  // TASK DETAILS
  // --------------------------------------------------

  const openTaskDetails = (
    task: Task
  ) => {
    closeAllDropdowns()

    setSelectedTask(task)

    const nextParams =
      new URLSearchParams(searchParams)

    nextParams.set(
      'task',
      String(task.id)
    )

    setSearchParams(nextParams)
  }

  const closeTaskDetails = () => {
    setSelectedTask(null)

    const nextParams =
      new URLSearchParams(searchParams)

    nextParams.delete('task')

    setSearchParams(
      nextParams,
      {
        replace: true,
      }
    )
  }

  // --------------------------------------------------
  // OPEN ADD MODAL
  // --------------------------------------------------

  const openAddModal = () => {
    setEditingTask(null)
    setForm(emptyForm)
    setFormMessage('')
    setModalOpen(true)

    closeAllDropdowns()
  }

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------

  const openEditModal = (
    task: Task
  ) => {
    setEditingTask(task)

    setForm({
      title: task.title,

      projectId:
        String(task.projectId),

      assignedToId:
        task.assignedToId
          ? String(
              task.assignedToId
            )
          : '',

      status: task.status,

      priority: task.priority,

      dueDate:
        task.dueDate
          ? task.dueDate.slice(
              0,
              10
            )
          : '',

      description:
        task.description || '',
    })

    setFormMessage('')
    closeAllDropdowns()
    setModalOpen(true)
  }

  // --------------------------------------------------
  // EDIT FROM DETAILS
  // --------------------------------------------------

  const editSelectedTask = () => {
    if (!selectedTask) {
      return
    }

    const task = selectedTask

    closeTaskDetails()
    openEditModal(task)
  }

  // --------------------------------------------------
  // CLOSE MODAL
  // --------------------------------------------------

  const closeModal = () => {
    if (saving) {
      return
    }

    setModalOpen(false)
    setEditingTask(null)
    setForm(emptyForm)
    setFormMessage('')
  }

  // --------------------------------------------------
  // SAVE TASK
  // --------------------------------------------------

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setFormMessage('')

    if (!form.title.trim()) {
      setFormMessage(
        'Task title is required.'
      )
      return
    }

    if (!form.projectId) {
      setFormMessage(
        'Please select a project.'
      )
      return
    }

    try {
      setSaving(true)

      const isEditing =
        editingTask !== null

      const url = isEditing
        ? `${API_URL}/api/tasks/${editingTask.id}`
        : `${API_URL}/api/tasks`

      const response = await fetch(
        url,
        {
          method:
            isEditing
              ? 'PATCH'
              : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            title:
              form.title.trim(),

            projectId:
              Number(
                form.projectId
              ),

            assignedToId:
              form.assignedToId
                ? Number(
                    form.assignedToId
                  )
                : null,

            status: form.status,

            priority:
              form.priority,

            dueDate:
              form.dueDate ||
              null,

            description:
              form.description.trim(),
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        setFormMessage(
          data.message ||
            `Unable to ${
              isEditing
                ? 'update'
                : 'create'
            } task`
        )

        return
      }

      setModalOpen(false)
      setEditingTask(null)
      setForm(emptyForm)

      setPageMessageType(
        'success'
      )

      setPageMessage(
        isEditing
          ? 'Task updated successfully'
          : 'Task created successfully'
      )

      await loadData()
    } catch {
      setFormMessage(
        'Unable to connect to the server'
      )
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------------------------
  // INLINE STATUS / PRIORITY UPDATE
  // --------------------------------------------------

  const updateTaskField = async (
    task: Task,
    updates: {
      status?: TaskStatus
      priority?: TaskPriority
    }
  ) => {
    try {
      setUpdatingTaskId(task.id)
      setPageMessage('')

      const response =
        await fetch(
          `${API_URL}/api/tasks/${task.id}`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            credentials:
              'include',

            body: JSON.stringify(
              updates
            ),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        setPageMessageType(
          'error'
        )

        setPageMessage(
          data.message ||
            'Unable to update task'
        )

        return
      }

      setTasks(
        (currentTasks) =>
          currentTasks.map(
            (currentTask) =>
              currentTask.id ===
              task.id
                ? data.task
                : currentTask
          )
      )

      if (
        selectedTask?.id ===
        task.id
      ) {
        setSelectedTask(
          data.task
        )
      }

      setPageMessageType(
        'success'
      )

      setPageMessage(
        updates.status
          ? 'Task status updated successfully'
          : 'Task priority updated successfully'
      )
    } catch {
      setPageMessageType(
        'error'
      )

      setPageMessage(
        'Unable to connect to the server'
      )
    } finally {
      setUpdatingTaskId(null)
      closeAllDropdowns()
    }
  }

  // --------------------------------------------------
  // STATUS HELPERS
  // --------------------------------------------------

  const getStatusLabel = (
    status: TaskStatus
  ) => {
    switch (status) {
      case 'TODO':
        return 'To Do'

      case 'IN_PROGRESS':
        return 'In Progress'

      case 'REVIEW':
        return 'Review'

      case 'COMPLETED':
        return 'Completed'
    }
  }

  const getStatusVariant = (
    status: TaskStatus
  ):
    | 'default'
    | 'info'
    | 'warning'
    | 'success' => {
    switch (status) {
      case 'TODO':
        return 'default'

      case 'IN_PROGRESS':
        return 'info'

      case 'REVIEW':
        return 'warning'

      case 'COMPLETED':
        return 'success'
    }
  }

  // --------------------------------------------------
  // PRIORITY HELPERS
  // --------------------------------------------------

  const getPriorityLabel = (
    priority: TaskPriority
  ) => {
    switch (priority) {
      case 'LOW':
        return 'Low'

      case 'NORMAL':
        return 'Normal'

      case 'HIGH':
        return 'High'

      case 'URGENT':
        return 'Urgent'
    }
  }

  const getPriorityVariant = (
    priority: TaskPriority
  ):
    | 'default'
    | 'info'
    | 'warning'
    | 'danger' => {
    switch (priority) {
      case 'LOW':
        return 'default'

      case 'NORMAL':
        return 'info'

      case 'HIGH':
        return 'warning'

      case 'URGENT':
        return 'danger'
    }
  }

  // --------------------------------------------------
  // DATE
  // --------------------------------------------------

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return 'No due date'
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }
    ).format(
      new Date(value)
    )
  }

  const formatDateTime = (
    value?: string
  ) => {
    if (!value) {
      return ''
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    ).format(
      new Date(value)
    )
  }

  const isOverdue = (
    task: Task
  ) => {
    if (
      !task.dueDate ||
      task.status ===
        'COMPLETED'
    ) {
      return false
    }

    const dueDate =
      new Date(task.dueDate)

    dueDate.setUTCHours(
      23,
      59,
      59,
      999
    )

    return (
      dueDate.getTime() <
      Date.now()
    )
  }

  // --------------------------------------------------
  // INITIALS
  // --------------------------------------------------

  const getInitials = (
    name: string
  ) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) =>
          part[0]
      )
      .join('')
      .toUpperCase()
  }

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  const clearFilters = () => {
    setSearch('')
    setProjectFilter('')
    setUserFilter('')
    setStatusFilter('')
    setPriorityFilter('')
    setMyTasksOnly(false)
  }

  const filtersActive =
    search ||
    projectFilter ||
    userFilter ||
    statusFilter ||
    priorityFilter ||
    myTasksOnly

  return (
    <>
      {/* PAGE HEADER */}

      <PageHeader
        title="Tasks"
        description="Manage work, assignments, priorities and task progress."
        actions={
          <Button
            type="button"
            onClick={
              openAddModal
            }
          >
            <Plus size={17} />
            Add Task
          </Button>
        }
      />

      {/* PAGE MESSAGE */}

      {pageMessage && (
        <div className="mb-5">
          <Alert
            type={
              pageMessageType
            }
            message={
              pageMessage
            }
          />
        </div>
      )}

      {/* TASK PANEL */}

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* SEARCH + MY TASKS */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">

          <div className="relative w-full xl:max-w-md">

            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

          </div>

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setMyTasksOnly(
                  (current) =>
                    !current
                )
              }
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                myTasksOnly
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UserRound
                size={16}
              />

              My Tasks
            </button>

            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={
                  clearFilters
                }
              >
                Clear
              </Button>
            )}

          </div>

        </div>

        {/* FILTERS */}

        <div className="flex flex-wrap gap-3 border-b border-slate-200 bg-slate-50/50 px-5 py-4">

          <select
            value={
              projectFilter
            }
            onChange={(
              event
            ) =>
              setProjectFilter(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">
              All projects
            </option>

            {projects.map(
              (project) => (
                <option
                  key={
                    project.id
                  }
                  value={
                    project.id
                  }
                >
                  {
                    project.name
                  }
                </option>
              )
            )}
          </select>

          <select
            value={userFilter}
            onChange={(
              event
            ) =>
              setUserFilter(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">
              All assignees
            </option>

            {users.map(
              (
                assignableUser
              ) => (
                <option
                  key={
                    assignableUser.id
                  }
                  value={
                    assignableUser.id
                  }
                >
                  {
                    assignableUser.name
                  }
                </option>
              )
            )}
          </select>

          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">
              All statuses
            </option>

            <option value="TODO">
              To Do
            </option>

            <option value="IN_PROGRESS">
              In Progress
            </option>

            <option value="REVIEW">
              Review
            </option>

            <option value="COMPLETED">
              Completed
            </option>
          </select>

          <select
            value={
              priorityFilter
            }
            onChange={(
              event
            ) =>
              setPriorityFilter(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="">
              All priorities
            </option>

            <option value="LOW">
              Low
            </option>

            <option value="NORMAL">
              Normal
            </option>

            <option value="HIGH">
              High
            </option>

            <option value="URGENT">
              Urgent
            </option>
          </select>

        </div>

        {/* RESULT COUNT */}

        <div className="border-b border-slate-100 px-5 py-3">

          <p className="text-xs font-medium text-slate-500">
            {
              filteredTasks.length
            }{' '}
            {filteredTasks.length ===
            1
              ? 'task'
              : 'tasks'}

            {myTasksOnly &&
              ' assigned to you'}
          </p>

        </div>

        {/* CONTENT */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-r-slate-900" />

              <p className="mt-3 text-sm text-slate-500">
                Loading tasks...
              </p>

            </div>

          </div>
        ) : filteredTasks.length ===
          0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <CheckSquare
                size={22}
              />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {tasks.length ===
              0
                ? 'No tasks yet'
                : 'No tasks found'}
            </h3>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {tasks.length ===
              0
                ? projects.length ===
                  0
                  ? 'Create a project first, then add tasks to it.'
                  : 'Create your first task and assign it to a project or team member.'
                : 'Try changing your search or filters.'}
            </p>

            {tasks.length ===
              0 &&
              projects.length >
                0 && (
                <Button
                  type="button"
                  className="mt-5"
                  onClick={
                    openAddModal
                  }
                >
                  <Plus
                    size={17}
                  />
                  Add Task
                </Button>
              )}

          </div>
        ) : (
          <div className="overflow-visible max-xl:overflow-x-auto">

            <table className="w-full min-w-[1100px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/70">

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Task
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assigned To
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Priority
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due
                  </th>

                  <th className="w-20 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredTasks.map(
                  (task) => (
                    <tr
                      key={
                        task.id
                      }
                      className="transition hover:bg-slate-50/70"
                    >

                      {/* TASK */}

                      <td className="px-5 py-4">

                        <div className="flex items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <CheckSquare
                              size={
                                18
                              }
                            />
                          </div>

                          <div className="min-w-0">

                            <button
                              type="button"
                              onClick={() =>
                                openTaskDetails(
                                  task
                                )
                              }
                              className="block max-w-full text-left font-medium text-slate-900 transition hover:text-blue-600 hover:underline"
                            >
                              {
                                task.title
                              }
                            </button>

                            {task.description && (
                              <p className="mt-1 max-w-xs truncate text-sm text-slate-500">
                                {
                                  task.description
                                }
                              </p>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* PROJECT */}

                      <td className="px-5 py-4">

                        <p className="text-sm font-medium text-slate-700">
                          {
                            task
                              .project
                              .name
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            task
                              .project
                              .client
                              .name
                          }
                        </p>

                      </td>

                      {/* ASSIGNEE */}

                      <td className="px-5 py-4">

                        {task.assignedTo ? (
                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                              {getInitials(
                                task
                                  .assignedTo
                                  .name
                              )}
                            </div>

                            <div>

                              <p className="text-sm font-medium text-slate-700">
                                {
                                  task
                                    .assignedTo
                                    .name
                                }
                              </p>

                              <p className="text-xs capitalize text-slate-400">
                                {task.assignedTo.role.toLowerCase()}
                              </p>

                            </div>

                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Unassigned
                          </span>
                        )}

                      </td>

                      {/* STATUS */}

                      <td className="relative px-5 py-4">

                        <button
                          type="button"
                          disabled={
                            updatingTaskId ===
                            task.id
                          }
                          onClick={() => {
                            setOpenStatusId(
                              openStatusId ===
                                task.id
                                ? null
                                : task.id
                            )

                            setOpenPriorityId(
                              null
                            )

                            setOpenActionId(
                              null
                            )
                          }}
                          className="inline-flex rounded-full transition hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                          aria-label={`Change status for ${task.title}`}
                        >

                          <Badge
                            variant={getStatusVariant(
                              task.status
                            )}
                          >

                            <span className="inline-flex items-center gap-1">

                              {updatingTaskId ===
                              task.id
                                ? 'Updating...'
                                : getStatusLabel(
                                    task.status
                                  )}

                              {updatingTaskId !==
                                task.id && (
                                <ChevronDown
                                  size={
                                    12
                                  }
                                />
                              )}

                            </span>

                          </Badge>

                        </button>

                        {openStatusId ===
                          task.id && (
                          <div className="absolute left-5 top-[calc(100%-8px)] z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                            {taskStatuses.map(
                              (
                                status
                              ) => (
                                <button
                                  key={
                                    status
                                  }
                                  type="button"
                                  disabled={
                                    updatingTaskId ===
                                    task.id
                                  }
                                  onClick={() => {
                                    if (
                                      status ===
                                      task.status
                                    ) {
                                      setOpenStatusId(
                                        null
                                      )

                                      return
                                    }

                                    updateTaskField(
                                      task,
                                      {
                                        status,
                                      }
                                    )
                                  }}
                                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                                    status ===
                                    task.status
                                      ? 'font-medium text-slate-900'
                                      : 'text-slate-600'
                                  }`}
                                >

                                  <span>
                                    {getStatusLabel(
                                      status
                                    )}
                                  </span>

                                  {status ===
                                    task.status && (
                                    <span className="text-xs text-slate-400">
                                      ✓
                                    </span>
                                  )}

                                </button>
                              )
                            )}

                          </div>
                        )}

                      </td>

                      {/* PRIORITY */}

                      <td className="relative px-5 py-4">

                        <button
                          type="button"
                          disabled={
                            updatingTaskId ===
                            task.id
                          }
                          onClick={() => {
                            setOpenPriorityId(
                              openPriorityId ===
                                task.id
                                ? null
                                : task.id
                            )

                            setOpenStatusId(
                              null
                            )

                            setOpenActionId(
                              null
                            )
                          }}
                          className="inline-flex rounded-full transition hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                          aria-label={`Change priority for ${task.title}`}
                        >

                          <Badge
                            variant={getPriorityVariant(
                              task.priority
                            )}
                          >

                            <span className="inline-flex items-center gap-1">

                              {updatingTaskId ===
                              task.id
                                ? 'Updating...'
                                : getPriorityLabel(
                                    task.priority
                                  )}

                              {updatingTaskId !==
                                task.id && (
                                <ChevronDown
                                  size={
                                    12
                                  }
                                />
                              )}

                            </span>

                          </Badge>

                        </button>

                        {openPriorityId ===
                          task.id && (
                          <div className="absolute bottom-12 left-5 z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                            {taskPriorities.map(
                              (
                                priority
                              ) => (
                                <button
                                  key={
                                    priority
                                  }
                                  type="button"
                                  disabled={
                                    updatingTaskId ===
                                    task.id
                                  }
                                  onClick={() => {
                                    if (
                                      priority ===
                                      task.priority
                                    ) {
                                      setOpenPriorityId(
                                        null
                                      )

                                      return
                                    }

                                    updateTaskField(
                                      task,
                                      {
                                        priority,
                                      }
                                    )
                                  }}
                                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                                    priority ===
                                    task.priority
                                      ? 'font-medium text-slate-900'
                                      : 'text-slate-600'
                                  }`}
                                >

                                  <span>
                                    {getPriorityLabel(
                                      priority
                                    )}
                                  </span>

                                  {priority ===
                                    task.priority && (
                                    <span className="text-xs text-slate-400">
                                      ✓
                                    </span>
                                  )}

                                </button>
                              )
                            )}

                          </div>
                        )}

                      </td>

                      {/* DUE DATE */}

                      <td className="px-5 py-4">

                        <div
                          className={`flex items-center gap-2 text-sm ${
                            isOverdue(
                              task
                            )
                              ? 'font-medium text-red-600'
                              : 'text-slate-600'
                          }`}
                        >
                          <CalendarDays
                            size={15}
                            className="shrink-0"
                          />

                          <span>
                            {formatDate(
                              task.dueDate
                            )}
                          </span>
                        </div>

                        {isOverdue(
                          task
                        ) && (
                          <p className="mt-1 text-xs font-medium text-red-500">
                            Overdue
                          </p>
                        )}

                      </td>

                      {/* ACTIONS */}

                      <td className="relative px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionId(
                              openActionId ===
                                task.id
                                ? null
                                : task.id
                            )

                            setOpenStatusId(
                              null
                            )

                            setOpenPriorityId(
                              null
                            )
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Actions for ${task.title}`}
                        >
                          <EllipsisVertical
                            size={18}
                          />
                        </button>

                        {openActionId ===
                          task.id && (
                          <div className="absolute bottom-12 right-5 z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                            <button
                              type="button"
                              onClick={() =>
                                openTaskDetails(
                                  task
                                )
                              }
                              className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              View details
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  task
                                )
                              }
                              className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit task
                            </button>

                          </div>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* --------------------------------------------------
          ADD / EDIT TASK MODAL
      -------------------------------------------------- */}

      <Modal
        open={modalOpen}
        title={
          editingTask
            ? 'Edit Task'
            : 'Add Task'
        }
        description={
          editingTask
            ? 'Update task details, assignment and progress.'
            : 'Create a task and assign it to a project or team member.'
        }
        onClose={closeModal}
        size="lg"
      >

        <form
          onSubmit={
            handleSubmit
          }
        >

          {formMessage && (
            <div className="mb-5">
              <Alert
                type="error"
                message={
                  formMessage
                }
              />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">

            {/* TITLE */}

            <div className="sm:col-span-2">

              <label
                htmlFor="task-title"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Task title

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="task-title"
                type="text"
                value={
                  form.title
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    title:
                      event
                        .target
                        .value,
                  })
                }
                placeholder="What needs to be done?"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* PROJECT */}

            <div>

              <label
                htmlFor="task-project"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Project

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="task-project"
                value={
                  form.projectId
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    projectId:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="">
                  Select project
                </option>

                {projects.map(
                  (project) => (
                    <option
                      key={
                        project.id
                      }
                      value={
                        project.id
                      }
                    >
                      {
                        project.name
                      }
                      {' — '}
                      {
                        project
                          .client
                          .name
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* ASSIGNEE */}

            <div>

              <label
                htmlFor="task-assignee"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Assigned to
              </label>

              <select
                id="task-assignee"
                value={
                  form.assignedToId
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    assignedToId:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="">
                  Unassigned
                </option>

                {users.map(
                  (
                    assignableUser
                  ) => (
                    <option
                      key={
                        assignableUser.id
                      }
                      value={
                        assignableUser.id
                      }
                    >
                      {
                        assignableUser.name
                      }
                      {' — '}
                      {
                        assignableUser.role
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            {/* STATUS */}

            <div>

              <label
                htmlFor="task-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="task-status"
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    status:
                      event
                        .target
                        .value as TaskStatus,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="TODO">
                  To Do
                </option>

                <option value="IN_PROGRESS">
                  In Progress
                </option>

                <option value="REVIEW">
                  Review
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

              </select>

            </div>

            {/* PRIORITY */}

            <div>

              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Priority
              </label>

              <select
                id="task-priority"
                value={
                  form.priority
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    priority:
                      event
                        .target
                        .value as TaskPriority,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="LOW">
                  Low
                </option>

                <option value="NORMAL">
                  Normal
                </option>

                <option value="HIGH">
                  High
                </option>

                <option value="URGENT">
                  Urgent
                </option>

              </select>

            </div>

            {/* DUE DATE */}

            <div className="sm:col-span-2">

              <label
                htmlFor="task-due-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Due date
              </label>

              <input
                id="task-due-date"
                type="date"
                value={
                  form.dueDate
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    dueDate:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* DESCRIPTION */}

            <div className="sm:col-span-2">

              <label
                htmlFor="task-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="task-description"
                value={
                  form.description
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,
                    description:
                      event
                        .target
                        .value,
                  })
                }
                rows={5}
                placeholder="Add task details or instructions..."
                className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

          </div>

          {/* MODAL ACTIONS */}

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">

            <Button
              type="button"
              variant="secondary"
              onClick={
                closeModal
              }
              disabled={
                saving
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={
                saving
              }
            >
              {saving
                ? editingTask
                  ? 'Saving...'
                  : 'Creating...'
                : editingTask
                  ? 'Save Changes'
                  : 'Add Task'}
            </Button>

          </div>

        </form>

      </Modal>

      {/* --------------------------------------------------
          TASK DETAILS DRAWER
      -------------------------------------------------- */}

      {selectedTask && (
        <div className="fixed inset-0 z-[100]">

          {/* BACKDROP */}

          <button
            type="button"
            aria-label="Close task details"
            onClick={
              closeTaskDetails
            }
            className="absolute inset-0 bg-slate-950/30"
          />

          {/* DRAWER */}

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">

              <div className="min-w-0">

                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                  <FolderKanban
                    size={14}
                  />

                  <span>
                    {
                      selectedTask
                        .project
                        .name
                    }
                  </span>

                  <span>•</span>

                  <span>
                    {
                      selectedTask
                        .project
                        .client
                        .name
                    }
                  </span>

                </div>

                <h2 className="break-words text-xl font-semibold text-slate-950">
                  {
                    selectedTask.title
                  }
                </h2>

              </div>

              <div className="flex shrink-0 items-center gap-2">

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={
                    editSelectedTask
                  }
                >
                  <Pencil
                    size={15}
                  />
                  Edit
                </Button>

                <button
                  type="button"
                  onClick={
                    closeTaskDetails
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close task details"
                >
                  <X
                    size={19}
                  />
                </button>

              </div>

            </div>

            {/* SCROLLABLE CONTENT */}

            <div className="flex-1 overflow-y-auto">

              <div className="p-6">

                {/* PROPERTIES */}

                <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:grid-cols-2">

                  {/* STATUS */}

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Status
                    </p>

                    <div className="mt-2">
                      <Badge
                        variant={getStatusVariant(
                          selectedTask.status
                        )}
                      >
                        {getStatusLabel(
                          selectedTask.status
                        )}
                      </Badge>
                    </div>

                  </div>

                  {/* PRIORITY */}

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Priority
                    </p>

                    <div className="mt-2">
                      <Badge
                        variant={getPriorityVariant(
                          selectedTask.priority
                        )}
                      >
                        {getPriorityLabel(
                          selectedTask.priority
                        )}
                      </Badge>
                    </div>

                  </div>

                  {/* ASSIGNEE */}

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Assigned to
                    </p>

                    <div className="mt-2">

                      {selectedTask.assignedTo ? (
                        <div className="flex items-center gap-2">

                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            {getInitials(
                              selectedTask
                                .assignedTo
                                .name
                            )}
                          </div>

                          <div>

                            <p className="text-sm font-medium text-slate-800">
                              {
                                selectedTask
                                  .assignedTo
                                  .name
                              }
                            </p>

                            <p className="text-xs capitalize text-slate-400">
                              {selectedTask.assignedTo.role.toLowerCase()}
                            </p>

                          </div>

                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          Unassigned
                        </p>
                      )}

                    </div>

                  </div>

                  {/* DUE DATE */}

                  <div>

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Due date
                    </p>

                    <div
                      className={`mt-2 flex items-center gap-2 text-sm ${
                        isOverdue(
                          selectedTask
                        )
                          ? 'font-medium text-red-600'
                          : 'text-slate-700'
                      }`}
                    >
                      <CalendarDays
                        size={16}
                      />

                      <span>
                        {formatDate(
                          selectedTask.dueDate
                        )}
                      </span>
                    </div>

                    {isOverdue(
                      selectedTask
                    ) && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        Overdue
                      </p>
                    )}

                  </div>

                </div>

                {/* DESCRIPTION */}

                <section className="mt-7">

                  <h3 className="text-sm font-semibold text-slate-900">
                    Description
                  </h3>

                  {selectedTask.description ? (
                    <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                      {
                        selectedTask.description
                      }
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
                      No description added.
                    </div>
                  )}

                </section>

                {/* PROJECT */}

                <section className="mt-8 border-t border-slate-100 pt-6">

                  <h3 className="text-sm font-semibold text-slate-900">
                    Project
                  </h3>

                  <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 p-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FolderKanban
                        size={18}
                      />
                    </div>

                    <div>

                      <p className="text-sm font-medium text-slate-900">
                        {
                          selectedTask
                            .project
                            .name
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {
                          selectedTask
                            .project
                            .client
                            .name
                        }
                      </p>

                    </div>

                  </div>

                </section>

                {/* TASK INFORMATION */}

                <section className="mt-8 border-t border-slate-100 pt-6">

                  <h3 className="text-sm font-semibold text-slate-900">
                    Task information
                  </h3>

                  <div className="mt-4 space-y-3">

                    {selectedTask.createdAt && (
                      <div className="flex items-center gap-3 text-sm text-slate-500">

                        <Clock3
                          size={15}
                          className="shrink-0"
                        />

                        <span>
                          Created{' '}
                          {formatDateTime(
                            selectedTask.createdAt
                          )}
                        </span>

                      </div>
                    )}

                    {selectedTask.updatedAt && (
                      <div className="flex items-center gap-3 text-sm text-slate-500">

                        <Clock3
                          size={15}
                          className="shrink-0"
                        />

                        <span>
                          Last updated{' '}
                          {formatDateTime(
                            selectedTask.updatedAt
                          )}
                        </span>

                      </div>
                    )}

                  </div>

                </section>

                {/* FUTURE TASK FEATURES */}

                <section className="mt-8 border-t border-slate-100 pt-6">

                  <h3 className="text-sm font-semibold text-slate-900">
                    More task details
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-xl border border-dashed border-slate-200 p-4">

                      <p className="text-sm font-medium text-slate-700">
                        Subtasks
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Coming next
                      </p>

                    </div>

                    <div className="rounded-xl border border-dashed border-slate-200 p-4">

                      <p className="text-sm font-medium text-slate-700">
                        Attachments
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Files will appear here
                      </p>

                    </div>

                    <div className="rounded-xl border border-dashed border-slate-200 p-4">

                      <p className="text-sm font-medium text-slate-700">
                        Activity
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Comments and history
                      </p>

                    </div>

                  </div>

                </section>

              </div>

            </div>

          </aside>

        </div>
      )}

    </>
  )
}

export default TaskManagement