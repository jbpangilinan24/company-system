import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// --------------------------------------------------
// GET DASHBOARD SUMMARY
// Admin + Member
// --------------------------------------------------

router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const [
        clients,
        projects,
        tasks,
        todo,
        inProgress,
        review,
        completed,
      ] = await Promise.all([
        prisma.client.count(),

        prisma.project.count(),

        prisma.task.count(),

        prisma.task.count({
          where: {
            status: 'TODO',
          },
        }),

        prisma.task.count({
          where: {
            status: 'IN_PROGRESS',
          },
        }),

        prisma.task.count({
          where: {
            status: 'REVIEW',
          },
        }),

        prisma.task.count({
          where: {
            status: 'COMPLETED',
          },
        }),
      ])

      return res.json({
        clients,
        projects,
        tasks,

        // Files module will be connected later.
        files: 0,

        taskStats: {
          todo,
          inProgress,
          review,
          completed,
        },
      })
    } catch (error) {
      console.error('GET DASHBOARD ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve dashboard data',
      })
    }
  }
)

export default router