import UserRole from '../enums/UserRole.js'
import { StatusCodes } from 'http-status-codes'

export default (req, res, next) => {
  // 如果不是管理員 就回沒有權限
  if (req.user.role !== UserRole.ADMIN) {
    res.status(StatusCodes.FORBIDDEN).json({
      message: '沒有權限'
    })
  } else {
    next()
  }
}
