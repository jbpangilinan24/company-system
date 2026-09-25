import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// --------------------------------------------------
// GET ALL NOTIFICATIONS FOR CURRENT USER
// --------------------------------------------------

router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        req.session.userId

      if (!userId) {
        return res.status(401).json({
          message:
            'Authentication required',
        })
      }

      const notifications =
        await prisma.notification.findMany({
          where: {
            userId,
          },

          orderBy: {
            createdAt: 'desc',
          },

          take: 50,
        })

      return res.json({
        notifications,
      })
    } catch (error) {
      console.error(
        'GET NOTIFICATIONS ERROR:',
        error
      )

      return res.status(500).json({
        message:
          'Unable to load notifications',
      })
    }
  }
)

// --------------------------------------------------
// GET UNREAD COUNT
// --------------------------------------------------

router.get(
  '/unread-count',
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        req.session.userId

      if (!userId) {
        return res.status(401).json({
          message:
            'Authentication required',
        })
      }

      const count =
        await prisma.notification.count({
          where: {
            userId,
            isRead: false,
          },
        })

      return res.json({
        count,
      })
    } catch (error) {
      console.error(
        'GET UNREAD COUNT ERROR:',
        error
      )

      return res.status(500).json({
        message:
          'Unable to load unread notification count',
      })
    }
  }
)

// --------------------------------------------------
// MARK ONE NOTIFICATION AS READ
// --------------------------------------------------

router.patch(
  '/:id/read',
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        req.session.userId

      if (!userId) {
        return res.status(401).json({
          message:
            'Authentication required',
        })
      }

      const notificationId =
        Number(req.params.id)

      if (
        !Number.isInteger(
          notificationId
        ) ||
        notificationId <= 0
      ) {
        return res.status(400).json({
          message:
            'Invalid notification ID',
        })
      }

      /*
       * Important:
       * We check both notification ID
       * and logged-in user ID.
       *
       * This prevents one user from
       * modifying another user's
       * notifications.
       */
      const existingNotification =
        await prisma.notification.findFirst({
          where: {
            id: notificationId,
            userId,
          },
        })

      if (!existingNotification) {
        return res.status(404).json({
          message:
            'Notification not found',
        })
      }

      /*
       * If already read, simply return it.
       * This avoids changing readAt again.
       */
      if (
        existingNotification.isRead
      ) {
        return res.json({
          notification:
            existingNotification,
        })
      }

      const notification =
        await prisma.notification.update({
          where: {
            id: notificationId,
          },

          data: {
            isRead: true,
            readAt: new Date(),
          },
        })

      return res.json({
        notification,
      })
    } catch (error) {
      console.error(
        'MARK NOTIFICATION READ ERROR:',
        error
      )

      return res.status(500).json({
        message:
          'Unable to update notification',
      })
    }
  }
)

// --------------------------------------------------
// MARK ALL NOTIFICATIONS AS READ
// --------------------------------------------------

router.patch(
  '/read-all',
  requireAuth,
  async (req, res) => {
    try {
      const userId =
        req.session.userId

      if (!userId) {
        return res.status(401).json({
          message:
            'Authentication required',
        })
      }

      const result =
        await prisma.notification.updateMany({
          where: {
            userId,
            isRead: false,
          },

          data: {
            isRead: true,
            readAt: new Date(),
          },
        })

      return res.json({
        message:
          'All notifications marked as read',

        updatedCount:
          result.count,
      })
    } catch (error) {
      console.error(
        'MARK ALL NOTIFICATIONS READ ERROR:',
        error
      )

      return res.status(500).json({
        message:
          'Unable to update notifications',
      })
    }
  }
)

export default router