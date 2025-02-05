const baseURL = 'https://api.example.com'

const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseURL}${url}`,
      ...options,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject(res)
        }
      },
      fail: reject
    })
  })
}

export default request 