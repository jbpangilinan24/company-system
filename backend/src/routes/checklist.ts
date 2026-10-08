import { Router, type Request } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'
import type { Prisma } from '../../generated/prisma/client.js'

// mergeParams lets this router read :taskId from the
// mount path (/api/tasks/:taskId/checklist in server.ts).
const router = Router({ mergeParams: true })

const MAX_CONTENT_LENGTH = 500

// Items are always returned in list order. id breaks ties
// so the order is stable even if two positions match.
const ITEM_ORDER: Prisma.ChecklistItemOrderByWithRelationInput[] = [
  { position: 'asc' },
  { id: 'asc' },
]

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

/*
* Returns a positive whole number, or null.
* Accepts numbers (from JSON bodies) and digit-only
* strings (from URL parameters). Rejects "abc", "1.5",
* "-3", "0" and "".
*/
function parsePositiveId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0
      ? value
      : null
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const id = Number(value)

    return Number.isSafeInteger(id) && id > 0
      ? id
      : null
  }

  return null
}

/*
* :taskId comes from the mount path, which Express's
* types don't know about inside this router, so it's
* read through a plain record.
*/
function getTaskId(req: Request) {
  const params = req.params as Record<string, string | undefined>

  return parsePositiveId(params.taskId)
}

function getItemId(req: Request) {
  const params = req.params as Record<string, string | undefined>

  return parsePositiveId(params.itemId)
}

/*
* Checks checklist text. The returned value is trimmed;
* error is set when the text is invalid.
*/
function validateContent(content: unknown):
  | { value: string; error?: undefined }
  | { value?: undefined; error: string } {
  if (typeof content !== 'string') {
    return { error: 'Checklist item text is required' }
  }

  const value = content.trim()

  if (!value) {
    return { error: 'Checklist item text cannot be empty' }
  }

  if (value.length > MAX_CONTENT_LENGTH) {
    return {
      error: `Checklist item text cannot exceed ${MAX_CONTENT_LENGTH} characters`,
    }
  }

  return { value }
}

async function taskExists(taskId: number) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true },
  })

  return task !== null
}

