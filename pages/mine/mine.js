// pages/mine/mine.js
const { baseUrl } = require('../../config/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    phoneCode: '',
    showAuthModal: false,
    tempUserInfo: {
      avatarUrl: '',
      nickName: ''
    },
    levelNames: {
      0: '普通',
      1: '白银',
      2: '黄金',
      3: '钻石'
    },
    stats: {
      battles: 0,
      wins: 0,
      generals: 0
    },
    battleStats: {
      winRate: 0,
      winCnt: 0,
      drawCnt: 0,
      loseCnt: 0,
      totalCnt: 0,  // 总场次
      highFreqGenerals: [],  // 常用武将
      highFreqTactics: [],    // 常用战法
      highFreqTeams: []      // 常用阵容
    },
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查是否已经登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo
      });
      // 如果有 WxOpenId，获取用户详情
      if (userInfo.WxOpenId) {
        this.getUserDetail();
      }
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时，如果已登录就获取用户详情
    const userInfo = wx.getStorageSync('userInfo');
    console.log("userInfo", userInfo);
    if (userInfo && userInfo.WxOpenId) {
      this.getUserDetail();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '三战配将侯 - 三国志战略版模拟对战',
      path: '/pages/battle-config/battle-config',
      imageUrl: '/images/share.png',
      success: (res) => {
        // 分享成功的回调
        console.log('分享成功', res);
        wx.showToast({
          title: '分享成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        // 分享失败的回调
        console.log('分享失败', err);
        wx.showToast({
          title: '分享失败',
          icon: 'none'
        });
      },
      complete: () => {
        // 分享完成的回调（无论成功失败）
        console.log('分享操作完成');
      }
    };
  },

  // 登录流程
  onLogin() {
    // 获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        console.log('用户信息:', profileRes.userInfo);
      
        // 获取登录凭证
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              console.log('登录凭证:', loginRes.code);
              
              // 保存临时登录信息
              this.setData({
                tempLoginInfo: {
                  code: loginRes.code,
                  userInfo: profileRes.userInfo
                }
              }, () => {
                // 获取手机号
                wx.getPhoneNumber({
                  success: (res) => {
                    if (res.errMsg === "getPhoneNumber:ok") {
                      this.onGetPhoneNumber({
                        detail: {
                          errMsg: res.errMsg,
                          code: res.code
                        }
                      });
                    }
                  },
                  fail: (err) => {
                    console.log('获取手机号失败:', err);
                  }
                });
              });
            }
          }
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败:', err);
      }
    });
  },

  // 获取手机号回调
  onGetPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      console.log('手机号加密数据:', e.detail);
      
      // 存储手机号授权码并显示用户信息授权弹窗
      this.setData({
        phoneCode: e.detail.code,
        showAuthModal: true
      });
    }
  },

  // 获取户信息
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        console.log('用户信息:', profileRes.userInfo);
        
        // 获取登录凭证
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              console.log('登录凭证:', loginRes.code);
              
              // 请求登录接口
              wx.request({
                url: `${baseUrl}/v1/user/login`,
                method: 'POST',
                data: {
                  Code: loginRes.code,
                  PhoneCode: this.data.phoneCode,
                  NickName: profileRes.userInfo.nickName,
                  AvatarUrl: profileRes.userInfo.avatarUrl
                },
                success: (response) => {
                  console.log('登录接口返回:', response.data);
                  if (response.data.meta.status_code === 0) {
                    const userInfo = {
                      ...profileRes.userInfo,
                      Uid: response.data.UserInfo.Uid,
                      Level: response.data.UserInfo.Level,
                      WxOpenId: response.data.UserInfo.WxOpenId,
                      avatarUrl: profileRes.userInfo.avatarUrl,
                      nickName: profileRes.userInfo.nickName
                    };
                    wx.setStorageSync('userInfo', userInfo);
                    
                    this.setData({
                      userInfo: userInfo,
                      showAuthModal: false,
                      phoneCode: '',
                      tempUserInfo: {
                        avatarUrl: '',
                        nickName: ''
                      }
                    }, () => {
                      // 登录成功后切换到对战页面
                      wx.switchTab({
                        url: '/pages/battle-config/battle-config'
                      });
                    });
                  }
                }
              });
            }
          }
        });
      },
      fail: (err) => {
        console.log('获取用户信息失败:', err);
        this.setData({
          showAuthModal: false
        });
      }
    });
  },

  // 页面跳转
  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (url === '/pages/battle-list/battle-list') {
      // 确保用户登录
      if (!this.data.userInfo) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
    }
    wx.navigateTo({ url });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          
          // 重置页面数据
          this.setData({
            userInfo: null,
            stats: {
              battles: 0,
              wins: 0,
              generals: 0
            }
          });
        }
      }
    });
  },

  // 选择头像
  onChooseAvatar(e) {
    console.log('选择的头像临时径:', e.detail.avatarUrl);
    this.setData({
      'tempUserInfo.avatarUrl': e.detail.avatarUrl
    });
  },

  // 输入昵称
  onInputNickname(e) {
    this.setData({
      'tempUserInfo.nickName': e.detail.value
    });
  },

  // 确认授权
  confirmAuth() {
    if (!this.data.tempUserInfo.avatarUrl || !this.data.tempUserInfo.nickName) {
      wx.showToast({
        title: '请设置头像和昵称',
        icon: 'none'
      });
      return;
    }

    // 获取登录凭证并求登录接口
    wx.login({
      success: (loginRes) => {
        wx.request({
          url: `${baseUrl}/v1/user/login`,
          method: 'POST',
          data: {
            Code: loginRes.code,
            PhoneCode: this.data.phoneCode,
            NickName: this.data.tempUserInfo.nickName,
            AvatarUrl: this.data.tempUserInfo.avatarUrl
          },
          success: (response) => {
            console.log('登录接口返回:', response.data);
            if (response.data.meta.status_code === 0) {
              const userInfo = {
                ...this.data.tempUserInfo,
                Uid: response.data.UserInfo.Uid,
                Level: response.data.UserInfo.Level,
                WxOpenId: response.data.UserInfo.WxOpenId
              };
              wx.setStorageSync('userInfo', userInfo);
              
              this.setData({
                userInfo: userInfo,
                showAuthModal: false,
                phoneCode: '',
                tempUserInfo: {
                  avatarUrl: '',
                  nickName: ''
                }
              }, () => {
                // 登录成功后获取用户详情
                this.getUserDetail();
                wx.switchTab({
                  url: '/pages/battle-config/battle-config'
                });
              });
            }
          },
          fail: (err) => {
            console.error('登录失败:', err);
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 获取用户详情
  getUserDetail() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.WxOpenId) {
      console.log('未登录或无 WxOpenId');
      return;
    }

    // 显示 loading
    this.setData({ loading: true });

    console.log('开始获取用户详情');
    wx.request({
      url: `${baseUrl}/v1/user/detail`,
      method: 'GET',
      data: {
        Uid: userInfo.Uid
      },
      success: (res) => {
        console.log('用户详情数据:', res.data);
        if (res.data.meta.status_code === 0) {
          const battleStats = res.data.BattleStatisticsInfo || {};
          const highFreqGenerals = battleStats.HighFreqGeneralList || [];
          const highFreqTeams = battleStats.HighFreqTeamList || [];
          const highFreqTactics = battleStats.HighFreqTacticsList || [];
          
          // 更新用户数据
          this.setData({
            battleStats: {
              totalCnt: (battleStats.WinCnt || 0) + (battleStats.DrawCnt || 0) + (battleStats.LoseCnt || 0),
              winRate: ((battleStats.WinRate || 0) * 100).toFixed(1),
              winCnt: battleStats.WinCnt || 0,
              drawCnt: battleStats.DrawCnt || 0,
              loseCnt: battleStats.LoseCnt || 0,
              highFreqGenerals: highFreqGenerals.map(item => ({
                name: item.General.Name,
                avatar: item.General.AvatarUrl,
                times: item.Times
              })),
              highFreqTeams: highFreqTeams.map(item => ({
                name: item.BattleTeam.Name,
                times: item.Times,
                generals: item.BattleTeam.BattleGenerals.map(general => ({
                  name: general.BaseInfo.Name,
                  avatar: general.BaseInfo.AvatarUrl
                }))
              })),
              highFreqTactics: highFreqTactics.map(item => ({
                name: item.Tactics.Name,
                times: item.Times
              }))
            }
          });
        }
      },
      fail: (err) => {
        console.error('获取用户详情失败:', err);
      },
      complete: () => {
        // 隐藏 loading
        this.setData({ loading: false });
      }
    });
  },

  // 复制 UID
  copyUid() {
    const uid = this.data.userInfo.Uid;
    wx.setClipboardData({
      data: uid.toString(),
      success: () => {
        wx.showToast({
          title: 'UID已复制',
          icon: 'success'
        });
      }
    });
  },

  // 升级会员
  upgradeVip() {
    // 打开企业微信客服会话
    wx.openCustomerServiceChat({
      extInfo: {
        url: 'https://work.weixin.qq.com/kfid/kfc3dce07ebe79411c5'
      },
      corpId: 'ww955f33d8cd72f288',
      success(res) {
        console.log('打开客服会话成功', res);
      },
      fail(err) {
        console.error('打开客服会话失败', err);
        wx.showToast({
          title: '打开客服失败',
          icon: 'none'
        });
      }
    });
  },

  // 登录请求
  handleLogin() {
    wx.request({
      url: `${baseUrl}/v1/user/login`,
      method: 'POST',
      data: {
        WxCode: this.data.phoneCode,
        NickName: this.data.tempUserInfo.nickName,
        AvatarUrl: this.data.tempUserInfo.avatarUrl
      },
      success: (res) => {
        console.log('登录接口返回:', res.data);
        if (res.data.meta.status_code === 0) {
          const userInfo = {
            ...this.data.tempUserInfo,
            Uid: res.data.UserInfo.Uid,
            Level: res.data.UserInfo.Level,
            WxOpenId: res.data.UserInfo.WxOpenId
          };
          wx.setStorageSync('userInfo', userInfo);
          
          this.setData({
            userInfo: userInfo,
            showAuthModal: false,
            phoneCode: '',
            tempUserInfo: {
              avatarUrl: '',
              nickName: ''
            }
          }, () => {
            // 登录成功后获取用户详情
            this.getUserDetail();
            wx.switchTab({
              url: '/pages/battle-config/battle-config'
            });
          });
        }
      },
      fail: (err) => {
        console.error('登录失败:', err);
        wx.showToast({
          title: '登录失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取用户信息
  getUserInfo() {
    wx.request({
      url: `${baseUrl}/v1/user/info`,
      method: 'GET',
      // ...其他代码保持不变...
    });
  },

  // 更新用户信息
  updateUserInfo() {
    wx.request({
      url: `${baseUrl}/v1/user/update`,
      method: 'POST',
      data: {
        Uid: this.data.userInfo.Uid,
        NickName: this.data.tempUserInfo.nickName,
        AvatarUrl: this.data.tempUserInfo.avatarUrl
      },
      success: (res) => {
        console.log('更新用户信息接口返回:', res.data);
        if (res.data.meta.status_code === 0) {
          const userInfo = {
            ...this.data.tempUserInfo,
            Uid: res.data.UserInfo.Uid,
            Level: res.data.UserInfo.Level,
            WxOpenId: res.data.UserInfo.WxOpenId
          };
          wx.setStorageSync('userInfo', userInfo);
          
          this.setData({
            userInfo: userInfo,
            showAuthModal: false,
            phoneCode: '',
            tempUserInfo: {
              avatarUrl: '',
              nickName: ''
            }
          }, () => {
            // 登录成功后获取用户详情
            this.getUserDetail();
            wx.switchTab({
              url: '/pages/battle-config/battle-config'
            });
          });
        }
      },
      fail: (err) => {
        console.error('更新用户信息失败:', err);
        wx.showToast({
          title: '更新用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  getPhoneNumber(e) {
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      // 获取登录凭证
      wx.login({
        success: (loginRes) => {
          if (loginRes.code) {
            console.log('登录凭证:', loginRes.code);
            
            // 保存临时登录信息并显示用户信息授权弹窗
            this.setData({
              phoneCode: e.detail.code,
              showAuthModal: true
            });
          } else {
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('获取登录凭证失败:', err);
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        }
      });
    } else {
      // 用户拒绝授权
      wx.showToast({
        title: '您拒绝了授权',
        icon: 'none'
      });
    }
  }
})