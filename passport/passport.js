import passport from 'passport'
import passportLocal from 'passport-local'
import passportJWT from 'passport-jwt'
import bcrypt from 'bcrypt'
import users from '../models/users.js'

passport.use('login', new passportLocal.Strategy({
  usernameField: 'account',
  passwordField: 'password'
}, async (account, password, done) => {
  try {
    // 尋找傳入的帳號
    const user = await users.findOne({ account })
    // 如果沒找到
    if (!user) {
      throw new Error('ACCOUNT')
    }
    // 如果有找到
    // 前端請求來的 password
    if (!bcrypt.compareSync(password, user.password)) {
      throw new Error('PASSWORD')
    }
    return done(undefined, user)
    // 都行
    // return done(null, user, null)
  } catch (error) {
    console.log(error)
    if (error.message === 'ACCOUNT') {
      return done(null, null, { message: '帳號不存在' })
    } else if (error.message === 'PASSWORD') {
      return done(null, null, { message: '密碼錯誤' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))

// 做 JWT 驗證
passport.use('jwt', new passportJWT.Strategy({
  jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  passReqToCallback: true,
  // 略過過期檢查
  ignoreExpiration: true
}, async (req, payload, done) => {
  try {
  // 驗證成功才會到這 (JWT 過期的也能進來)

    // get time() 可以取得目前的時間戳記 (毫秒)
    // JWT 裡面的過期資料是秒

    // 檢查過期
    // jwt 過期時間單位是秒，node.js 日期單位是毫秒
    const expired = payload.exp * 1000 < new Date().getTime()

    /*
      http://localhost:4000/users/test?aaa=111&bbb=2
      req.originalUrl = /users/test?aaa=111&bbb=2
      req.baseUrl = /users
      req.path = /test
      req.query = { aaa: 111, bbb: 222 }
    */

    const url = req.baseUrl + req.path

    // 如果我過期了而且我的路徑不是使用者登出或是 /users/extend 的話，我們拋出一個錯誤
    // 我們只允許舊換新的路徑，跟登出的路徑 其他都不行
    if (expired && url !== '/users/extend' && url !== '/users/logout') {
      throw new Error('EXPIRED')
    }

    // const token = req.headers.authorization.split(' ')

    // 這行程式碼使用 Passport-JWT 策略，從 HTTP 請求的授權標頭（Authorization header）中提取 JWT。
    // passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken() 是一個 Passport-JWT 提供的方法，它告訴 Passport 使用 Bearer 模式從授權標頭中提取 JWT。
    // (req) 表示使用當前的 HTTP 請求對象（req）進行提取
    const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    // 這行程式碼使用提取到的 JWT 中的 payload _id 屬性，以及在使用者（users）集合中查找具有相符 _id 和 tokens 的使用者。
    // 這裡可能是一個 MongoDB 或類似的資料庫查詢，使用 findOne 方法。
    const user = await users.findOne({ _id: payload._id, tokens: token })
    // 如果沒有找到符合條件的使用者，則拋出一個錯誤，錯誤訊息是 'JWT'。
    // 這表示JWT驗證失敗，因為無法找到與提取的JWT相關聯的使用者。
    if (!user) {
      throw new Error('JWT')
    }

    return done(null, { user, token }, null)
  } catch (error) {
    console.log(error)
    if (error.message === 'EXPIRED') {
      return done(null, null, { message: 'JWT 過期' })
    } else if (error.message === 'JWT') {
      return done(null, null, { message: 'JWT 無效' })
    } else {
      return done(null, null, { message: '未知錯誤' })
    }
  }
}))