/*
* Locks the parent task's row until the transaction ends.
*
* Two people adding, deleting or reordering items on the
* same task at the same moment then take turns instead of
* both reading the same positions. Returns false if the
* task doesn't exist.
*/
async function lockTask(
  tx: Prisma.TransactionClient,
  taskId: number
) {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Task" WHERE id = ${taskId} FOR UPDATE
  `

  return rows.length > 0
}

// --------------------------------------------------
// GET CHECKLIST ITEMS
// GET /api/tasks/:taskId/checklist
// --------------------------------------------------

router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const taskId = getTaskId(req)

      if (!taskId) {
        return res.status(400).json({
          message: 'Invalid task ID',
        })
      }

      if (!(await taskExists(taskId))) {
        return res.status(404).json({
          message: 'Task not found',
        })
      }

      const items = await prisma.checklistItem.findMany({
        where: { taskId },
        orderBy: ITEM_ORDER,
      })

      return res.json({
        items,
      })
    } catch (error) {
      console.error('GET CHECKLIST ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve checklist',
      })
    }
  }
)

// --------------------------------------------------
// CREATE CHECKLIST ITEM
// POST /api/tasks/:taskId/checklist
// Body: { content }
// --------------------------------------------------

router.post(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const taskId = getTaskId(req)

      if (!taskId) {
        return res.status(400).json({
          message: 'Invalid task ID',
        })
      }

      const content = validateContent(req.body?.content)

      if (content.error !== undefined) {
        return res.status(400).json({
          message: content.error,
        })
      }

      // Counting the items and creating the new one
      // happen together, so the new position is correct.
      const item = await prisma.$transaction(async (tx) => {
        if (!(await lockTask(tx, taskId))) {
          return null
        }

        // Positions are 0, 1, 2, ... so the next free
        // position equals the current number of items.
        const position = await tx.checklistItem.count({
          where: { taskId },
        })

        return tx.checklistItem.create({
          data: {
            content: content.value,
            position,
            taskId,
          },
        })
      })

      if (!item) {
        return res.status(404).json({
          message: 'Task not found',
        })
      }

      return res.status(201).json({
        message: 'Checklist item created successfully',
        item,
      })
    } catch (error) {
      console.error('CREATE CHECKLIST ITEM ERROR:', error)

      return res.status(500).json({
        message: 'Unable to create checklist item',
      })
    }
  }
)

// --------------------------------------------------
// REORDER CHECKLIST ITEMS
// PUT /api/tasks/:taskId/checklist/reorder
// Body: { itemIds: number[] } in the new order
//
// Defined before /:itemId routes for readability; the
// methods differ (PUT vs PATCH/DELETE), so they can't
// clash anyway.
// --------------------------------------------------

router.put(
  '/reorder',
  requireAuth,
  async (req, res) => {
    try {
      const taskId = getTaskId(req)

      if (!taskId) {
        return res.status(400).json({
          message: 'Invalid task ID',
        })
      }

      const rawItemIds: unknown = req.body?.itemIds

      if (!Array.isArray(rawItemIds)) {
        return res.status(400).json({
          message: 'itemIds must be an array',
        })
      }

      const itemIds = rawItemIds.map(parsePositiveId)

      if (itemIds.some((id) => id === null)) {
        return res.status(400).json({
          message: 'itemIds must contain only valid item IDs',
        })
      }

      const orderedIds = itemIds as number[]

      if (new Set(orderedIds).size !== orderedIds.length) {
        return res.status(400).json({
          message: 'itemIds cannot contain duplicates',
        })
      }

      const result = await prisma.$transaction(async (tx) => {
        if (!(await lockTask(tx, taskId))) {
          return { status: 'TASK_NOT_FOUND' as const }
        }

        const existing = await tx.checklistItem.findMany({
          where: { taskId },
          select: { id: true },
        })

        const existingIds = new Set(
          existing.map((item) => item.id)
        )

        // Same size + every ID belongs to this task
        // (and no duplicates, checked above) means the
        // lists contain exactly the same items.
        const sameItems =
          orderedIds.length === existingIds.size &&
          orderedIds.every((id) => existingIds.has(id))

        if (!sameItems) {
          return { status: 'MISMATCH' as const }
        }

        // Each item's position becomes its index in the
        // new order: 0, 1, 2, ...
        for (const [position, id] of orderedIds.entries()) {
          await tx.checklistItem.update({
            where: { id },
            data: { position },
          })
        }

        const items = await tx.checklistItem.findMany({
          where: { taskId },
          orderBy: ITEM_ORDER,
        })

        return { status: 'OK' as const, items }
      })

      if (result.status === 'TASK_NOT_FOUND') {
        return res.status(404).json({
          message: 'Task not found',
        })
      }

      if (result.status === 'MISMATCH') {
        // 409 Conflict: the request is well-formed but
        // doesn't match the current checklist (e.g. someone
        // else added or deleted an item). Reload and retry.
        return res.status(409).json({
          message:
            'itemIds must include every checklist item for this task exactly once. Reload the checklist and try again.',
        })
      }

      return res.json({
        message: 'Checklist reordered successfully',
        items: result.items,
      })
    } catch (error) {
      console.error('REORDER CHECKLIST ERROR:', error)

      return res.status(500).json({
        message: 'Unable to reorder checklist',
      })
    }
  }
)

// --------------------------------------------------
// UPDATE CHECKLIST ITEM
// PATCH /api/tasks/:taskId/checklist/:itemId
// Body: { content?, isCompleted? }
// --------------------------------------------------

router.patch(
  '/:itemId',
  requireAuth,
  async (req, res) => {
    try {
      const taskId = getTaskId(req)
      const itemId = getItemId(req)

      if (!taskId) {
        return res.status(400).json({
          message: 'Invalid task ID',
        })
      }

      if (!itemId) {
        return res.status(400).json({
          message: 'Invalid checklist item ID',
        })
      }

      const { content, isCompleted } = req.body ?? {}

      if (content === undefined && isCompleted === undefined) {
        return res.status(400).json({
          message: 'Provide content or isCompleted to update',
        })
      }

      let newContent: string | undefined

      if (content !== undefined) {
        const validated = validateContent(content)

        if (validated.error !== undefined) {
          return res.status(400).json({
            message: validated.error,
          })
        }

        newContent = validated.value
      }

      if (
        isCompleted !== undefined &&
        typeof isCompleted !== 'boolean'
      ) {
        return res.status(400).json({
          message: 'isCompleted must be true or false',
        })
      }

      if (!(await taskExists(taskId))) {
        return res.status(404).json({
          message: 'Task not found',
        })
      }

      // Matching on both id AND taskId ensures the item
      // belongs to this task.
      const existingItem = await prisma.checklistItem.findFirst({
        where: {
          id: itemId,
          taskId,
        },
      })

      if (!existingItem) {
        return res.status(404).json({
          message: 'Checklist item not found',
        })
      }

      const item = await prisma.checklistItem.update({
        where: { id: itemId },
        data: {
          ...(newContent !== undefined && {
            content: newContent,
          }),

          ...(isCompleted !== undefined && {
            isCompleted,
          }),
        },
      })

      return res.json({
        message: 'Checklist item updated successfully',
        item,
      })
    } catch (error) {
      console.error('UPDATE CHECKLIST ITEM ERROR:', error)

      return res.status(500).json({
        message: 'Unable to update checklist item',
      })
    }
  }
)

// --------------------------------------------------
// DELETE CHECKLIST ITEM
// DELETE /api/tasks/:taskId/checklist/:itemId
// --------------------------------------------------

router.delete(
  '/:itemId',
  requireAuth,
  async (req, res) => {
    try {
      const taskId = getTaskId(req)
      const itemId = getItemId(req)

      if (!taskId) {
        return res.status(400).json({
          message: 'Invalid task ID',
        })
      }

      if (!itemId) {
        return res.status(400).json({
          message: 'Invalid checklist item ID',
        })
      }

      // Deleting and closing the gap happen together, so
      // positions stay 0, 1, 2, ... with no holes.
      const result = await prisma.$transaction(async (tx) => {
        if (!(await lockTask(tx, taskId))) {
          return 'TASK_NOT_FOUND' as const
        }

        const item = await tx.checklistItem.findFirst({
          where: {
            id: itemId,
            taskId,
          },
        })

        if (!item) {
          return 'ITEM_NOT_FOUND' as const
        }

        await tx.checklistItem.delete({
          where: { id: item.id },
        })

        // Move every later item up by one.
        await tx.checklistItem.updateMany({
          where: {
            taskId,
            position: { gt: item.position },
          },
          data: {
            position: { decrement: 1 },
          },
        })

        return 'DELETED' as const
      })

      if (result === 'TASK_NOT_FOUND') {
        return res.status(404).json({
          message: 'Task not found',
        })
      }

      if (result === 'ITEM_NOT_FOUND') {
        return res.status(404).json({
          message: 'Checklist item not found',
        })
      }

      return res.json({
        message: 'Checklist item deleted successfully',
      })
    } catch (error) {
      console.error('DELETE CHECKLIST ITEM ERROR:', error)

      return res.status(500).json({
        message: 'Unable to delete checklist item',
      })
    }
  }
)

export default router
