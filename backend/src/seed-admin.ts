import bcrypt from 'bcrypt'
import { prisma } from './prisma.js'

async function createAdmin() {
  // Credentials come from backend/.env (loaded in prisma.ts),
  // never from source code.
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD environment variables must be set'
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  })

  if (existingUser) {
    console.log('Admin user already exists')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.user.create({
    data: {
      name: 'Administrator',
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log('Admin user created successfully')
  console.log(`ID: ${admin.id}`)
  console.log(`Email: ${admin.email}`)
}

createAdmin()
  .catch((error) => {
    console.error('Failed to create admin:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })