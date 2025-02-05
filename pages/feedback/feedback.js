const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    content: '',
    contact: ''
  },

  // 输入反馈内容
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 输入联系方式
  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  // 提交反馈
  submitFeedback() {
    if (!this.data.content) {
      wx.showToast({
        title: '请填写反馈内容',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '提交中'
    });

    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.Uid) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: `${baseUrl}/v1/feedback/submit`,
      method: 'POST',
      data: {
        Uid: userInfo.Uid,
        Content: this.data.content,
        Contact: this.data.contact
      },
      success: (res) => {
        if (res.data && res.data.meta && res.data.meta.status_code === 0) {
          wx.showToast({
            title: '提交成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: '提交失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('提交反馈失败:', err);
        wx.showToast({
          title: '提交失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  }
}); 