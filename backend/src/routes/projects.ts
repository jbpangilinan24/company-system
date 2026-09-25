import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get all projects
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const projects = await prisma.project.findMany({
        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.json({
        projects,
      })
    } catch (error) {
      console.error('GET PROJECTS ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve projects',
      })
    }
  }
)

// Create project
router.post(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const {
        name,
        description,
        status,
        startDate,
        dueDate,
        clientId,
      } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: 'Project name is required',
        })
      }

      const parsedClientId = Number(clientId)

      if (!clientId || Number.isNaN(parsedClientId)) {
        return res.status(400).json({
          message: 'Client is required',
        })
      }

      const validStatuses = [
        'PLANNING',
        'ACTIVE',
        'ON_HOLD',
        'COMPLETED',
      ]

      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Invalid project status',
        })
      }

      const client = await prisma.client.findUnique({
        where: {
          id: parsedClientId,
        },
      })

      if (!client) {
        return res.status(404).json({
          message: 'Client not found',
        })
      }

      if (
        startDate &&
        dueDate &&
        new Date(dueDate) < new Date(startDate)
      ) {
        return res.status(400).json({
          message: 'Due date cannot be before the start date',
        })
      }

      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          status: status || 'PLANNING',
          startDate: startDate
            ? new Date(startDate)
            : null,
          dueDate: dueDate
            ? new Date(dueDate)
            : null,
          clientId: parsedClientId,
        },

        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      })

      return res.status(201).json({
        message: 'Project created successfully',
        project,
      })
    } catch (error) {
      console.error('CREATE PROJECT ERROR:', error)

      return res.status(500).json({
        message: 'Unable to create project',
      })
    }
  }
)

// Update project
router.patch(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const projectId = Number(req.params.id)

      if (Number.isNaN(projectId)) {
        return res.status(400).json({
          message: 'Invalid project ID',
        })
      }

      const {
        name,
        description,
        status,
        startDate,
        dueDate,
        clientId,
      } = req.body

      const existingProject = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      })

      if (!existingProject) {
        return res.status(404).json({
          message: 'Project not found',
        })
      }

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({
          message: 'Project name cannot be empty',
        })
      }

      const validStatuses = [
        'PLANNING',
        'ACTIVE',
        'ON_HOLD',
        'COMPLETED',
      ]

      if (
        status !== undefined &&
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          message: 'Invalid project status',
        })
      }

      let parsedClientId: number | undefined

      if (clientId !== undefined) {
        parsedClientId = Number(clientId)

        if (Number.isNaN(parsedClientId)) {
          return res.status(400).json({
            message: 'Invalid client ID',
          })
        }

        const client = await prisma.client.findUnique({
          where: {
            id: parsedClientId,
          },
        })

        if (!client) {
          return res.status(404).json({
            message: 'Client not found',
          })
        }
      }

      const finalStartDate =
        startDate !== undefined
          ? startDate
            ? new Date(startDate)
            : null
          : existingProject.startDate

      const finalDueDate =
        dueDate !== undefined
          ? dueDate
            ? new Date(dueDate)
            : null
          : existingProject.dueDate

      if (
        finalStartDate &&
        finalDueDate &&
        finalDueDate < finalStartDate
      ) {
        return res.status(400).json({
          message: 'Due date cannot be before the start date',
        })
      }

      const project = await prisma.project.update({
        where: {
          id: projectId,
        },

        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),

          ...(description !== undefined && {
            description: description?.trim() || null,
          }),

          ...(status !== undefined && {
            status,
          }),

          ...(startDate !== undefined && {
            startDate: startDate
              ? new Date(startDate)
              : null,
          }),

          ...(dueDate !== undefined && {
            dueDate: dueDate
              ? new Date(dueDate)
              : null,
          }),

          ...(parsedClientId !== undefined && {
            clientId: parsedClientId,
          }),
        },

        include: {
          client: {
            select: {
              id: true,
              name: true,
              company: true,
            },
          },
        },
      })

      return res.json({
        message: 'Project updated successfully',
        project,
      })
    } catch (error) {
      console.error('UPDATE PROJECT ERROR:', error)

      return res.status(500).json({
        message: 'Unable to update project',
      })
    }
  }
)

export default router