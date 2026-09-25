import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  ChevronDown,
  EllipsisVertical,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'

import { API_URL } from '../config/api'

import Alert from './ui/Alert'
import Badge from './ui/Badge'
import Button from './ui/Button'
import ConfirmModal from './ui/ConfirmModal'
import Modal from './ui/Modal'
import PageHeader from './ui/PageHeader'

type UserRole =
  | 'ADMIN'
  | 'MEMBER'

type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'

type SystemUser = {
  id: number
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt?: string
  updatedAt?: string
}

type UserForm = {
  name: string
  email: string
  password: string
  role: UserRole
  status: UserStatus
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  password: '',
  role: 'MEMBER',
  status: 'ACTIVE',
}

// Must match MIN_PASSWORD_LENGTH in backend/src/routes/users.ts
const MIN_PASSWORD_LENGTH = 8

const userStatuses: UserStatus[] = [
  'ACTIVE',
  'INACTIVE',
]

function UserManagement() {
  const [
    users,
    setUsers,
  ] = useState<SystemUser[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  // --------------------------------------------------
  // CURRENT USER
  // --------------------------------------------------

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState<number | null>(null)

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    roleFilter,
    setRoleFilter,
  ] = useState('')

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('')

  // --------------------------------------------------
  // ADD / EDIT MODAL
  // --------------------------------------------------

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false)

  const [
    editingUser,
    setEditingUser,
  ] = useState<SystemUser | null>(
    null
  )

  const [
    form,
    setForm,
  ] = useState<UserForm>(
    emptyForm
  )

  const [
    saving,
    setSaving,
  ] = useState(false)

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
  ] = useState<number | null>(
    null
  )

  const [
    openStatusId,
    setOpenStatusId,
  ] = useState<number | null>(
    null
  )

  const [
    updatingUserId,
    setUpdatingUserId,
  ] = useState<number | null>(
    null
  )

  // --------------------------------------------------
  // DELETE MODAL
  // --------------------------------------------------

  const [
    deleteUser,
    setDeleteUser,
  ] = useState<SystemUser | null>(
    null
  )

  const [
    deleteLoading,
    setDeleteLoading,
  ] = useState(false)

  const [
    deleteMessage,
    setDeleteMessage,
  ] = useState('')

  // --------------------------------------------------
  // LOAD USERS
  // --------------------------------------------------

  const loadUsers = async () => {
    try {
      setLoading(true)

      const response =
        await fetch(
          `${API_URL}/api/users`,
          {
            credentials:
              'include',
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to load users'
        )
      }

      setUsers(
        data.users
      )
    } catch (error) {
      setPageMessageType(
        'error'
      )

      setPageMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load users'
      )
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------
  // LOAD CURRENT USER
  // --------------------------------------------------

  const loadCurrentUser =
    async () => {
      try {
        const response =
          await fetch(
            `${API_URL}/api/auth/me`,
            {
              credentials:
                'include',
            }
          )

        if (!response.ok) {
          return
        }

        const data =
          await response.json()

        if (
          data.user?.id
        ) {
          setCurrentUserId(
            data.user.id
          )
        }
      } catch (error) {
        console.error(
          'CURRENT USER ERROR:',
          error
        )
      }
    }

  useEffect(() => {
    Promise.all([
      loadUsers(),
      loadCurrentUser(),
    ])
  }, [])

  // --------------------------------------------------
  // FILTER USERS
  // --------------------------------------------------

  const filteredUsers =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase()

      return users.filter(
        (user) => {
          const matchesSearch =
            !searchValue ||
            user.name
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            user.email
              .toLowerCase()
              .includes(
                searchValue
              )

          const matchesRole =
            !roleFilter ||
            user.role ===
              roleFilter

          const matchesStatus =
            !statusFilter ||
            user.status ===
              statusFilter

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          )
        }
      )
    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ])

  // --------------------------------------------------
  // CLOSE DROPDOWNS
  // --------------------------------------------------

  const closeAllDropdowns =
    () => {
      setOpenActionId(null)
      setOpenStatusId(null)
    }

  // --------------------------------------------------
  // ADD USER
  // --------------------------------------------------

  const openAddModal = () => {
    setEditingUser(null)

    setForm(
      emptyForm
    )

    setFormMessage('')

    closeAllDropdowns()

    setModalOpen(true)
  }

  // --------------------------------------------------
  // EDIT USER
  // --------------------------------------------------

  const openEditModal = (
    user: SystemUser
  ) => {
    setEditingUser(user)

    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    })

    setFormMessage('')

    closeAllDropdowns()

    setModalOpen(true)
  }

  // --------------------------------------------------
  // CLOSE USER MODAL
  // --------------------------------------------------

  const closeModal = () => {
    if (saving) {
      return
    }

    setModalOpen(false)

    setEditingUser(null)

    setForm(
      emptyForm
    )

    setFormMessage('')
  }

  // --------------------------------------------------
  // CREATE / UPDATE USER
  // --------------------------------------------------

  const handleSubmit = async (
    event:
      React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setFormMessage('')

    if (!form.name.trim()) {
      setFormMessage(
        'Name is required.'
      )

      return
    }

    if (!form.email.trim()) {
      setFormMessage(
        'Email is required.'
      )

      return
    }

    if (
      !editingUser &&
      !form.password
    ) {
      setFormMessage(
        'Password is required.'
      )

      return
    }

    // When editing, a blank password keeps the current one.
    if (
      form.password &&
      form.password.length <
        MIN_PASSWORD_LENGTH
    ) {
      setFormMessage(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      )

      return
    }

    try {
      setSaving(true)

      const isEditing =
        editingUser !== null

      const url =
        isEditing
          ? `${API_URL}/api/users/${editingUser.id}`
          : `${API_URL}/api/users`

      const body = isEditing
        ? {
            name:
              form.name.trim(),

            email:
              form.email
                .trim()
                .toLowerCase(),

            role:
              form.role,

            status:
              form.status,

            ...(form.password && {
              password:
                form.password,
            }),
          }
        : {
            name:
              form.name.trim(),

            email:
              form.email
                .trim()
                .toLowerCase(),

            password:
              form.password,

            role:
              form.role,
          }

      const response =
        await fetch(url, {
          method:
            isEditing
              ? 'PATCH'
              : 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          credentials:
            'include',

          body:
            JSON.stringify(
              body
            ),
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
            } user`
        )

        return
      }

      setModalOpen(false)

      setEditingUser(null)

      setForm(
        emptyForm
      )

      setPageMessageType(
        'success'
      )

      setPageMessage(
        isEditing
          ? 'User updated successfully'
          : 'User created successfully'
      )

      await loadUsers()
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

  const updateUserStatus =
    async (
      user: SystemUser,
      status: UserStatus
    ) => {
      if (
        status === user.status
      ) {
        setOpenStatusId(
          null
        )

        return
      }

      try {
        setUpdatingUserId(
          user.id
        )

        setPageMessage('')

        const response =
          await fetch(
            `${API_URL}/api/users/${user.id}`,
            {
              method:
                'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              credentials:
                'include',

              body:
                JSON.stringify({
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
              'Unable to update user status'
          )

          return
        }

        /*
         * Some APIs return:
         * { user: {...} }
         *
         * If yours does not, we still
         * update the status locally.
         */
        setUsers(
          (
            currentUsers
          ) =>
            currentUsers.map(
              (
                currentUser
              ) =>
                currentUser.id ===
                user.id
                  ? data.user
                    ? data.user
                    : {
                        ...currentUser,
                        status,
                      }
                  : currentUser
            )
        )

        setPageMessageType(
          'success'
        )

        setPageMessage(
          status === 'ACTIVE'
            ? 'User activated successfully'
            : 'User deactivated successfully'
        )
      } catch {
        setPageMessageType(
          'error'
        )

        setPageMessage(
          'Unable to connect to the server'
        )
      } finally {
        setUpdatingUserId(
          null
        )

        closeAllDropdowns()
      }
    }

  // --------------------------------------------------
  // OPEN DELETE MODAL
  // --------------------------------------------------

  const openDeleteModal = (
    user: SystemUser
  ) => {
    closeAllDropdowns()

    setDeleteUser(user)

    setDeleteMessage('')
  }

  // --------------------------------------------------
  // CLOSE DELETE MODAL
  // --------------------------------------------------

  const closeDeleteModal =
    () => {
      if (deleteLoading) {
        return
      }

      setDeleteUser(null)

      setDeleteMessage('')
    }

  // --------------------------------------------------
  // DELETE USER
  // --------------------------------------------------

  const handleDeleteUser =
    async () => {
      if (!deleteUser) {
        return
      }

      try {
        setDeleteLoading(
          true
        )

        setDeleteMessage('')

        const response =
          await fetch(
            `${API_URL}/api/users/${deleteUser.id}`,
            {
              method:
                'DELETE',

              credentials:
                'include',
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          setDeleteMessage(
            data.message ||
              'Unable to delete user'
          )

          return
        }

        const deletedUserId =
          deleteUser.id

        setDeleteUser(null)

        setUsers(
          (
            currentUsers
          ) =>
            currentUsers.filter(
              (user) =>
                user.id !==
                deletedUserId
            )
        )

        setPageMessageType(
          'success'
        )

        setPageMessage(
          'User deleted successfully'
        )
      } catch {
        setDeleteMessage(
          'Unable to connect to the server'
        )
      } finally {
        setDeleteLoading(
          false
        )
      }
    }

  // --------------------------------------------------
  // ROLE HELPERS
  // --------------------------------------------------

  const getRoleLabel = (
    role: UserRole
  ) => {
    return role === 'ADMIN'
      ? 'Admin'
      : 'Member'
  }

  const getRoleVariant = (
    role: UserRole
  ):
    | 'default'
    | 'info' => {
    return role === 'ADMIN'
      ? 'info'
      : 'default'
  }

  // --------------------------------------------------
  // STATUS HELPERS
  // --------------------------------------------------

  const getStatusLabel = (
    status: UserStatus
  ) => {
    return status ===
      'ACTIVE'
      ? 'Active'
      : 'Inactive'
  }

  const getStatusVariant = (
    status: UserStatus
  ):
    | 'success'
    | 'default' => {
    return status ===
      'ACTIVE'
      ? 'success'
      : 'default'
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
        (part) => part[0]
      )
      .join('')
      .toUpperCase()
  }

  // --------------------------------------------------
  // FILTER STATE
  // --------------------------------------------------

  const filtersActive =
    search ||
    roleFilter ||
    statusFilter

  const clearFilters = () => {
    setSearch('')
    setRoleFilter('')
    setStatusFilter('')
  }

  return (
    <>
      {/* PAGE HEADER */}

      <PageHeader
        title="Users"
        description="Manage team members, roles and account access."
        actions={
          <Button
            type="button"
            onClick={
              openAddModal
            }
          >
            <Plus size={17} />

            Add User
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

      {/* USER PANEL */}

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
              placeholder="Search users..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />

          </div>

          {/* FILTERS */}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            <select
              value={
                roleFilter
              }
              onChange={(
                event
              ) =>
                setRoleFilter(
                  event.target
                    .value
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >

              <option value="">
                All roles
              </option>

              <option value="ADMIN">
                Admin
              </option>

              <option value="MEMBER">
                Member
              </option>

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

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
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
              filteredUsers.length
            }{' '}

            {filteredUsers.length ===
            1
              ? 'user'
              : 'users'}

          </p>

        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">

            <div className="text-center">

              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-r-slate-900" />

              <p className="mt-3 text-sm text-slate-500">
                Loading users...
              </p>

            </div>

          </div>
        ) : filteredUsers.length ===
          0 ? (

          /* EMPTY STATE */

          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">

              <Users
                size={22}
              />

            </div>

            <h3 className="mt-4 font-semibold text-slate-900">

              {users.length === 0
                ? 'No users yet'
                : 'No users found'}

            </h3>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">

              {users.length === 0
                ? 'Create a user to give someone access to the system.'
                : 'Try changing your search or filters.'}

            </p>

            {users.length ===
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

                Add User
              </Button>
            )}

          </div>
        ) : (

          /* USERS TABLE */

          <div className="overflow-visible max-xl:overflow-x-auto">

            <table className="w-full min-w-[900px] text-left">

              <thead>

                <tr className="border-b border-slate-200 bg-slate-50/70">

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
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

                {filteredUsers.map(
                  (systemUser) => {
                    const isCurrentUser =
                      systemUser.id ===
                      currentUserId

                    return (
                      <tr
                        key={
                          systemUser.id
                        }
                        className="transition hover:bg-slate-50/70"
                      >

                        {/* USER */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">

                              {getInitials(
                                systemUser.name
                              )}

                            </div>

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">

                                <p className="font-medium text-slate-900">
                                  {
                                    systemUser.name
                                  }
                                </p>

                                {isCurrentUser && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    You
                                  </span>
                                )}

                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {
                                  systemUser.email
                                }
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* ROLE */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            {systemUser.role ===
                            'ADMIN' ? (
                              <ShieldCheck
                                size={15}
                                className="text-slate-400"
                              />
                            ) : (
                              <UserRound
                                size={15}
                                className="text-slate-400"
                              />
                            )}

                            <Badge
                              variant={getRoleVariant(
                                systemUser.role
                              )}
                            >
                              {getRoleLabel(
                                systemUser.role
                              )}
                            </Badge>

                          </div>

                        </td>

                        {/* CLICKABLE STATUS */}

                        <td className="relative px-5 py-4">

                          <button
                            type="button"
                            disabled={
                              updatingUserId ===
                              systemUser.id
                            }
                            onClick={() => {
                              setOpenStatusId(
                                openStatusId ===
                                  systemUser.id
                                  ? null
                                  : systemUser.id
                              )

                              setOpenActionId(
                                null
                              )
                            }}
                            className="inline-flex rounded-full transition hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50"
                            aria-label={`Change account status for ${systemUser.name}`}
                          >

                            <Badge
                              variant={getStatusVariant(
                                systemUser.status
                              )}
                            >

                              <span className="inline-flex items-center gap-1">

                                {updatingUserId ===
                                systemUser.id
                                  ? 'Updating...'
                                  : getStatusLabel(
                                      systemUser.status
                                    )}

                                {updatingUserId !==
                                  systemUser.id && (
                                  <ChevronDown
                                    size={12}
                                  />
                                )}

                              </span>

                            </Badge>

                          </button>

                          {/* STATUS DROPDOWN */}

                          {openStatusId ===
                            systemUser.id && (
                            <div className="absolute left-5 top-[calc(100%-8px)] z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                              {userStatuses.map(
                                (
                                  status
                                ) => {
                                  const disablesCurrentUser =
                                    isCurrentUser &&
                                    status ===
                                      'INACTIVE'

                                  return (
                                    <button
                                      key={
                                        status
                                      }
                                      type="button"
                                      disabled={
                                        disablesCurrentUser ||
                                        updatingUserId ===
                                          systemUser.id
                                      }
                                      onClick={() =>
                                        updateUserStatus(
                                          systemUser,
                                          status
                                        )
                                      }
                                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                                        disablesCurrentUser
                                          ? 'cursor-not-allowed text-slate-300'
                                          : status ===
                                              systemUser.status
                                            ? 'font-medium text-slate-900 hover:bg-slate-50'
                                            : 'text-slate-600 hover:bg-slate-50'
                                      }`}
                                    >

                                      <span>
                                        {getStatusLabel(
                                          status
                                        )}
                                      </span>

                                      {status ===
                                        systemUser.status && (
                                        <span className="text-xs text-slate-400">
                                          ✓
                                        </span>
                                      )}

                                    </button>
                                  )
                                }
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
                                  systemUser.id
                                  ? null
                                  : systemUser.id
                              )

                              setOpenStatusId(
                                null
                              )
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Actions for ${systemUser.name}`}
                          >

                            <EllipsisVertical
                              size={18}
                            />

                          </button>

                          {openActionId ===
                            systemUser.id && (
                            <div className="absolute right-5 top-[calc(100%-8px)] z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    systemUser
                                  )
                                }
                                className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                              >
                                Edit user
                              </button>

                              {!isCurrentUser && (
                                <>
                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openDeleteModal(
                                        systemUser
                                      )
                                    }
                                    className="block w-full px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                                  >
                                    Delete user
                                  </button>
                                </>
                              )}

                            </div>
                          )}

                        </td>

                      </tr>
                    )
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* ADD / EDIT USER MODAL */}

      <Modal
        open={modalOpen}
        title={
          editingUser
            ? 'Edit User'
            : 'Add User'
        }
        description={
          editingUser
            ? 'Update account details, role and access status.'
            : 'Create an account and choose the user’s system role.'
        }
        onClose={
          closeModal
        }
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

            {/* NAME */}

            <div>

              <label
                htmlFor="user-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Name

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="user-name"
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
                placeholder="Full name"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* EMAIL */}

            <div>

              <label
                htmlFor="user-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email

                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="user-email"
                type="email"
                value={
                  form.email
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    email:
                      event.target
                        .value,
                  })
                }
                placeholder="name@company.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

            </div>

            {/* PASSWORD - REQUIRED ON CREATE, OPTIONAL RESET ON EDIT */}

            <div className="sm:col-span-2">

              <label
                htmlFor="user-password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                {editingUser
                  ? 'New password'
                  : 'Password'}

                {!editingUser && (
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                )}
              </label>

              <input
                id="user-password"
                type="password"
                value={
                  form.password
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    password:
                      event.target
                        .value,
                  })
                }
                placeholder={
                  editingUser
                    ? 'Leave blank to keep the current password'
                    : 'Enter a secure password'
                }
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <p className="mt-1.5 text-xs text-slate-400">
                {editingUser
                  ? `Enter a new password (at least ${MIN_PASSWORD_LENGTH} characters) to replace the user's current password.`
                  : `This password will be used for the user's initial login. At least ${MIN_PASSWORD_LENGTH} characters.`}
              </p>

            </div>

            {/* ROLE */}

            <div>

              <label
                htmlFor="user-role"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Role
              </label>

              <select
                id="user-role"
                value={
                  form.role
                }
                onChange={(
                  event
                ) =>
                  setForm({
                    ...form,

                    role:
                      event.target
                        .value as UserRole,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >

                <option value="MEMBER">
                  Member
                </option>

                <option value="ADMIN">
                  Admin
                </option>

              </select>

              <p className="mt-1.5 text-xs leading-5 text-slate-400">

                {form.role ===
                'ADMIN'
                  ? 'Admins can manage users and access administrative features.'
                  : 'Members can access normal workspace features but cannot manage users.'}

              </p>

            </div>

            {/* STATUS - EDIT ONLY */}

            {editingUser ? (
              <div>

                <label
                  htmlFor="user-status"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>

                <select
                  id="user-status"
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
                          .value as UserStatus,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >

                  <option value="ACTIVE">
                    Active
                  </option>

                  <option
                    value="INACTIVE"
                    disabled={
                      editingUser.id ===
                      currentUserId
                    }
                  >
                    Inactive
                  </option>

                </select>

                {editingUser.id ===
                  currentUserId && (
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    You cannot deactivate your own account.
                  </p>
                )}

              </div>
            ) : (
              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Initial status
                </label>

                <div className="flex min-h-[42px] items-center">

                  <Badge variant="success">
                    Active
                  </Badge>

                </div>

                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  New users are active by default.
                </p>

              </div>
            )}

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
                ? editingUser
                  ? 'Saving...'
                  : 'Creating...'
                : editingUser
                  ? 'Save Changes'
                  : 'Add User'}

            </Button>

          </div>

        </form>

      </Modal>

      {/* DELETE CONFIRMATION */}

      <ConfirmModal
        open={
          deleteUser !== null
        }
        title="Delete User?"
        message={
          deleteUser
            ? `Are you sure you want to delete ${deleteUser.name}? This action cannot be undone.`
            : ''
        }
        confirmText="Delete User"
        loading={
          deleteLoading
        }
        error={
          deleteMessage
        }
        onConfirm={
          handleDeleteUser
        }
        onClose={
          closeDeleteModal
        }
      />

    </>
  )
}

export default UserManagement