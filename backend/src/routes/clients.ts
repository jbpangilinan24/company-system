import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get all clients
router.get(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const clients = await prisma.client.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.json({
        clients,
      })
    } catch (error) {
      console.error('GET CLIENTS ERROR:', error)

      return res.status(500).json({
        message: 'Unable to retrieve clients',
      })
    }
  }
)

// Create client
router.post(
  '/',
  requireAuth,
  async (req, res) => {
    try {
      const {
        name,
        company,
        email,
        phone,
        website,
        notes,
      } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({
          message: 'Client name is required',
        })
      }

      const client = await prisma.client.create({
        data: {
          name: name.trim(),
          company: company?.trim() || null,
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          website: website?.trim() || null,
          notes: notes?.trim() || null,
          status: 'ACTIVE',
        },
      })

      return res.status(201).json({
        message: 'Client created successfully',
        client,
      })
    } catch (error) {
      console.error('CREATE CLIENT ERROR:', error)

      return res.status(500).json({
        message: 'Unable to create client',
      })
    }
  }
)

// Update client
router.patch(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const clientId = Number(req.params.id)

      if (Number.isNaN(clientId)) {
        return res.status(400).json({
          message: 'Invalid client ID',
        })
      }

      const {
        name,
        company,
        email,
        phone,
        website,
        notes,
        status,
      } = req.body

      if (name !== undefined && !name.trim()) {
        return res.status(400).json({
          message: 'Client name cannot be empty',
        })
      }

      if (
        status !== undefined &&
        status !== 'ACTIVE' &&
        status !== 'INACTIVE'
      ) {
        return res.status(400).json({
          message: 'Invalid client status',
        })
      }

      const existingClient = await prisma.client.findUnique({
        where: {
          id: clientId,
        },
      })

      if (!existingClient) {
        return res.status(404).json({
          message: 'Client not found',
        })
      }

      const client = await prisma.client.update({
        where: {
          id: clientId,
        },
        data: {
          ...(name !== undefined && {
            name: name.trim(),
          }),

          ...(company !== undefined && {
            company: company?.trim() || null,
          }),

          ...(email !== undefined && {
            email: email?.trim() || null,
          }),

          ...(phone !== undefined && {
            phone: phone?.trim() || null,
          }),

          ...(website !== undefined && {
            website: website?.trim() || null,
          }),

          ...(notes !== undefined && {
            notes: notes?.trim() || null,
          }),

          ...(status !== undefined && {
            status,
          }),
        },
      })

      return res.json({
        message: 'Client updated successfully',
        client,
      })
    } catch (error) {
      console.error('UPDATE CLIENT ERROR:', error)

      return res.status(500).json({
        message: 'Unable to update client',
      })
    }
  }
)

export default router