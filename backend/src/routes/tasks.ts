import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { sanitizeDescription } from '../utils/sanitizeDescription.js'

const router = Router()

// Description must be a string, null or omitted.
function isValidDescription(description: unknown) {
  return (
    description === undefined ||
    description === null ||
    typeof description === 'string'
  )
}

const validStatuses = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
]

const validPriorities = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
]

// --------------------------------------------------
// GET ALL TASKS
// --------------------------------------------------

router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const tasks = await prisma.task.findMany({
        include: {
          project: {
            select: {
              id: true,
              name: true,

              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.json({
        tasks,
      })
    } catch (error) {
      console.error('GET TASKS ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve tasks',
      })
    }
  }
)

// --------------------------------------------------
// CREATE TASK
// --------------------------------------------------

router.post(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const {
        title,
        description,
        status,
        priority,
        dueDate,
        projectId,
        assignedToId,
      } = req.body

      // Validate title

      if (!title || !title.trim()) {
        return res.status(400).json({
          message: 'Task title is required',
        })
      }

      if (!isValidDescription(description)) {
        return res.status(400).json({
          message: 'Invalid task description',
        })
      }

      // Validate project

      const parsedProjectId = Number(projectId)

      if (!projectId || Number.isNaN(parsedProjectId)) {
        return res.status(400).json({
          message: 'Project is required',
        })
      }

      const project = await prisma.project.findUnique({
        where: {
          id: parsedProjectId,
        },
      })

      if (!project) {
        return res.status(404).json({
          message: 'Project not found',
        })
      }

      // Validate status

      if (
        status &&
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          message: 'Invalid task status',
        })
      }

      // Validate priority

      if (
        priority &&
        !validPriorities.includes(priority)
      ) {
        return res.status(400).json({
          message: 'Invalid task priority',
        })
      }

      // Validate assigned user

      let parsedAssignedToId: number | null = null

      if (
        assignedToId !== undefined &&
        assignedToId !== null &&
        assignedToId !== ''
      ) {
        parsedAssignedToId = Number(assignedToId)

        if (Number.isNaN(parsedAssignedToId)) {
          return res.status(400).json({
            message: 'Invalid assigned user',
          })
        }

        const assignedUser = await prisma.user.findUnique({
          where: {
            id: parsedAssignedToId,
          },
        })

        if (!assignedUser) {
          return res.status(404).json({
            message: 'Assigned user not found',
          })
        }

        if (assignedUser.status !== 'ACTIVE') {
          return res.status(400).json({
            message: 'Cannot assign a task to an inactive user',
          })
        }
      }

      // Create task

      const task = await prisma.task.create({
        data: {
          title: title.trim(),
          description: sanitizeDescription(
            description ?? null
          ),
          status: status || 'TODO',
          priority: priority || 'NORMAL',
          dueDate: dueDate
            ? new Date(dueDate)
            : null,

          projectId: parsedProjectId,
          assignedToId: parsedAssignedToId,
        },

        include: {
          project: {
            select: {
              id: true,
              name: true,

              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      })

      // --------------------------------------------------
      // CREATE ASSIGNMENT NOTIFICATION
      // --------------------------------------------------

      if (task.assignedToId) {
        await prisma.notification.create({
          data: {
            type: 'TASK_ASSIGNED',
            title: 'New task assigned',
            message: `You were assigned "${task.title}" in ${task.project.name}.`,
            userId: task.assignedToId,
            taskId: task.id,
            projectId: task.projectId,
          },
        })
      }

      return res.status(201).json({
        message: 'Task created successfully',
        task,
      })
    } catch (error) {
      console.error('CREATE TASK ERROR:', error)

      return res.status(500).json({
        message: 'Unable to create task',
      })
    }
  }
)

// --------------------------------------------------
// UPDATE TASK
// --------------------------------------------------

