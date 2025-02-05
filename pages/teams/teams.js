const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    searchValue: '',
    forces: ['全部', '魏', '蜀', '吴', '群'],
    forceMap: {
      '全部': 0,
      '魏': 1,
      '蜀': 2,
      '吴': 3,
      '群': 4
    },
    arms: ['全部', '骑兵', '盾兵', '弓兵', '枪兵'],
    armMap: {
      '全部': 0,
      '骑兵': 1,
      '盾兵': 2,
      '弓兵': 3,
      '枪兵': 4
    },
    selectedForce: '全部',
    selectedArm: '全部',
    filteredTeams: [],
    loading: false,
    currentTeam: null
  },

  onLoad() {
    // 获取来源队伍信息
    const positionInfo = wx.getStorageSync('selectedPosition');
    if (positionInfo) {
      this.setData({
        currentTeam: positionInfo.currentTeam
      });
    }
    
    console.log('推荐阵容页面加载 - 当前队伍:', this.data.currentTeam);
    this.fetchTeams();
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value
    });
    this.fetchTeams();
  },

  // 选择势力
  selectForce(e) {
    // 如果正在加载中，不允许切换
    if (this.data.loading) return;
    
    const force = e.currentTarget.dataset.force;
    this.setData({
      selectedForce: force
    });
    this.fetchTeams();
  },

  // 选择兵种
  selectArm(e) {
    // 如果正在加载中，不允许切换
    if (this.data.loading) return;
    
    const arm = e.currentTarget.dataset.arm;
    this.setData({
      selectedArm: arm
    });
    this.fetchTeams();
  },

  // 获取推荐阵容
  fetchTeams() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    const params = {
      PageNo: 1,
      PageSize: 50,
      Name: this.data.searchValue || '',
      Group: this.data.forceMap[this.data.selectedForce],
      ArmType: this.data.armMap[this.data.selectedArm]
    };

    console.log('获取推荐阵容 - 请求参数:', params);

    wx.request({
      url: `${baseUrl}/v1/rec_team/list`,
      method: 'GET',
      timeout: 5000,
      data: params,
      success: (res) => {
        console.log('获取推荐阵容 - 响应:', res.data);
        if (res.statusCode === 200 && res.data.meta && res.data.meta.status_code === 0) {
          // 请求成功，但需要判断数据是否为空
          const recTeamList = res.data.RecTeamGeneralList || [];
          if (recTeamList.length > 0) {
            this.setData({
              filteredTeams: recTeamList
            });
          } else {
            this.setData({ filteredTeams: [] });
            wx.showToast({
              title: '未找到匹配的阵容',
              icon: 'none'
            });
          }
        } else {
          wx.showToast({
            title: res.data?.meta?.status_msg || '获取阵容失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取推荐阵容失败:', err);
        // 网络错误时清空列表并显示暂无数据
        this.setData({
          teams: [],
          filteredTeams: [],
          showEmpty: true
        });
      },
      complete: () => {
        setTimeout(() => {
          this.setData({ loading: false });
        }, 500);
      }
    });
  },

  // 选择阵容
  selectTeam(e) {
    try {
      const team = e.currentTarget.dataset.team;
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (!prevPage) {
        wx.showToast({
          title: '数据异常',
          icon: 'none'
        });
        return;
      }

      // 使用保存的currentTeam
      const currentTeam = this.data.currentTeam;
      console.log('选择阵容 - 数据:', {
        当前队伍: currentTeam,
        推荐阵容: team
      });

      // 品质到等级的映射
      const qualityToRank = {
        1: 'S',
        2: 'A',
        3: 'B',
        4: 'C'
      };

      // 兵种到ArmsAttr字段的映射
      const armTypeToAttr = {
        1: 'Cavalry',    // 骑兵
        2: 'Mauler',     // 盾兵
        3: 'Archers',    // 弓兵
        4: 'Spearman'    // 枪兵
      };

      // 兵种映射
      const armTypeToTroop = {
        1: '骑兵',
        2: '盾兵',
        3: '弓兵',
        4: '枪兵'
      };

      // 处理接口返回的推荐阵容数据
      const characters = team.GeneralList.map(general => {
        // 获取兵种适性等级
        let troopRank = '';
        if (team.ArmType && general.BaseInfo.ArmsAttr) {
          const attrField = armTypeToAttr[team.ArmType];
          if (attrField && general.BaseInfo.ArmsAttr[attrField]) {
            troopRank = qualityToRank[general.BaseInfo.ArmsAttr[attrField]] || '';
          }
        }

        return {
          id: general.BaseInfo.Id,
          name: general.BaseInfo.Name,
          avatar: general.BaseInfo.AvatarUrl,
          force: general.BaseInfo.Group,
          rank: general.BaseInfo.GeneralQuality,
          cost: general.BaseInfo.AbilityAttr?.CommandBase || 0,
          level: 50,
          power: 10000,
          dots: 0,
          selfTactic: general.BaseInfo.SelfTactic ? {
            id: general.BaseInfo.SelfTactic.Id,
            name: general.BaseInfo.SelfTactic.Name,
            quality: general.BaseInfo.SelfTactic.Quality,
            rank: qualityToRank[general.BaseInfo.SelfTactic.Quality] || ''
          } : { name: '', rank: '' },
          tactics: general.EquipTactics && general.EquipTactics.length > 0 ? 
            general.EquipTactics.map(tactic => ({
              id: tactic.Id,
              name: tactic.Name,
              quality: tactic.Quality,
              rank: qualityToRank[tactic.Quality] || ''
            })) : [
              { name: '', rank: '' },
              { name: '', rank: '' }
            ],
          books: general.WarBooks ? general.WarBooks.map(book => ({
            id: book.Id,
            name: book.Name
          })) : [],
          troopRank: troopRank,
          armsAttr: general.BaseInfo.ArmsAttr || {},
          skillButtons: {
            dian: general.BaseInfo.IsSupportCollect === true,
            dong: general.BaseInfo.IsSupportDynamics === true
          },
          stats: {
            attack: general.BaseInfo.AbilityAttr?.ForceBase || 0,
            intelligence: general.BaseInfo.AbilityAttr?.IntelligenceBase || 0,
            leadership: general.BaseInfo.AbilityAttr?.CommandBase || 0,
            speed: general.BaseInfo.AbilityAttr?.SpeedBase || 0
          },
          // 处理特技数据
          specialTechs: general.SpecialTechs ? general.SpecialTechs.map(tech => ({
            id: tech.Id,
            name: tech.Name,
            type: tech.Type,
            level: tech.Level
          })) : [],
          supportCollect: general.BaseInfo.IsSupportCollect,
          supportDynamics: general.BaseInfo.IsSupportDynamics
        };
      });

      // 更新对应队伍的数据
      const updateData = {
        [`teams.${currentTeam}.characters`]: characters,
        [currentTeam === 'team1' ? 'selectedTroop' : 'enemySelectedTroop']: armTypeToTroop[team.ArmType] || ''
      };

      console.log('更新数据:', updateData);

      // 更新上一页数据
      prevPage.setData(updateData);

      // 返回上一页
      wx.navigateBack();
    } catch (error) {
      console.error('选择阵容失败:', error);
      wx.showToast({
        title: '选择失败',
        icon: 'none'
      });
    }
  },

  onNavTap(e) {
    const type = e.currentTarget.dataset.type;
    switch(type) {
      case 'general':
        wx.navigateTo({ url: '/pages/generals/generals' });
        break;
      case 'tactic':
        wx.navigateTo({ url: '/pages/tactics/tactics' });
        break;
      case 'team':
        wx.navigateTo({ url: '/pages/teams/teams' });
        break;
      // 移除 rank 相关的跳转
    }
  }
}); 