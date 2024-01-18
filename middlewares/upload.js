import multer from 'multer'
// 雲端平台套件
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { StatusCodes } from 'http-status-codes'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
})

const upload = multer({
  storage: new CloudinaryStorage({ cloudinary }),
  fileFilter (ref, file, callback) {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      callback(null, true)
    } else {
      // 'LIMIT_FILE_FORMAT' 自訂的 如果有錯誤就判斷這自訂的
      callback(new multer.MulterError('LIMIT_FILE_FORMAT'), false)
    }
  },
  limits: {
    fileSize: 1024 * 1024
  }
})

export default (req, res, next) => {
  // 單檔上傳， 檔案放在 image 的欄位
  upload.single('image')(req, res, error => {
    if (error instanceof multer.MulterError) {
      let message = '上傳錯誤'
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = '檔案太大'
      } else if (error.code === 'LIMIT_FILE_SIZE') {
        message = '檔案格式錯誤'
      }
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message
      })
    } else if (error) {
      console.log(error)
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '未知錯誤'
      })
    } else {
      next()
    }
  })
}
