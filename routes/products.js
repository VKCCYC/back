import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import { create, getAll, edit, get, getId } from '../controllers/products.js'
import upload from '../middlewares/upload.js'
import admin from '../middlewares/admin.js'

const router = Router()

// 先驗證 jwt 有沒有登入， 再驗證是不是管理員，有權限在上傳建立
router.post('/', auth.jwt, admin, upload, create)
// 有登入而且是管理員才能看所有德商品
router.get('/all', auth.jwt, admin, getAll)
router.patch('/:id', auth.jwt, admin, upload, edit)
router.get('/', get)
router.get('/:id', getId)

export default router
