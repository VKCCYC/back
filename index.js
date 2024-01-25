import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import routeUsers from './routes/users.js'
import routeProducts from './routes/products.js'
import routeOrders from './routes/orders.js'
import { StatusCodes } from 'http-status-codes'
import mongoSanitize from 'express-mongo-sanitize'
import './passport/passport.js'

const app = express()

app.use(mongoSanitize())

/* 新的東西 設定請求 */
app.use(cors({
  // origin = 請求的來源
  // callback(錯誤, 是否允許)
  // posman origin 是 undefined
  origin (origin, callback) {
    // 如果我們來源是 undefined 或是 github 或是 localhost
    // 可以更詳細到 github.io.自己帳號 這種地步
    // 跨域通常都是瀏覽器問題
    // 後端沒有跨域問題
    // 後端請求通常不帶 origin
    if (origin === undefined || origin.includes('github') || origin.includes('localhost')) {
      // 允許請求
      callback(null, true)
    } else {
      callback(new Error('CORS'), false)
    }
  }
}))

app.use((_, req, res, next) => {
  // 403 我知道你是誰但你沒有權利
  // 跨域被拒絕
  res.status(StatusCodes.FORBIDDEN).json({
    success: false,
    message: '請求被拒絕'
  })
})
/* 請求到這 */

app.use(express.json())

app.use((_, req, res, next) => {
  // 別人 json 錯誤
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: '資料格式錯誤'
  })
})

app.use('/users', routeUsers)
app.use('/products', routeProducts)
app.use('/orders', routeOrders)

// all() 所有的請求方式
// * 任意請求的任意方式
app.all('*', (req, res) => {
  // 讓其中沒有寫的路徑直接回應 404
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '找不到'
  })
})

// 如果雲端有指定就用指定的沒有就用 4000
app.listen(process.env.PORT || 4000, async () => {
  console.log('伺服器啟動')
  await mongoose.connect(process.env.DB_URL)
  /*
    具体来说，当设置 sanitizeFilter 为 true 时，Mongoose 会在查询和返回文档时过滤掉敏感字段。
    这通常包括在模型定义中标记为敏感或私有的字段。通过启用过滤器，你可以确保这些字段的值在查询结果和文档返回中被隐藏或过滤掉。
    这对于在查询数据库时控制敏感数据的可见性是有用的，特别是在涉及用户隐私和安全性的应用程序中。
    请注意，确切的行为可能取决于 Mongoose 版本，因此建议查阅相关版本的文档以获取详细信息。
  */
  mongoose.set('sanitizeFilter', true)
  console.log('資料庫連線成功')
})
