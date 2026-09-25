import { Router } from 'express'
import bcrypt from 'bcrypt'
import { prisma } from '../prisma.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    })

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        message: 'Your account is inactive',
      })
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password',
      })
    }

    req.session.userId = user.id
    req.session.role = user.role

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('LOGIN ERROR:', error)

    return res.status(500).json({
      message: 'Something went wrong',
    })
  }
})

router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        message: 'Not authenticated',
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.session.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    })

    if (!user) {
      return res.status(401).json({
        message: 'User not found',
      })
    }

    return res.json({
      user,
    })
  } catch (error) {
    console.error('AUTH ME ERROR:', error)

    return res.status(500).json({
      message: 'Something went wrong',
    })
  }
})

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error('LOGOUT ERROR:', error)

      return res.status(500).json({
        message: 'Could not log out',
      })
    }

    res.clearCookie('connect.sid')

    return res.json({
      message: 'Logout successful',
    })
  })
})

export default router