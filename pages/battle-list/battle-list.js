const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    battleList: [],
    loading: false,
    pageNo: 1,
    hasMore: true
  },

  onLoad() {
    this.loadBattleRecords();
  },

  // 监听下拉触底事件
  onReachBottom() {
    if (this.data.loading || !this.data.hasMore) return;
    this.setData({ 
      pageNo: this.data.pageNo + 1 
    }, () => {
      this.loadBattleRecords(true); // true表示加载更多
    });
  },

  loadBattleRecords(isLoadMore = false) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.Uid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });
    
    wx.request({
      url: `${baseUrl}/v1/battle/list`,
      method: 'GET',
      data: {
        Uid: userInfo.Uid,
        PageNo: this.data.pageNo,
        PageSize: 10
      },
      success: (res) => {
        console.log('对战记录返回:', res.data);
        if (res.data && res.data.Meta && res.data.Meta.status_code === 0) {
          const newList = res.data.BattleRecordList || [];
          newList.forEach(item => {
            if (item.CreateTime) {
              const date = new Date(item.CreateTime * 1000);
              item.formattedTime = this.formatDate(date);
            }
          });
          if (newList.length === 0) {
            this.setData({ hasMore: false });
            if (isLoadMore) {
              wx.showToast({
                title: '没有更多对战记录',
                icon: 'none'
              });
            }
            return;
          }
          this.setData({
            battleList: isLoadMore ? 
              [...this.data.battleList, ...newList] : 
              newList
          });
        } else {
          wx.showToast({
            title: res.data?.meta?.status_msg || '获取失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 查看对战详情
  viewBattleDetail(e) {
    const battleRecord = e.currentTarget.dataset.battle;
    wx.navigateTo({
      url: '/pages/battle-result/battle-result',
      success: (res) => {
        res.eventChannel.emit('acceptBattleDetail', {
          BattleResultStatistics: battleRecord.BattleResultStatistics,
          BattleRecordId: battleRecord.BattleRecordId,
          CreateTime: battleRecord.CreateTime
        });
      }
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  // 点击对战记录
  onBattleItemClick(e) {
    const battleDetail = e.currentTarget.dataset.battle;
    console.log('点击的对战记录数据:', battleDetail);

    // 构造对战结果数据结构，与���拟对战返回的数据结构保持一致
    const battleResultData = {
      meta: {
        status_code: 0,
        status_msg: "成功"
      },
      BattleResultStatistics: {
        FightingTeam: battleDetail.FightingTeam,
        EnemyTeam: battleDetail.EnemyTeam,
        BattleResult: battleDetail.BattleResult,
        BattleRecordId: battleDetail.BattleRecordId,
        CreateTime: battleDetail.CreateTime
      }
    };

    wx.navigateTo({
      url: '/pages/battle-result/battle-result',
      success: (res) => {
        // 通过eventChannel向被打开页面传送数据
        res.eventChannel.emit('acceptBattleDetail', battleResultData);
        console.log('传递给对战结果页面的数据:', battleResultData);
      }
    });
  }
}); 