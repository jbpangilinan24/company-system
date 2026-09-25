import type { NextFunction, Request, Response } from 'express'

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.session.role !== 'ADMIN') {
    res.status(403).json({
      message: 'Admin access required',
    })
    return
  }

  next()
}