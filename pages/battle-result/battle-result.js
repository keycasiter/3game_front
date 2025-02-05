const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    battleDetail: null,
    loading: false
  },

  onLoad(options) {
    // 获取对战结果数据
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('acceptBattleDetail', (data) => {
      console.log('接收到的对战数据:', data);
      this.setData({ battleDetail: data });
    });
  },

  // 重新对战
  reBattle() {
    this.setData({ loading: true });
    
    wx.request({
      url: `${baseUrl}/v1/battle/replay`,
      method: 'POST',
      data: {
        BattleRecordId: this.data.battleDetail.BattleRecordId
      },
      success: (res) => {
        if (res.data && res.data.meta && res.data.meta.status_code === 0) {
          this.setData({
            battleDetail: res.data
          });
        } else {
          wx.showToast({
            title: res.data?.meta?.status_msg || '重新对战失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('重新对战请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  }
}); 