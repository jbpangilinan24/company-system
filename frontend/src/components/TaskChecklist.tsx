import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'

import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { CSS } from '@dnd-kit/utilities'

import {
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'

import { API_URL } from '../config/api'

import Alert from './ui/Alert'
import ConfirmModal from './ui/ConfirmModal'

// Must match MAX_CONTENT_LENGTH in backend/src/routes/checklist.ts
const MAX_CONTENT_LENGTH = 500

type ChecklistItem = {
  id: number
  content: string
  isCompleted: boolean
  position: number
  taskId: number
  createdAt: string
  updatedAt: string
}

type TaskChecklistProps = {
  taskId: number
}

// --------------------------------------------------
// API HELPER
// --------------------------------------------------

// An error that remembers the HTTP status, so we can
// react to specific codes such as 409 Conflict.
class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/*
* Sends a request with the session cookie and returns
* the parsed JSON. Throws ApiError for non-2xx responses.
*/
async function requestJson<T>(
  url: string,
  options: {
    method?: string
    body?: unknown
  } = {}
): Promise<T> {
  const response = await fetch(url, {
    method: options.method || 'GET',
    credentials: 'include',

    ...(options.body !== undefined && {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body),
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      data.message || 'Request failed',
      response.status
    )
  }

  return data as T
}

// Turns any caught error into a message for the user.
function getErrorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : 'Unable to connect to the server'
}

// --------------------------------------------------
// TASK CHECKLIST
// --------------------------------------------------

/*
* Checklist for one task. Render it with key={taskId} so
* switching to another task starts with fresh state.
*/
function TaskChecklist({
  taskId,
}: TaskChecklistProps) {
  const checklistUrl = `${API_URL}/api/tasks/${taskId}/checklist`

  const [items, setItems] = useState<ChecklistItem[]>([])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Increase to load the checklist again (Retry, 409).
  const [reloadKey, setReloadKey] = useState(0)

  // Error from the most recent action (add, edit, ...).
  const [actionError, setActionError] = useState('')

  // Add item
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit item
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')

  /*
  * Enter and Escape already finish editing, and the input
  * then disappears, which can also fire onBlur. This flag
  * stops that blur from saving a second time.
  */
  const skipBlurSave = useRef(false)

  // Delete item
  const [deleteItem, setDeleteItem] = useState<ChecklistItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // --------------------------------------------------
  // LOAD
  // --------------------------------------------------

  useEffect(() => {
    /*
    * If the component unmounts (drawer closed) before the
    * request finishes, ignore the late response.
    */
    let cancelled = false

    const load = async () => {
      try {
        const data = await requestJson<{
          items: ChecklistItem[]
        }>(checklistUrl)

        if (!cancelled) {
          setItems(data.items)
          setLoadError('')
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [checklistUrl, reloadKey])

  const reload = () => {
    setLoading(true)
    setReloadKey((current) => current + 1)
  }

  // --------------------------------------------------
  // ADD
  // --------------------------------------------------

  const addItem = async () => {
    const content = newContent.trim()

    if (!content || adding) {
      return
    }

    try {
      setAdding(true)
      setActionError('')

      const data = await requestJson<{
        item: ChecklistItem
      }>(checklistUrl, {
        method: 'POST',
        body: { content },
      })

      setItems((current) => [...current, data.item])
      setNewContent('')
    } catch (error) {
      setActionError(getErrorMessage(error))
    } finally {
      setAdding(false)
    }
  }

  const handleNewItemKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addItem()
    }
  }

  // --------------------------------------------------
  // CHECK / UNCHECK (optimistic)
  // --------------------------------------------------

  const toggleItem = async (item: ChecklistItem) => {
    const isCompleted = !item.isCompleted

    // Helper to set this item's checkbox state.
    const setCompleted = (value: boolean) =>
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, isCompleted: value }
            : currentItem
        )
      )

    // Update the screen first, then save.
    setCompleted(isCompleted)
    setActionError('')

    try {
      await requestJson(`${checklistUrl}/${item.id}`, {
        method: 'PATCH',
        body: { isCompleted },
      })
    } catch (error) {
      // Roll back to the previous state.
      setCompleted(item.isCompleted)
      setActionError(getErrorMessage(error))
    }
  }

  // --------------------------------------------------
  // EDIT (optimistic)
  // --------------------------------------------------

  const startEditing = (item: ChecklistItem) => {
    skipBlurSave.current = false
    setEditingId(item.id)
    setEditingContent(item.content)
  }

  const cancelEditing = () => {
    skipBlurSave.current = true
    setEditingId(null)
  }

  const saveEditing = async (item: ChecklistItem) => {
    skipBlurSave.current = true
    setEditingId(null)

    const content = editingContent.trim()

    // Unchanged: nothing to save.
    if (content === item.content) {
      return
    }

    if (!content) {
      setActionError(
        'Checklist item text cannot be empty. Delete the item instead.'
      )
      return
    }

    const setContent = (value: string) =>
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, content: value }
            : currentItem
        )
      )

    setContent(content)
    setActionError('')

    try {
      await requestJson(`${checklistUrl}/${item.id}`, {
        method: 'PATCH',
        body: { content },
      })
    } catch (error) {
      // Roll back to the original text.
      setContent(item.content)
      setActionError(getErrorMessage(error))
    }
  }

  const handleEditKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    item: ChecklistItem
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveEditing(item)
    }

    if (event.key === 'Escape') {
      // Don't let any other Escape handler (such as a
      // modal's) react to this key press.
      event.preventDefault()
      event.stopPropagation()
      cancelEditing()
    }
  }

  const handleEditBlur = (item: ChecklistItem) => {
    if (skipBlurSave.current) {
      return
    }

    // Clicking elsewhere saves, like ClickUp.
    saveEditing(item)
  }

  // --------------------------------------------------
  // DELETE (after confirmation)
  // --------------------------------------------------

  const openDeleteModal = (item: ChecklistItem) => {
    setDeleteError('')
    setDeleteItem(item)
  }

  const closeDeleteModal = () => {
    if (!deleteLoading) {
      setDeleteItem(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteItem) {
      return
    }

    try {
      setDeleteLoading(true)
      setDeleteError('')

      await requestJson(`${checklistUrl}/${deleteItem.id}`, {
        method: 'DELETE',
      })

      setItems((current) =>
        current.filter(
          (currentItem) => currentItem.id !== deleteItem.id
        )
      )

      setDeleteItem(null)
    } catch (error) {
      setDeleteError(getErrorMessage(error))
    } finally {
      setDeleteLoading(false)
    }
  }

  // --------------------------------------------------
  // REORDER (drag-and-drop, optimistic)
  // --------------------------------------------------

  /*
  * Sensors are the input methods that can start a drag.
  * - PointerSensor: mouse, pen and touch. Moving 5px is
  *   required first, so a simple click isn't a drag.
  * - KeyboardSensor: focus the handle, press Space to
  *   pick up, arrow keys to move, Space to drop, Escape
  *   to cancel.
  */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    // Dropped outside the list, or in the same place.
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const previousOrder = items.map((item) => item.id)
    const reordered = arrayMove(items, oldIndex, newIndex)

    // Show the new order immediately, then save.
    setItems(reordered)
    setActionError('')

    try {
      await requestJson(`${checklistUrl}/reorder`, {
        method: 'PUT',
        body: {
          itemIds: reordered.map((item) => item.id),
        },
      })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Someone else changed this checklist. Load the
        // latest version instead of guessing.
        setActionError(
          'This checklist was changed elsewhere. The latest version has been loaded.'
        )
        reload()
        return
      }

      // Roll back to the previous order.
      setItems((current) =>
        [...current].sort(
          (a, b) =>
            previousOrder.indexOf(a.id) -
            previousOrder.indexOf(b.id)
        )
      )

      setActionError(getErrorMessage(error))
    }
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  const completedCount = items.filter((item) => item.isCompleted).length

  const progress = items.length
    ? Math.round((completedCount / items.length) * 100)
    : 0

  return (
    <section className="mt-8 border-t border-slate-100 pt-6">
      {/* HEADER + PROGRESS */}

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">
          Checklist
        </h3>

        {items.length > 0 && (
          <span className="text-xs font-medium text-slate-500">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100
                ? 'bg-emerald-500'
                : 'bg-slate-900'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {actionError && (
        <div className="mt-3">
          <Alert
            type="error"
            message={actionError}
          />
        </div>
      )}

      {/* CONTENT */}

      {loading ? (
        <div className="mt-3 px-1 py-4 text-sm text-slate-500">
          Loading checklist...
        </div>
      ) : loadError ? (
        <div className="mt-3 space-y-3">
          <Alert
            type="error"
            message={loadError}
          />

          <button
            type="button"
            onClick={reload}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">
              No checklist items yet.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="mt-3 space-y-1">
                  {items.map((item) => (
                    <SortableChecklistRow
                      key={item.id}
                      item={item}
                      isEditing={editingId === item.id}
                      editingContent={editingContent}
                      onEditingContentChange={setEditingContent}
                      onToggle={() => toggleItem(item)}
                      onStartEditing={() => startEditing(item)}
                      onEditKeyDown={(event) =>
                        handleEditKeyDown(event, item)
                      }
                      onEditBlur={() => handleEditBlur(item)}
                      onDelete={() => openDeleteModal(item)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {/* ADD ITEM */}

          <div className="mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 transition focus-within:bg-slate-50">
            <Plus
              size={16}
              className="shrink-0 text-slate-400"
            />

            <input
              type="text"
              value={newContent}
              onChange={(event) => setNewContent(event.target.value)}
              onKeyDown={handleNewItemKeyDown}
              maxLength={MAX_CONTENT_LENGTH}
              disabled={adding}
              placeholder="Add an item and press Enter"
              aria-label="New checklist item"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-60"
            />
          </div>
        </>
      )}

      <ConfirmModal
        open={deleteItem !== null}
        title="Delete checklist item?"
        message={
          deleteItem
            ? `Are you sure you want to delete "${deleteItem.content}"? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Item"
        loading={deleteLoading}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={closeDeleteModal}
      />
    </section>
  )
}

// --------------------------------------------------
// SORTABLE ROW
// --------------------------------------------------

type SortableChecklistRowProps = {
  item: ChecklistItem
  isEditing: boolean
  editingContent: string
  onEditingContentChange: (value: string) => void
  onToggle: () => void
  onStartEditing: () => void
  onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onEditBlur: () => void
  onDelete: () => void
}

/*
* One checklist row. useSortable connects it to the
* drag-and-drop system: it provides the props for the
* drag handle and the movement (transform) to apply while
* items are being rearranged.
*/
function SortableChecklistRow({
  item,
  isEditing,
  editingContent,
  onEditingContentChange,
  onToggle,
  onStartEditing,
  onEditKeyDown,
  onEditBlur,
  onDelete,
}: SortableChecklistRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`group flex items-center gap-2 rounded-lg px-1 py-1.5 sm:px-2 ${
        isDragging
          ? 'relative z-10 bg-white shadow-lg ring-1 ring-slate-200'
          : 'hover:bg-slate-50'
      }`}
    >
      {/* DRAG HANDLE: only this starts a drag, so the
          text and checkbox stay clickable. touch-none
          stops the page from scrolling while dragging on
          touch screens. */}

      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder "${item.content}"`}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 focus-visible:text-slate-500 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>

      <input
        type="checkbox"
        checked={item.isCompleted}
        onChange={onToggle}
        aria-label={`Mark "${item.content}" as ${
          item.isCompleted ? 'not completed' : 'completed'
        }`}
        className="h-4 w-4 shrink-0 cursor-pointer accent-slate-900"
      />

      {isEditing ? (
        <input
          type="text"
          value={editingContent}
          onChange={(event) =>
            onEditingContentChange(event.target.value)
          }
          onKeyDown={onEditKeyDown}
          onBlur={onEditBlur}
          maxLength={MAX_CONTENT_LENGTH}
          autoFocus
          aria-label="Edit checklist item"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      ) : (
        <button
          type="button"
          onClick={onStartEditing}
          title="Click to edit"
          className={`min-w-0 flex-1 break-words rounded-md px-2 py-1 text-left text-sm transition hover:bg-white ${
            item.isCompleted
              ? 'text-slate-400 line-through'
              : 'text-slate-700'
          }`}
        >
          {item.content}
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete "${item.content}"`}
        className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600 focus-visible:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </li>
  )
}

export default TaskChecklist
