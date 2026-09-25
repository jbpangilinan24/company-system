import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  EllipsisVertical,
  FolderKanban,
  Plus,
  Search,
} from 'lucide-react'

import { API_URL } from '../config/api'

import Alert from './ui/Alert'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import PageHeader from './ui/PageHeader'

type ProjectStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'

type Client = {
  id: number
  name: string
  company: string | null
}

type Project = {
  id: number
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  dueDate: string | null
  clientId: number
  client: Client
  createdAt?: string
  updatedAt?: string
}

type ProjectForm = {
  name: string
  clientId: string
  status: ProjectStatus
  startDate: string
  dueDate: string
  description: string
}

const emptyForm: ProjectForm = {
  name: '',
  clientId: '',
  status: 'PLANNING',
  startDate: '',
  dueDate: '',
  description: '',
}

const projectStatuses: ProjectStatus[] = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
]

function ProjectManagement() {
  const [projects, setProjects] =
    useState<Project[]>([])

  const [clients, setClients] =
    useState<Client[]>([])

  const [loading, setLoading] =
    useState(true)

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  const [search, setSearch] =
    useState('')

  const [
    clientFilter,
    setClientFilter,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('')

  // --------------------------------------------------
  // MODAL
  // --------------------------------------------------

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false)

  const [
    editingProject,
    setEditingProject,
  ] = useState<Project | null>(null)

  const [form, setForm] =
    useState<ProjectForm>(emptyForm)

  const [saving, setSaving] =
    useState(false)

  const [
    formMessage,
    setFormMessage,
  ] = useState('')

  // --------------------------------------------------
  // PAGE MESSAGE
  // --------------------------------------------------

  const [
    pageMessage,
    setPageMessage,
  ] = useState('')

  const [
    pageMessageType,
    setPageMessageType,
  ] = useState<
    'success' | 'error'
  >('success')

  // --------------------------------------------------
  // DROPDOWNS
  // --------------------------------------------------

  const [
    openActionId,
    setOpenActionId,
  ] = useState<number | null>(null)

  const [
    openStatusId,
    setOpenStatusId,
  ] = useState<number | null>(null)

  const [
    updatingProjectId,
    setUpdatingProjectId,
  ] = useState<number | null>(null)

  // --------------------------------------------------
  // LOAD PROJECTS + CLIENTS
  // --------------------------------------------------

  const loadData = async () => {
    try {
      setLoading(true)
      setPageMessage('')

      const [
        projectsResponse,
        clientsResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/api/projects`,
          {
            credentials: 'include',
          }
        ),

        fetch(
          `${API_URL}/api/clients`,
          {
            credentials: 'include',
          }
        ),
      ])

      const projectsData =
        await projectsResponse.json()

      const clientsData =
        await clientsResponse.json()

      if (!projectsResponse.ok) {
        throw new Error(
          projectsData.message ||
            'Unable to load projects'
        )
      }

      if (!clientsResponse.ok) {
        throw new Error(
          clientsData.message ||
            'Unable to load clients'
        )
      }

      setProjects(
        projectsData.projects
      )

      setClients(
        clientsData.clients
      )
    } catch (error) {
      setPageMessageType('error')

      setPageMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load projects'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // --------------------------------------------------
  // FILTER PROJECTS
  // --------------------------------------------------

  const filteredProjects =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase()

      return projects.filter(
        (project) => {
          const matchesSearch =
            !searchValue ||
            project.name
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            project.client.name
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            project.client.company
              ?.toLowerCase()
              .includes(
                searchValue
              ) ||
            project.description
              ?.toLowerCase()
              .includes(
                searchValue
              )

          const matchesClient =
            !clientFilter ||
            String(
              project.client.id
            ) === clientFilter

          const matchesStatus =
            !statusFilter ||
            project.status ===
              statusFilter

          return (
            matchesSearch &&
            matchesClient &&
            matchesStatus
          )
        }
      )
    }, [
      projects,
      search,
      clientFilter,
      statusFilter,
    ])

  // --------------------------------------------------
  // CLOSE DROPDOWNS
  // --------------------------------------------------

  const closeAllDropdowns = () => {
    setOpenActionId(null)
    setOpenStatusId(null)
  }

  // --------------------------------------------------
  // OPEN ADD MODAL
  // --------------------------------------------------

  const openAddModal = () => {
    setEditingProject(null)
    setForm(emptyForm)
    setFormMessage('')
    closeAllDropdowns()
    setModalOpen(true)
  }

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------

  const openEditModal = (
    project: Project
  ) => {
    setEditingProject(project)

    setForm({
      name: project.name,

      clientId: String(
        project.clientId
      ),

      status: project.status,

      startDate: project.startDate
        ? project.startDate.slice(
            0,
            10
          )
        : '',

      dueDate: project.dueDate
        ? project.dueDate.slice(
            0,
            10
          )
        : '',

      description:
        project.description || '',
    })

    setFormMessage('')
    closeAllDropdowns()
    setModalOpen(true)
  }

  // --------------------------------------------------
  // CLOSE MODAL
  // --------------------------------------------------

  const closeModal = () => {
    if (saving) {
      return
    }

    setModalOpen(false)
    setEditingProject(null)
    setForm(emptyForm)
    setFormMessage('')
  }

  // --------------------------------------------------
  // SAVE PROJECT
  // --------------------------------------------------

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setFormMessage('')

    if (!form.name.trim()) {
      setFormMessage(
        'Project name is required.'
      )

      return
    }

    if (!form.clientId) {
      setFormMessage(
        'Please select a client.'
      )

      return
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.dueDate < form.startDate
    ) {
      setFormMessage(
        'Due date cannot be before the start date.'
      )

      return
    }

    try {
      setSaving(true)

      const isEditing =
        editingProject !== null

      const url = isEditing
        ? `${API_URL}/api/projects/${editingProject.id}`
        : `${API_URL}/api/projects`

      const response =
        await fetch(url, {
          method: isEditing
            ? 'PATCH'
            : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          credentials:
            'include',

          body: JSON.stringify({
            name:
              form.name.trim(),

            clientId: Number(
              form.clientId
            ),

            status:
              form.status,

            startDate:
              form.startDate ||
              null,

            dueDate:
              form.dueDate ||
              null,

            description:
              form.description.trim(),
          }),
        })

      const data =
        await response.json()

      if (!response.ok) {
        setFormMessage(
          data.message ||
            `Unable to ${
              isEditing
                ? 'update'
                : 'create'
            } project`
        )

        return
      }

      setModalOpen(false)
      setEditingProject(null)
      setForm(emptyForm)

      setPageMessageType(
        'success'
      )

      setPageMessage(
        isEditing
          ? 'Project updated successfully'
          : 'Project created successfully'
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
  // INLINE STATUS UPDATE
  // --------------------------------------------------

  const updateProjectStatus = async (
    project: Project,
    status: ProjectStatus
  ) => {
    if (
      status === project.status
    ) {
      setOpenStatusId(null)
      return
    }

    try {
      setUpdatingProjectId(
        project.id
      )

      setPageMessage('')

      const response =
        await fetch(
          `${API_URL}/api/projects/${project.id}`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            credentials:
              'include',

            body: JSON.stringify({
              status,
            }),
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
            'Unable to update project status'
        )

        return
      }

      /*
       * Replace only the updated project
       * instead of refreshing the entire page.
       */
      setProjects(
        (currentProjects) =>
          currentProjects.map(
            (currentProject) =>
              currentProject.id ===
              project.id
                ? data.project
                : currentProject
          )
      )

      setPageMessageType(
        'success'
      )

      setPageMessage(
        `Project status changed to ${getStatusLabel(
          status
        )}`
      )
    } catch {
      setPageMessageType(
        'error'
      )

      setPageMessage(
        'Unable to connect to the server'
      )
    } finally {
      setUpdatingProjectId(
        null
      )

      closeAllDropdowns()
    }
  }

  // --------------------------------------------------
  // STATUS LABEL
  // --------------------------------------------------

  const getStatusLabel = (
    status: ProjectStatus
  ) => {
    switch (status) {
      case 'PLANNING':
        return 'Planning'

      case 'ACTIVE':
        return 'Active'

      case 'ON_HOLD':
        return 'On Hold'

      case 'COMPLETED':
        return 'Completed'
    }
  }

  // --------------------------------------------------
  // STATUS BADGE
  // --------------------------------------------------

  const getStatusVariant = (
    status: ProjectStatus
  ):
    | 'default'
    | 'success'
    | 'warning'
    | 'info' => {
    switch (status) {
      case 'ACTIVE':
        return 'success'

      case 'PLANNING':
        return 'info'

      case 'ON_HOLD':
        return 'warning'

      case 'COMPLETED':
        return 'default'
    }
  }

  // --------------------------------------------------
  // FORMAT DATE
  // --------------------------------------------------

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return '—'
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

  // --------------------------------------------------
  // FILTER STATE
  // --------------------------------------------------

  const filtersActive =
    search ||
    clientFilter ||
    statusFilter

  const clearFilters = () => {
    setSearch('')
    setClientFilter('')
    setStatusFilter('')
  }

  return (
    <>
      {/* PAGE HEADER */}

      <PageHeader
        title="Projects"
        description="Manage projects, clients, schedules and project status."
        actions={
          <Button
            type="button"
            onClick={
              openAddModal
            }
          >
            <Plus size={17} />
            Add Project
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

      {/* PROJECT PANEL */}

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* TOOLBAR */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">

          {/* SEARCH */}

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
              placeholder="Search projects..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

          </div>

          {/* FILTERS */}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            <select
              value={
                clientFilter
              }
              onChange={(
                event
              ) =>
                setClientFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >

              <option value="">
                All clients
              </option>

              {clients.map(
                (client) => (
                  <option
                    key={
                      client.id
                    }
                    value={
                      client.id
                    }
                  >
                    {
                      client.name
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
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >

              <option value="">
                All statuses
              </option>

              <option value="PLANNING">
                Planning
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="ON_HOLD">
                On Hold
              </option>

              <option value="COMPLETED">
                Completed
              </option>

            </select>

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

        {/* RESULT COUNT */}

        <div className="border-b border-slate-100 px-5 py-3">

          <p className="text-xs font-medium text-slate-500">
            {
              filteredProjects.length
            }{' '}
            {filteredProjects.length ===
            1
              ? 'project'
              : 'projects'}
          </p>

        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-r-slate-900" />

              <p className="mt-3 text-sm text-slate-500">
                Loading projects...
              </p>

            </div>

          </div>
        ) : filteredProjects.length ===
          0 ? (

          /* EMPTY STATE */

          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FolderKanban
                size={22}
              />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {projects.length ===
              0
                ? 'No projects yet'
                : 'No projects found'}
            </h3>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {projects.length ===
              0
                ? clients.length ===
                  0
                  ? 'Add a client first, then create your first project.'
                  : 'Create your first project and connect it to a client.'
                : 'Try changing your search or filters.'}
            </p>

            {projects.length ===
              0 &&
              clients.length >
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

                  Add Project
                </Button>
              )}

          </div>
        ) : (

          /* PROJECT TABLE */

          <div className="overflow-visible max-xl:overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/70">

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Client
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Schedule
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="w-20 px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {filteredProjects.map(
                  (project) => (
                    <tr
                      key={
                        project.id
                      }
                      className="transition hover:bg-slate-50/70"
                    >

                      {/* PROJECT */}

                      <td className="px-5 py-4">

                        <div className="flex items-start gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">

                            <FolderKanban
                              size={18}
                            />

                          </div>

                          <div className="min-w-0">

                            <p className="font-medium text-slate-900">
                              {
                                project.name
                              }
                            </p>

                            {project.description && (
                              <p className="mt-1 max-w-sm truncate text-sm text-slate-500">
                                {
                                  project.description
                                }
                              </p>
                            )}

                          </div>

                        </div>

                      </td>

                      {/* CLIENT */}

                      <td className="px-5 py-4">

                        <p className="text-sm font-medium text-slate-700">
                          {
                            project
                              .client
                              .name
                          }
                        </p>

                        {project.client
                          .company && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              project
                                .client
                                .company
                            }
                          </p>
                        )}

                      </td>

                      {/* SCHEDULE */}

                      <td className="px-5 py-4">

                        <div className="flex items-start gap-2">

                          <CalendarDays
                            size={15}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />

                          <div className="text-sm">

                            <p className="text-slate-700">
                              {formatDate(
                                project.startDate
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              to{' '}
                              {formatDate(
                                project.dueDate
                              )}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* CLICKABLE STATUS */}

                      <td className="relative px-5 py-4">

                        <button
                          type="button"
                          disabled={
                            updatingProjectId ===
                            project.id
                          }
                          onClick={() => {
                            setOpenStatusId(
                              openStatusId ===
                                project.id
                                ? null
                                : project.id
                            )

                            setOpenActionId(
                              null
                            )
                          }}
                          className="inline-flex rounded-full transition hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                          aria-label={`Change status for ${project.name}`}
                        >

                          <Badge
                            variant={getStatusVariant(
                              project.status
                            )}
                          >

                            <span className="inline-flex items-center gap-1">

                              {updatingProjectId ===
                              project.id
                                ? 'Updating...'
                                : getStatusLabel(
                                    project.status
                                  )}

                              {updatingProjectId !==
                                project.id && (
                                <ChevronDown
                                  size={12}
                                />
                              )}

                            </span>

                          </Badge>

                        </button>

                        {/* STATUS DROPDOWN */}

                        {openStatusId ===
                          project.id && (
                          <div className="absolute left-5 top-[calc(100%-8px)] z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                            {projectStatuses.map(
                              (
                                status
                              ) => (
                                <button
                                  key={
                                    status
                                  }
                                  type="button"
                                  disabled={
                                    updatingProjectId ===
                                    project.id
                                  }
                                  onClick={() =>
                                    updateProjectStatus(
                                      project,
                                      status
                                    )
                                  }
                                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${
                                    status ===
                                    project.status
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
                                    project.status && (
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

                      {/* ACTIONS */}

                      <td className="relative px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() => {
                            setOpenActionId(
                              openActionId ===
                                project.id
                                ? null
                                : project.id
                            )

                            setOpenStatusId(
                              null
                            )
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Actions for ${project.name}`}
                        >

                          <EllipsisVertical
                            size={18}
                          />

                        </button>

                        {openActionId ===
                          project.id && (
                          <div className="absolute right-5 top-[calc(100%-8px)] z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  project
                                )
                              }
                              className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit project
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

      {/* ADD / EDIT PROJECT MODAL */}

      <Modal
        open={modalOpen}
        title={
          editingProject
            ? 'Edit Project'
            : 'Add Project'
        }
        description={
          editingProject
            ? 'Update project details, schedule and status.'
            : 'Create a new project and connect it to a client.'
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

            {/* PROJECT NAME */}

            <div>

              <label
                htmlFor="project-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Project name

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="project-name"
                type="text"
                value={
                  form.name
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    name:
                      event.target
                        .value,
                  })
                }
                placeholder="Project name"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* CLIENT */}

            <div>

              <label
                htmlFor="project-client"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Client

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="project-client"
                value={
                  form.clientId
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    clientId:
                      event.target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="">
                  Select client
                </option>

                {clients.map(
                  (client) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
                      }
                    >
                      {
                        client.name
                      }

                      {client.company
                        ? ` — ${client.company}`
                        : ''}
                    </option>
                  )
                )}

              </select>

            </div>

            {/* STATUS */}

            <div>

              <label
                htmlFor="project-status"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="project-status"
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    status:
                      event.target
                        .value as ProjectStatus,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="PLANNING">
                  Planning
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="ON_HOLD">
                  On Hold
                </option>

                <option value="COMPLETED">
                  Completed
                </option>

              </select>

            </div>

            <div />

            {/* START DATE */}

            <div>

              <label
                htmlFor="project-start-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Start date
              </label>

              <input
                id="project-start-date"
                type="date"
                value={
                  form.startDate
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    startDate:
                      event.target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* DUE DATE */}

            <div>

              <label
                htmlFor="project-due-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Due date
              </label>

              <input
                id="project-due-date"
                type="date"
                value={
                  form.dueDate
                }
                min={
                  form.startDate ||
                  undefined
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    dueDate:
                      event.target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* DESCRIPTION */}

            <div className="sm:col-span-2">

              <label
                htmlFor="project-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="project-description"
                value={
                  form.description
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    description:
                      event.target
                        .value,
                  })
                }
                rows={5}
                placeholder="Project details, goals or internal notes..."
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
                ? editingProject
                  ? 'Saving...'
                  : 'Creating...'
                : editingProject
                  ? 'Save Changes'
                  : 'Add Project'}
            </Button>

          </div>

        </form>

      </Modal>
    </>
  )
}

export default ProjectManagement