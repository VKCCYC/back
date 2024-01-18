import users from '../models/users.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import products from '../models/products.js'
import validator from 'validator'

export const create = async (req, res) => {
  try {
    // req.body => 要用 body
    await users.create(req.body)
    res.status(StatusCodes.OK).json({
      // 不用傳資訊只要告知成功就好了
      success: true,
      message: ''
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '帳號已註冊'
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

// 登入
export const login = async (req, res) => {
  try {
    // 第二個是密鑰 => process.env.JWT_SECRET
    // 7 天后過期 =>  { expiresIn: '7 days' }
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens.push(token)
    // 把東西保存
    await req.user.save()
    // 當你前端登入的時候需要什麼使用者資料全部回回去
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        token,
        account: req.user.account,
        email: req.user.email,
        role: req.user.role,
        // 只回傳購物車有幾樣商品
        // 2 個 參數 第一個是 total 第 2 個是 current(目前數字是多少(沒有疊加，純陣列裡面的數))
        cart: req.user.cartQuantity
      }
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

export const logout = async (req, res) => {
  try {
    req.token = req.user.tokens.filter(token => token !== req.token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: ''
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 舊換新
/*
  總體而言，這段程式碼的目的是在使用者物件的 JWT 陣列中更新一個特定的 JWT，然後將更新後的使用者物件保存到資料庫，最後回傳新生成的 JWT 到客戶端。
*/
export const extend = async (req, res) => {
  try {
    // 先找到 token 是陣列中的第幾個
    // 這行程式碼使用 findIndex 方法在 req.user.tokens 這個陣列中找到目前請求中的 JWT (req.token) 的索引。
    // findIndex 方法會遍歷 req.user.tokens 陣列，並回傳第一個符合條件的元素的索引，如果找不到則回傳 -1。
    const idx = req.user.tokens.findIndex(token => token === req.token)
    // 這行程式碼使用 jsonwebtoken（通常簡稱為 JWT）套件的 sign 方法，根據提供的使用者 _id 和環境變數中的密鑰 (process.env.JWT_SECRET) 生成一個新的 JWT。
    // 設置了 JWT 的過期時間為 7 天。
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // 這行程式碼將 req.user.tokens 陣列中原本的 JWT（在索引 idx 的位置）替換成新生成的 JWT
    req.user.tokens[idx] = token
    // 使用 await 等待保存對使用者物件的更改。這可能涉及到將更新後的使用者物件存回資料庫，具體取決於使用的資料庫和 Mongoose 或其他資料存取工具。
    await req.user.save()
    // 最後，回傳一個 JSON 物件到客戶端，表示操作成功。在這裡，token 是新生成的 JWT，也包含了一些其他的資訊，如 success: true 和 message: ''。
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: token
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

// 使用者登入後回傳她的個人資料
// 登入的時候回什麼現在就回什麼
// 不用 token 這些
export const getProfile = (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: {
        account: req.user.account,
        email: req.user.email,
        role: req.user.role,
        cart: req.user.cartQuantity
      }
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}

export const editCart = async (req, res) => {
  try {
    // 檢查商品 id 格式對不對
    if (!validator.isMongoId(req.body.product)) throw new Error('ID')

    // 尋找購物車內有沒有傳入的商品 ID
    const idx = req.user.cart.findIndex(item => item.product.toString() === req.body.product)
    if (idx > -1) {
      // 修改購物車內已有的商品數量
      const quantity = req.user.cart[idx].quantity + parseInt(req.body.quantity)
      // 檢查數量
      // 小於 0，移除
      // 大於 0，修改
      if (quantity <= 0) {
        req.user.cart.splice(idx, 1)
      } else {
        req.user.cart[idx].quantity = quantity
      }
    } else {
      // 檢查商品是否存在或已下架
      const product = await products.findById(req.body.product).orFail(new Error('NOT FOUND'))
      if (!product.sell) {
        throw new Error('NOT FOUND')
      } else {
        req.user.cart.push({
          product: product._id,
          quantity: req.body.quantity
        })
      }
    }
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: req.user.cartQuantity
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError' || error.message === 'ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'ID 格式錯誤'
      })
    } else if (error.message === 'NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查無商品'
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '未知錯誤'
      })
    }
  }
}

export const getCart = async (req, res) => {
  try {
    const result = await users.findById(req.user._id, 'cart').populate('cart.product')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '',
      result: result.cart
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '未知錯誤'
    })
  }
}