router.patch(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const taskId = Number(req.params.id)

      if (Number.isNaN(taskId)) {
        return res.status(400).json({
          message: 'Invalid task ID',
        })
      }

      const existingTask = await prisma.task.findUnique({
        where: {
          id: taskId,
        },
      })

      if (!existingTask) {
        return res.status(404).json({
          message: 'Task not found',
        })
      }

      const {
        title,
        description,
        status,
        priority,
        dueDate,
        projectId,
        assignedToId,
      } = req.body

      // Validate title

      if (
        title !== undefined &&
        !title.trim()
      ) {
        return res.status(400).json({
          message: 'Task title cannot be empty',
        })
      }

      if (!isValidDescription(description)) {
        return res.status(400).json({
          message: 'Invalid task description',
        })
      }

      // Validate status

      if (
        status !== undefined &&
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          message: 'Invalid task status',
        })
      }

      // Validate priority

      if (
        priority !== undefined &&
        !validPriorities.includes(priority)
      ) {
        return res.status(400).json({
          message: 'Invalid task priority',
        })
      }

      // Validate project

      let parsedProjectId: number | undefined

      if (projectId !== undefined) {
        parsedProjectId = Number(projectId)

        if (Number.isNaN(parsedProjectId)) {
          return res.status(400).json({
            message: 'Invalid project ID',
          })
        }

        const project = await prisma.project.findUnique({
          where: {
            id: parsedProjectId,
          },
        })

        if (!project) {
          return res.status(404).json({
            message: 'Project not found',
          })
        }
      }

      // Validate assigned user

      let parsedAssignedToId:
        | number
        | null
        | undefined

      if (assignedToId !== undefined) {
        if (
          assignedToId === null ||
          assignedToId === ''
        ) {
          parsedAssignedToId = null
        } else {
          parsedAssignedToId = Number(assignedToId)

          if (Number.isNaN(parsedAssignedToId)) {
            return res.status(400).json({
              message: 'Invalid assigned user',
            })
          }

          const assignedUser =
            await prisma.user.findUnique({
              where: {
                id: parsedAssignedToId,
              },
            })

          if (!assignedUser) {
            return res.status(404).json({
              message: 'Assigned user not found',
            })
          }

          if (assignedUser.status !== 'ACTIVE') {
            return res.status(400).json({
              message:
                'Cannot assign a task to an inactive user',
            })
          }
        }
      }

      // Update task

      const task = await prisma.task.update({
        where: {
          id: taskId,
        },

        data: {
          ...(title !== undefined && {
            title: title.trim(),
          }),

          ...(description !== undefined && {
            description:
              sanitizeDescription(description),
          }),

          ...(status !== undefined && {
            status,
          }),

          ...(priority !== undefined && {
            priority,
          }),

          ...(dueDate !== undefined && {
            dueDate: dueDate
              ? new Date(dueDate)
              : null,
          }),

          ...(parsedProjectId !== undefined && {
            projectId: parsedProjectId,
          }),

          ...(parsedAssignedToId !== undefined && {
            assignedToId: parsedAssignedToId,
          }),
        },

        include: {
          project: {
            select: {
              id: true,
              name: true,

              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      })

      // --------------------------------------------------
      // CREATE REASSIGNMENT NOTIFICATION
      // --------------------------------------------------

      const assigneeChanged =
        parsedAssignedToId !== undefined &&
        parsedAssignedToId !== null &&
        parsedAssignedToId !== existingTask.assignedToId

      if (
        assigneeChanged &&
        parsedAssignedToId !== undefined &&
        parsedAssignedToId !== null
      ) {
        await prisma.notification.create({
          data: {
            type: 'TASK_ASSIGNED',
            title: 'New task assigned',
            message: `You were assigned "${task.title}" in ${task.project.name}.`,
            userId: parsedAssignedToId,
            taskId: task.id,
            projectId: task.projectId,
          },
        })
      }

      return res.json({
        message: 'Task updated successfully',
        task,
      })
    } catch (error) {
      console.error('UPDATE TASK ERROR:', error)

      return res.status(500).json({
        message: 'Unable to update task',
      })
    }
  }
)

export default router