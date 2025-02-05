Page({
  // 复制文本
  copyText(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success'
        });
      }
    });
  },

  // 分享小程序
  onShareAppMessage() {
    return {
      title: '三战配将候 - 三国武将阵容模拟器',
      path: '/pages/battle-config/battle-config'
    };
  }
}); 