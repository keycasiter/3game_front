Page({
  data: {
    qrCodeUrl: '/images/group-qr.jpg',  // 企业微信群二维码图片
    showQrCode: false
  },

  // 显示二维码弹窗
  showQrCodePopup() {
    this.setData({
      showQrCode: true
    });
  },

  // 隐藏二维码弹窗
  hideQrCodePopup() {
    this.setData({
      showQrCode: false
    });
  },

  // 保存二维码到相册
  saveQrCode() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.qrCodeUrl,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      },
      fail: (err) => {
        if (err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  }
}); 