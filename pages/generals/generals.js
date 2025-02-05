const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    searchValue: '',
    selectedForce: '全部',
    selectedRank: '全部',
    selectedCost: '全部',
    generals: [],
    pageNo: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    qualityMap: {
      'S': 1,
      'A': 2,
      'B': 3,
      'C': 4
    },
    forceMap: {
      '全部': 0,
      '魏': 1,
      '蜀': 2,
      '吴': 3,
      '群': 4
    },
    characterId: null,
    currentTeam: null,
    selectedGenerals: [],
    currentTeam: ''
  },

  onLoad(options) {
    // 获取上一页的数据
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    const positionInfo = wx.getStorageSync('selectedPosition');
    
    if (positionInfo && prevPage) {
      // 获取当前队伍所有已选择的武将ID
      const currentTeamGenerals = prevPage.data.teams[positionInfo.currentTeam].characters
        .filter(char => char && char.id)  // 过滤掉空位置
        .map(char => char.id);           // 获取所有已选武将的ID

      this.setData({
        characterId: parseInt(options.characterId),
        currentTeam: positionInfo.currentTeam,
        selectedGenerals: currentTeamGenerals  // 保存已选武将ID列表
      });
    }

    this.fetchGenerals();
  },

  // 下拉触底事件
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({
        pageNo: this.data.pageNo + 1
      });
      this.fetchGenerals(true);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value,
      pageNo: 1,
      generals: [],
      hasMore: true
    });
    // 输入时重
    this.fetchGenerals();
  },

  // 选择势力
  selectForce(e) {
    const force = e.currentTarget.dataset.force;
    // 直接检查force是否在forceMapping中存在
    const forceMapping = {
      '魏': 1,
      '蜀': 2,
      '吴': 3,
      '群': 4,
      '全部': 0
    };
    
    if (force in forceMapping) {
      this.setData({ 
        selectedForce: force,  // 保存原始的force值
        pageNo: 1,
        generals: [],
        hasMore: true
      });
      this.fetchGenerals();
    } else {
      console.error('Invalid force value:', force);
    }
  },

  // 选择品质
  selectRank(e) {
    const rank = e.currentTarget.dataset.rank;
    this.setData({ 
      selectedRank: rank,
      pageNo: 1,
      generals: [],
      hasMore: true
    });
    this.fetchGenerals();
  },

  // 选择统御
  selectCost(e) {
    const cost = e.currentTarget.dataset.cost;
    this.setData({ 
      selectedCost: cost,
      pageNo: 1,
      generals: [],
      hasMore: true
    });
    this.fetchGenerals();
  },

  // 获取武将列表
  fetchGenerals(isLoadMore = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    const params = {
      Name: this.data.searchValue || undefined,
      Control: this.data.selectedCost === '全部' ? undefined : 
              this.data.selectedCost === '3御' ? 3 :
              this.data.selectedCost === '4御' ? 4 :
              this.data.selectedCost === '5御' ? 5 :
              this.data.selectedCost === '6御' ? 6 :
              this.data.selectedCost === '7御' ? 7 : undefined,
      Group: this.data.forceMap[this.data.selectedForce],
      Quality: this.data.selectedRank === '全部' ? undefined : 
               this.data.qualityMap[this.data.selectedRank],
      PageNo: parseInt(this.data.pageNo),
      PageSize: parseInt(this.data.pageSize)
    };

    // 构建URL查询参数
    const queryParams = Object.keys(params)
      .filter(key => params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    wx.request({
      url: `${baseUrl}/v1/general/list?${queryParams}`,
      method: 'GET',
      timeout: 5000,  // 5秒超时
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.GeneralList) {
          console.log('API返回的原始数据:', res.data.GeneralList[0]);

          const newData = res.data.GeneralList.map(item => {
            // 处理自带战法数据
            const selfTactic = item.BaseInfo.SelfTactic ? {
              id: item.BaseInfo.SelfTactic.Id,
              name: item.BaseInfo.SelfTactic.Name,
              quality: item.BaseInfo.SelfTactic.Quality,
              rank: this.getQualityRank(item.BaseInfo.SelfTactic.Quality)
            } : null;

            return {
              id: item.BaseInfo.Id,
              name: item.BaseInfo.Name,
              avatar: item.BaseInfo.AvatarUrl,
              force: item.BaseInfo.Group,
              rank: item.BaseInfo.GeneralQuality,
              cost: item.BaseInfo.AbilityAttr.CommandBase,
              selfTactic: selfTactic,
              armsAttr: item.BaseInfo.ArmsAttr || {},
              // 从BaseInfo中获取动态和典藏支持状态
              IsSupportDynamics: item.BaseInfo.IsSupportDynamics || false,
              IsSupportCollect: item.BaseInfo.IsSupportCollect || false
            };
          });

          console.log('处理后的武将数据:', {
            第一个武将: newData[0],
            自带战法: newData[0]?.selfTactic
          });
          
          this.setData({
            generals: isLoadMore ? [...this.data.generals, ...newData] : newData,
            hasMore: newData.length === this.data.pageSize
          });
        } else if (!isLoadMore) {
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({
          title: '网络开小差儿了，请稍后再试～',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  // 选择武将
  selectGeneral(e) {
    const id = e.currentTarget.dataset.id;
    
    // 检查武将是否已被选择
    if (this.data.selectedGenerals.includes(id)) {
      wx.showToast({
        title: '该武将已在当前队伍中',
        icon: 'none'
      });
      return;
    }

    const selectedGeneral = this.data.generals.find(g => g.id === id);
    
    if (selectedGeneral) {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        // 从本地存储获取位置信息
        const positionInfo = wx.getStorageSync('selectedPosition');
        if (!positionInfo) {
          wx.showToast({
            title: '位置信息丢失',
            icon: 'none'
          });
          return;
        }

        // 更新武将数据，同时重置战法和兵书
        const updatedData = {
          id: selectedGeneral.id,
          name: selectedGeneral.name,
          avatar: selectedGeneral.avatar,
          force: selectedGeneral.force,
          rank: selectedGeneral.rank,
          cost: selectedGeneral.cost,
          level: 50,
          power: 10000,
          dots: 0,
          selfTactic: selectedGeneral.selfTactic,
          tactics: [
            { name: '', rank: '' },
            { name: '', rank: '' }
          ],
          books: [],
          troopRank: '',
          armsAttr: selectedGeneral.armsAttr || {},
          // 添加动、典按钮支持状态
          supportDynamics: selectedGeneral.IsSupportDynamics,
          supportCollect: selectedGeneral.IsSupportCollect,
          skillButtons: {
            dian: false,  // 初始状态为未选中
            dong: false
          },
          stats: {
            attack: 0,
            intelligence: 0,
            leadership: 0,
            speed: 0
          }
        };

        // 设置选中的武将数据到上一页
        prevPage.setData({
          selectedGeneral: selectedGeneral,
          currentCharacterIndex: positionInfo.characterIndex,
          currentTeam: positionInfo.currentTeam,
          [`teams.${positionInfo.currentTeam}.characters[${positionInfo.characterIndex}]`]: updatedData
        });

        // 清除本地存储
        wx.removeStorageSync('selectedPosition');
        wx.navigateBack();
      }
    }
  },

  handleQualityChange(e) {
    const quality = e.detail.value;
    const qualityValue = this.data.qualityMap[quality];
    this.setData({
      quality: quality,
      qualityValue: qualityValue
    });
  },

  getQualityLabel(value) {
    const qualityMap = this.data.qualityMap;
    return Object.keys(qualityMap).find(key => qualityMap[key] === value) || '';
  },

  // 添加获取品质等级的方
  getQualityRank(quality) {
    switch (quality) {
      case 1: return 'S';
      case 2: return 'A';
      case 3: return 'B';
      case 4: return 'C';
      default: return '';
    }
  }
}); 