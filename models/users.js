import { Schema, model, ObjectId } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'
import UserRole from '../enums/UserRole.js'

// 購物車
const cartSchema = new Schema({
  product: {
    type: ObjectId,
    ref: 'products',
    required: [true, '缺少商品欄位']
  },
  quantity: {
    type: Number,
    required: [true, '缺少商品數量']
  }
})

const schema = new Schema({
  // 帳號
  account: {
    type: String,
    required: [true, '缺少使用者帳號'],
    minlength: [4, '使用者帳號長度不符'],
    maxlength: [20, '使用者帳號長度不符'],
    unique: true,
    validate: {
      validator (value) {
        return validator.isAlphanumeric(value)
      },
      message: '使用者帳號格式錯誤'
    }
  },
  // 信箱
  email: {
    type: String,
    required: [true, '缺少使用者信箱'],
    unique: true,
    validate: {
      validator (value) {
        return validator.isEmail(value)
      },
      message: '使用者信箱格式錯誤'
    }
  },
  // 密碼
  password: {
    type: String,
    required: [true, '缺少使用者密碼']
    // 密碼驗證放別的地方
  },
  /*
    使用了类似 Mongoose 的库。
    "tokens" 属性可能用于存储字符串数组，
    "cart" 用于存储购物车信息，
    而 "role" 用于存储表示用户角色或权限级别的数字值。
  */
  tokens: {
    // [String] => 文字陣列
    type: [String]
  },
  cart: {
    type: [cartSchema]
  },
  // 管理員或是會員 用 數字 代替
  role: {
    type: Number,
    default: UserRole.USER
  }
}, {
  // 紀錄資料日期
  // 有建立日期跟更新日期
  timestamps: true,
  // 不紀錄被更改幾次
  versionKey: false
})

// 建立一個虛擬的欄位
schema.virtual('cartQuantity')
  .get(function () {
    return this.cart.reduce((total, current) => {
      return total + current.quantity
    }, 0)
  })

/*
  進資料庫前執行一個 function 要一般的
  this = 要保存進去的資料
  user 如果要進到密碼欄位
  驗證密碼對不對
*/
schema.pre('save', function (next) {
  const user = this
  if (user.isModified('password')) {
    if (user.password.length < 4 || user.password.length > 20) {
      const error = new Error.ValidationError(null)
      error.addError('password', new Error.ValidatorError({ message: '密碼長度不符' }))
      next(error)
      return
    } else {
      user.password = bcrypt.hashSync(user.password, 10)
    }
  }
  next()
})

export default model('users', schema)
