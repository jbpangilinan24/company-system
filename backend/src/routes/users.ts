import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/role.js'
import bcrypt from 'bcrypt'

const router = Router()

const MIN_PASSWORD_LENGTH = 8

// --------------------------------------------------
// GET ACTIVE USERS FOR TASK ASSIGNMENT
// Admin + Member
// --------------------------------------------------

router.get(
  '/assignable',
  requireAuth,
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      return res.json({
        users,
      })
    } catch (error) {
      console.error('GET ASSIGNABLE USERS ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve assignable users',
      })
    }
  }
)

// --------------------------------------------------
// GET ALL USERS
// Admin only
// --------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.json({
        users,
      })
    } catch (error) {
      console.error('GET USERS ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve users',
      })
    }
  }
)

// --------------------------------------------------
// CREATE USER
// Admin only
// --------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role = 'MEMBER',
      } = req.body

      if (!name || !email || !password) {
        return res.status(400).json({
          message:
            'Name, email and password are required',
        })
      }

      // trim() is only used for this check; the password
      // itself is hashed unchanged.
      if (
        typeof password === 'string' &&
        password.trim() === ''
      ) {
        return res.status(400).json({
          message: 'Password cannot contain only whitespace',
        })
      }

      if (
        typeof password !== 'string' ||
        password.length < MIN_PASSWORD_LENGTH
      ) {
        return res.status(400).json({
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        })
      }

      if (role !== 'ADMIN' && role !== 'MEMBER') {
        return res.status(400).json({
          message: 'Invalid user role',
        })
      }

      const normalizedEmail = email
        .trim()
        .toLowerCase()

      const existingUser =
        await prisma.user.findUnique({
          where: {
            email: normalizedEmail,
          },
        })

      if (existingUser) {
        return res.status(409).json({
          message:
            'A user with this email already exists',
        })
      }

      const passwordHash = await bcrypt.hash(
        password,
        12
      )

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      })

      return res.status(201).json({
        message: 'User created successfully',
        user,
      })
    } catch (error) {
      console.error('CREATE USER ERROR:', error)

      return res.status(500).json({
        message: 'Unable to create user',
      })
    }
  }
)

// --------------------------------------------------
// UPDATE USER
// Admin only
// --------------------------------------------------

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id)

      const {
        name,
        email,
        role,
        status,
        password,
      } = req.body

      if (Number.isNaN(userId)) {
        return res.status(400).json({
          message: 'Invalid user ID',
        })
      }

      if (
        role &&
        role !== 'ADMIN' &&
        role !== 'MEMBER'
      ) {
        return res.status(400).json({
          message: 'Invalid user role',
        })
      }

      if (
        status &&
        status !== 'ACTIVE' &&
        status !== 'INACTIVE'
      ) {
        return res.status(400).json({
          message: 'Invalid user status',
        })
      }

      const existingUser =
        await prisma.user.findUnique({
          where: {
            id: userId,
          },
        })

      if (!existingUser) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      if (
        req.session.userId === userId &&
        status === 'INACTIVE'
      ) {
        return res.status(400).json({
          message:
            'You cannot deactivate your own account',
        })
      }

      if (
        req.session.userId === userId &&
        role === 'MEMBER'
      ) {
        return res.status(400).json({
          message:
            'You cannot change your own Admin role',
        })
      }

      let normalizedEmail: string | undefined

      if (email !== undefined) {
        normalizedEmail = email
          .trim()
          .toLowerCase()

        if (!normalizedEmail) {
          return res.status(400).json({
            message: 'Email cannot be empty',
          })
        }

        const duplicateUser =
          await prisma.user.findFirst({
            where: {
              email: normalizedEmail,
              NOT: {
                id: userId,
              },
            },
          })

        if (duplicateUser) {
          return res.status(409).json({
            message:
              'A user with this email already exists',
          })
        }
      }

      if (
        name !== undefined &&
        !name.trim()
      ) {
        return res.status(400).json({
          message: 'Name cannot be empty',
        })
      }

      // Blank or missing password keeps the existing one.
      // The password is hashed as-is (not trimmed).
      let passwordHash: string | undefined

      if (
        password !== undefined &&
        password !== null &&
        password !== ''
      ) {
        // trim() is only used for this check; the password
        // itself is hashed unchanged.
        if (
          typeof password === 'string' &&
          password.trim() === ''
        ) {
          return res.status(400).json({
            message: 'Password cannot contain only whitespace',
          })
        }

        if (
          typeof password !== 'string' ||
          password.length < MIN_PASSWORD_LENGTH
        ) {
          return res.status(400).json({
            message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
          })
        }

        passwordHash = await bcrypt.hash(
          password,
          12
        )
      }

      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),

          ...(normalizedEmail !== undefined && {
            email: normalizedEmail,
          }),

          ...(role !== undefined && {
            role,
          }),

          ...(status !== undefined && {
            status,
          }),

          ...(passwordHash !== undefined && {
            passwordHash,
          }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return res.json({
        message: 'User updated successfully',
        user,
      })
    } catch (error) {
      console.error('UPDATE USER ERROR:', error)

      return res.status(500).json({
        message: 'Unable to update user',
      })
    }
  }
)

// --------------------------------------------------
// DELETE USER
// Admin only
// --------------------------------------------------

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.params.id)

      if (Number.isNaN(userId)) {
        return res.status(400).json({
          message: 'Invalid user ID',
        })
      }

      // Prevent the logged-in Admin from deleting
      // their own account.
      if (req.session.userId === userId) {
        return res.status(400).json({
          message:
            'You cannot delete your own account',
        })
      }

      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          _count: {
            select: {
              assignedTasks: true,
            },
          },
        },
      })

      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        })
      }

      // Don't delete users who still have tasks.
      if (user._count.assignedTasks > 0) {
        return res.status(400).json({
          message:
            'This user has assigned tasks. Reassign or unassign their tasks before deleting the user.',
        })
      }

      await prisma.user.delete({
        where: {
          id: userId,
        },
      })

      return res.json({
        message: 'User deleted successfully',
      })
    } catch (error) {
      console.error('DELETE USER ERROR:', error)

      return res.status(500).json({
        message: 'Unable to delete user',
      })
    }
  }
)

export default router