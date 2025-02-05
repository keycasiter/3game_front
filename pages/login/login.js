Page({
  data: {
    userInfo: null
  },

  onLoad() {
    // 检查是否已经登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
    }
  },

  // 处理登录
  handleLogin() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        // 保存用户信息
        wx.setStorageSync('userInfo', userInfo);
        this.setData({
          userInfo: userInfo
        });
      },
      fail: (err) => {
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  // 开始使用
  handleStart() {
    // 跳转到首页
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  // 显示用户协议
  showUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement'
    });
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
}); 