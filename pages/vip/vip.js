const { baseUrl } = require('../../config/api.js');

Page({
  // 处理支付
  handlePayment() {
    wx.showLoading({
      title: '正在创建订单'
    });

    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.WxOpenId) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 调用后端创建订单接口
    wx.request({
      url: `${baseUrl}/v1/order/create`,
      method: 'POST',
      data: {
        WxOpenId: userInfo.WxOpenId,
        ProductId: 'vip_permanent'  // 商品ID
      },
      success: (res) => {
        console.log('创建订单返回:', res.data);
        
        if (res.data && res.data.meta && res.data.meta.status_code === 0 && res.data.PayParams) {
          const payParams = res.data.PayParams;
          
          // 调用微信支付
          wx.requestPayment({
            timeStamp: payParams.timeStamp,
            nonceStr: payParams.nonceStr,
            package: payParams.package,
            signType: 'MD5',
            paySign: payParams.paySign,
            success: () => {
              // 支付成功后查询订单状态
              this.checkOrderStatus(res.data.OrderId);
            },
            fail: (err) => {
              console.error('支付失败:', err);
              wx.showToast({
                title: '支付失败',
                icon: 'none'
              });
            }
          });
        } else {
          wx.showToast({
            title: '创建订单失败',
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
        wx.hideLoading();
      }
    });
  },

  // 检查订单状态
  checkOrderStatus(orderId) {
    wx.showLoading({
      title: '正在确认支付'
    });

    const checkOrder = () => {
      wx.request({
        url: `${baseUrl}/v1/order/status`,
        method: 'GET',
        data: {
          OrderId: orderId
        },
        success: (res) => {
          if (res.data && res.data.meta && res.data.meta.status_code === 0) {
            if (res.data.Status === 'SUCCESS') {
              // 支付成功,更新用户等级
              const userInfo = wx.getStorageSync('userInfo');
              userInfo.Level = 1;
              wx.setStorageSync('userInfo', userInfo);
              
              wx.showToast({
                title: '支付成功',
                icon: 'success'
              });
              
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            } else if (res.data.Status === 'PENDING') {
              // 继续查询
              setTimeout(() => {
                checkOrder();
              }, 1000);
            } else {
              wx.showToast({
                title: '支付失败',
                icon: 'none'
              });
            }
          }
        },
        fail: (err) => {
          console.error('查询订单失败:', err);
          wx.showToast({
            title: '查询订单失败',
            icon: 'none'
          });
        },
        complete: () => {
          wx.hideLoading();
        }
      });
    };

    checkOrder();
  },

  onShareAppMessage() {
    return {
      title: '三战配将候 - 三国武将阵容模拟器',
      path: '/pages/battle-config/battle-config'  // 修改为对战页面路径
    };
  }
}); 