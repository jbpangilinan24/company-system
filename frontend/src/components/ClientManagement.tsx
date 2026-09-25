import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  EllipsisVertical,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'

import { API_URL } from '../config/api'

import Alert from './ui/Alert'
import Badge from './ui/Badge'
import Button from './ui/Button'
import Modal from './ui/Modal'
import PageHeader from './ui/PageHeader'

type ClientStatus = 'ACTIVE' | 'INACTIVE'

type Client = {
  id: number
  name: string
  company: string | null
  email: string | null
  phone: string | null
  website: string | null
  notes: string | null
  status: ClientStatus
  createdAt?: string
  updatedAt?: string
}

type ClientForm = {
  name: string
  company: string
  email: string
  phone: string
  website: string
  notes: string
  status: ClientStatus
}

const emptyForm: ClientForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  notes: '',
  status: 'ACTIVE',
}

function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] =
    useState<Client | null>(null)

  const [form, setForm] =
    useState<ClientForm>(emptyForm)

  const [saving, setSaving] = useState(false)

  const [formMessage, setFormMessage] = useState('')
  const [pageMessage, setPageMessage] = useState('')
  const [pageMessageType, setPageMessageType] =
    useState<'success' | 'error'>('success')

  const [openActionId, setOpenActionId] =
    useState<number | null>(null)

  // --------------------------------------------------
  // LOAD CLIENTS
  // --------------------------------------------------

  const loadClients = async () => {
    try {
      setLoading(true)

      const response = await fetch(
        `${API_URL}/api/clients`,
        {
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to load clients'
        )
      }

      setClients(data.clients)
    } catch (error) {
      setPageMessageType('error')

      setPageMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load clients'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  // --------------------------------------------------
  // FILTER CLIENTS
  // --------------------------------------------------

  const filteredClients = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return clients.filter((client) => {
      const matchesSearch =
        !searchValue ||
        client.name.toLowerCase().includes(searchValue) ||
        client.company
          ?.toLowerCase()
          .includes(searchValue) ||
        client.email
          ?.toLowerCase()
          .includes(searchValue) ||
        client.phone
          ?.toLowerCase()
          .includes(searchValue)

      const matchesStatus =
        !statusFilter ||
        client.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  // --------------------------------------------------
  // OPEN ADD MODAL
  // --------------------------------------------------

  const openAddModal = () => {
    setEditingClient(null)
    setForm(emptyForm)
    setFormMessage('')
    setModalOpen(true)
  }

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------

  const openEditModal = (client: Client) => {
    setEditingClient(client)

    setForm({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      notes: client.notes || '',
      status: client.status,
    })

    setFormMessage('')
    setOpenActionId(null)
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
    setEditingClient(null)
    setForm(emptyForm)
    setFormMessage('')
  }

  // --------------------------------------------------
  // SAVE CLIENT
  // --------------------------------------------------

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    setFormMessage('')

    if (!form.name.trim()) {
      setFormMessage('Client name is required.')
      return
    }

    try {
      setSaving(true)

      const isEditing = editingClient !== null

      const url = isEditing
        ? `${API_URL}/api/clients/${editingClient.id}`
        : `${API_URL}/api/clients`

      const response = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        credentials: 'include',

        body: JSON.stringify({
          name: form.name.trim(),
          company: form.company.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          website: form.website.trim(),
          notes: form.notes.trim(),
          status: form.status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setFormMessage(
          data.message ||
            `Unable to ${
              isEditing ? 'update' : 'create'
            } client`
        )

        return
      }

      setModalOpen(false)
      setEditingClient(null)
      setForm(emptyForm)

      setPageMessageType('success')

      setPageMessage(
        isEditing
          ? 'Client updated successfully'
          : 'Client created successfully'
      )

      await loadClients()
    } catch {
      setFormMessage(
        'Unable to connect to the server'
      )
    } finally {
      setSaving(false)
    }
  }

  // --------------------------------------------------
  // TOGGLE STATUS
  // --------------------------------------------------

  const handleToggleStatus = async (
    client: Client
  ) => {
    const newStatus: ClientStatus =
      client.status === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE'

    setOpenActionId(null)
    setPageMessage('')

    try {
      const response = await fetch(
        `${API_URL}/api/clients/${client.id}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
          },

          credentials: 'include',

          body: JSON.stringify({
            status: newStatus,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setPageMessageType('error')

        setPageMessage(
          data.message ||
            'Unable to update client status'
        )

        return
      }

      setPageMessageType('success')

      setPageMessage(
        newStatus === 'ACTIVE'
          ? 'Client activated successfully'
          : 'Client deactivated successfully'
      )

      await loadClients()
    } catch {
      setPageMessageType('error')

      setPageMessage(
        'Unable to connect to the server'
      )
    }
  }

  return (
    <>
      {/* PAGE HEADER */}

      <PageHeader
        title="Clients"
        description="Manage client information and account status."
        actions={
          <Button
            type="button"
            onClick={openAddModal}
          >
            <Plus size={17} />
            Add Client
          </Button>
        }
      />

      {/* PAGE MESSAGE */}

      {pageMessage && (
        <div className="mb-5">
          <Alert
            type={pageMessageType}
            message={pageMessage}
          />
        </div>
      )}

      {/* CLIENT PANEL */}

      <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* TOOLBAR */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search clients..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
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

            {(search || statusFilter) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* RESULT SUMMARY */}

        <div className="border-b border-slate-100 px-5 py-3">
          <p className="text-xs font-medium text-slate-500">
            {filteredClients.length}{' '}
            {filteredClients.length === 1
              ? 'client'
              : 'clients'}
          </p>
        </div>

        {/* LOADING */}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-r-slate-900" />

              <p className="mt-3 text-sm text-slate-500">
                Loading clients...
              </p>
            </div>
          </div>
        ) : filteredClients.length === 0 ? (
          /* EMPTY STATE */

          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <Building2 size={22} />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              {clients.length === 0
                ? 'No clients yet'
                : 'No clients found'}
            </h3>

            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {clients.length === 0
                ? 'Create your first client to start organising projects and tasks.'
                : 'Try changing your search or status filter.'}
            </p>

            {clients.length === 0 && (
              <Button
                type="button"
                className="mt-5"
                onClick={openAddModal}
              >
                <Plus size={17} />
                Add Client
              </Button>
            )}
          </div>
        ) : (
          /* CLIENT TABLE */

          <div className="overflow-x-auto pb-24">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Client
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contact
                  </th>

                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Website
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
                {filteredClients.map(
                  (client) => (
                    <tr
                      key={client.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      {/* CLIENT */}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            {client.company ? (
                              <Building2 size={18} />
                            ) : (
                              <UserRound size={18} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">
                              {client.name}
                            </p>

                            {client.company && (
                              <p className="mt-0.5 text-sm text-slate-500">
                                {client.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CONTACT */}

                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          {client.email ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail
                                size={14}
                                className="shrink-0 text-slate-400"
                              />

                              <span className="max-w-52 truncate">
                                {client.email}
                              </span>
                            </div>
                          ) : null}

                          {client.phone ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone
                                size={14}
                                className="shrink-0 text-slate-400"
                              />

                              <span>
                                {client.phone}
                              </span>
                            </div>
                          ) : null}

                          {!client.email &&
                            !client.phone && (
                              <span className="text-sm text-slate-400">
                                —
                              </span>
                            )}
                        </div>
                      </td>

                      {/* WEBSITE */}

                      <td className="px-5 py-4">
                        {client.website ? (
                          <a
                            href={
                              client.website.startsWith(
                                'http'
                              )
                                ? client.website
                                : `https://${client.website}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
                          >
                            Visit website
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            client.status ===
                            'ACTIVE'
                              ? 'success'
                              : 'default'
                          }
                        >
                          {client.status ===
                          'ACTIVE'
                            ? 'Active'
                            : 'Inactive'}
                        </Badge>
                      </td>

                      {/* ACTIONS */}

                      <td className="relative px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionId(
                              openActionId ===
                                client.id
                                ? null
                                : client.id
                            )
                          }
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          aria-label={`Actions for ${client.name}`}
                        >
                          <EllipsisVertical
                            size={18}
                          />
                        </button>

                        {openActionId ===
                          client.id && (
                          <div className="absolute right-5 top-12 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  client
                                )
                              }
                              className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              Edit client
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStatus(
                                  client
                                )
                              }
                              className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                            >
                              {client.status ===
                              'ACTIVE'
                                ? 'Deactivate'
                                : 'Activate'}
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

      {/* ADD / EDIT CLIENT MODAL */}

      <Modal
        open={modalOpen}
        title={
          editingClient
            ? 'Edit Client'
            : 'Add Client'
        }
        description={
          editingClient
            ? 'Update the client information below.'
            : 'Add a new client to your workspace.'
        }
        onClose={closeModal}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {formMessage && (
            <div className="mb-5">
              <Alert
                type="error"
                message={formMessage}
              />
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* NAME */}

            <div>
              <label
                htmlFor="client-name"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Client name
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="client-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                placeholder="Client name"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* COMPANY */}

            <div>
              <label
                htmlFor="client-company"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Company
              </label>

              <input
                id="client-company"
                type="text"
                value={form.company}
                onChange={(event) =>
                  setForm({
                    ...form,
                    company:
                      event.target.value,
                  })
                }
                placeholder="Company name"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label
                htmlFor="client-email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Email
              </label>

              <input
                id="client-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                placeholder="client@example.com"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* PHONE */}

            <div>
              <label
                htmlFor="client-phone"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Phone
              </label>

              <input
                id="client-phone"
                type="text"
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value,
                  })
                }
                placeholder="Phone number"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* WEBSITE */}

            <div
              className={
                editingClient
                  ? ''
                  : 'sm:col-span-2'
              }
            >
              <label
                htmlFor="client-website"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Website
              </label>

              <input
                id="client-website"
                type="text"
                value={form.website}
                onChange={(event) =>
                  setForm({
                    ...form,
                    website:
                      event.target.value,
                  })
                }
                placeholder="https://example.com"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {/* STATUS - EDIT ONLY */}

            {editingClient && (
              <div>
                <label
                  htmlFor="client-status"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>

                <select
                  id="client-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,

                      status:
                        event.target
                          .value as ClientStatus,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="ACTIVE">
                    Active
                  </option>

                  <option value="INACTIVE">
                    Inactive
                  </option>
                </select>
              </div>
            )}

            {/* NOTES */}

            <div className="sm:col-span-2">
              <label
                htmlFor="client-notes"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Notes
              </label>

              <textarea
                id="client-notes"
                value={form.notes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    notes: event.target.value,
                  })
                }
                rows={4}
                placeholder="Internal notes about this client..."
                className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* MODAL ACTIONS */}

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={saving}
            >
              {saving
                ? editingClient
                  ? 'Saving...'
                  : 'Creating...'
                : editingClient
                  ? 'Save Changes'
                  : 'Add Client'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

export default ClientManagement