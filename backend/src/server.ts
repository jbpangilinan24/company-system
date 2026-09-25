import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import { prisma } from './prisma.js'
import authRoutes from './routes/auth.js'
import { requireAuth } from './middleware/auth.js'
import { requireAdmin } from './middleware/role.js'
import userRoutes from './routes/users.js'
import clientRoutes from './routes/clients.js'
import projectRoutes from './routes/projects.js'
import taskRoutes from './routes/tasks.js'
import dashboardRoutes from './routes/dashboard.js'
import notificationRoutes from './routes/notifications.js'

const app = express()

const PORT = 3000

app.use(express.json())

const allowedOrigins = [
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // e.g. Postman, curl, server-to-server requests
      if (!origin) {
        return callback(null, true)
      }

      // Allow the configured frontend URL
      if (allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      // Development: allow Vite running on localhost
      if (
        process.env.NODE_ENV !== 'production' &&
        /^http:\/\/localhost:\d+$/.test(origin)
      ) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    credentials: true,
  })
)

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
)

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`

    res.json({
      status: 'ok',
      message: 'Company System API and database are running',
    })
  } catch (error) {
    console.error('DATABASE ERROR:', error)

    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
    })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/clients', clientRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/notifications', notificationRoutes)

app.get('/api/protected', requireAuth, (req, res) => {
  res.json({
    message: 'You are authenticated',
    userId: req.session.userId,
  })
})

app.get(
  '/api/admin-only',
  requireAuth,
  requireAdmin,
  (req, res) => {
    res.json({
      message: 'You have Admin access',
    })
  }
)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})