import { Router } from 'express'
// 有註冊跟 login
import { create, login, logout, extend, getProfile, editCart, getCart } from '../controllers/users.js'
import * as auth from '../middlewares/auth.js'

const router = Router()
router.post('/', create)
router.post('/login', auth.login, login)
router.delete('/logout', auth.jwt, logout)
// 舊換新
router.patch('/extend', auth.jwt, extend)
// 取自己資料
router.get('/me', auth.jwt, getProfile)
router.patch('/cart', auth.jwt, editCart)
router.get('/cart', auth.jwt, getCart)

export default router
