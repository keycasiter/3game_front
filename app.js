App({
  globalData: {
    userInfo: null
  },
  onLaunch() {
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    this.globalData.userInfo = userInfo;
    
    // 如果在我的页面且未登录，不需要跳转
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (!userInfo && (!currentPage || currentPage.route !== 'pages/mine/mine')) {
      // 未登录时跳转到"我的"页面
      wx.switchTab({
        url: '/pages/mine/mine'
      });
    }
    this.checkUpdate()
  },
  checkUpdate() {
    // 检查更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate(function (res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function () {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: function (res) {
                if (res.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
        }
      })
    }
  },
  getUserInfo() {
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo
            }
          })
        }
      }
    })
  }
}) 