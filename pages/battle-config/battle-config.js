const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    currentTeam: 'team1',
    selectedTroop: '',  // 我方兵种选择
    enemySelectedTroop: '',  // 敌方兵种选择
    teams: {
      team1: {
        characters: [
          { level: 50, power: 10000 },
          { level: 50, power: 10000 },
          { level: 50, power: 10000 }
        ]
      },
      team2: {
        characters: [
          { level: 50, power: 10000 },
          { level: 50, power: 10000 },
          { level: 50, power: 10000 }
        ]
      }
    },
    recommendTeamInfo: null,  // 添加推荐阵容信息
    currentCharacterIndex: null,
    selectedGeneral: null,
    showStatsPopup: false,
    tempStats: {
      attack: 0,
      intelligence: 0,
      leadership: 0,
      speed: 0
    },
    showPageLoading: false,
    showResetPopup: false,
    characterList: []
  },

  getSpecialTechsNames(specialTechs) {
    console.log('getSpecialTechsNames 接收到的数据:', specialTechs);
    if (!specialTechs || !specialTechs.length) {
      console.log('特技数据为空或长度为0');
      return '';
    }
    const names = specialTechs.map(tech => {
      console.log('处理单个特技:', tech);
      // 确保使用小写的 name
      return tech.name;
    }).join('、');
    console.log('拼接后的特技名称:', names);
    return names;
  },

  onLoad() {
    // 初始化武将数据
    const defaultCharacterData = {
      level: 50,
      power: 10000,
      tactics: [
        { name: '', rank: '' },
        { name: '', rank: '' }
      ],
      books: [],
      troopRank: '',
      armsAttr: {},
      stats: {
        attack: 0,
        intelligence: 0,
        leadership: 0,
        speed: 0
      },
      skillNumber: 0
    };

    // 初始化两个队伍的数据
    const teams = {
      team1: {
        characters: Array(3).fill().map(() => ({...defaultCharacterData}))
      },
      team2: {
        characters: Array(3).fill().map(() => ({...defaultCharacterData}))
      }
    };

    // 设置默认为我方队伍
    const currentTeam = 'team1';
    console.log('首页加载 - 当前队伍:', currentTeam);

    this.setData({ 
      teams,
      currentTeam
    });

    // 保存到本地存储
    wx.setStorageSync('currentTeam', currentTeam);
  },

  // 一键满红
  maxUpgrade() {
    const team = this.data.teams[this.data.currentTeam];
    const characters = team.characters;
    
    // 根据当前队伍判断检查类型
    const checkType = this.data.currentTeam === 'team1' ? 'my' : 'enemy';
    if (!this.checkTeamValid(checkType)) {
      return;
    }

    // 创建一个更新对象
    const updatedCharacters = characters.map((character, index) => {
      // 如果没有选择武将，保持原样
      if (!this.isGeneralSelected(index)) return character;

      // 根据IsSupportDynamics和IsSupportCollect的值设置按钮状态
      const skillButtons = {
        ...character.skillButtons,  // 保留原有状态
        dian: character.supportCollect === true,  // 如果支持典藏则选中
        dong: character.supportDynamics === true   // 如果支持动态则选中
      };

      return {
        ...character,
        dots: 5,  // 设置进阶为5
        skillButtons
      };
    });

    // 更新数据
    this.setData({
      [`teams.${this.data.currentTeam}.characters`]: updatedCharacters
    });
  },

  // 一键白板
  resetCharacter() {
    const currentTeam = this.data.currentTeam;
    const characters = this.data.teams[currentTeam].characters;
    
    // 检查当前队伍是否有武将
    const hasGenerals = characters.some(char => char.name);
    if (!hasGenerals) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }
    
    // 创建一个更新对象
    const updatedCharacters = characters.map(character => {
      if (!character.name) return character; // 如果没有选择武将，保持原样
      
      return {
        ...character,
        dots: 0,  // 重置进阶星星为0
        skillButtons: {  // 重置典和动钮为未选中
          dian: false,
          dong: false
        },
        skillNumber: 0,  // 清空特技数值
        stats: {  // 重置属性值
          attack: 0,
          intelligence: 0,
          leadership: 0,
          speed: 0
        }
      };
    });

    // 更新数据
    this.setData({
      [`teams.${currentTeam}.characters`]: updatedCharacters
    });
  },

  // 开始模拟对战
  startSimulation(e) {
    const type = e.currentTarget.dataset.type;
    
    // 检查双方队伍是否已配置
    if (!this.checkTeamValid('both')) {
      return;
    }
    
    // 获取登录用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.Uid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    if (type === '1') {
      // 构造请求参数
      const requestData = {
        Uid: userInfo.Uid,  // 使用登录用户的uid
        FightingTeam: {
          TeamType: 1,  // 我方队伍
          ArmType: this.getArmTypeNumber(this.data.selectedTroop),
          // 只传入已选择的武将
          BattleGenerals: this.data.teams.team1.characters
            .filter(char => char && char.id)  // 过滤掉未选择的武将
            .map((char, index) => {
              const generalData = {
                BaseInfo: {
                  Id: char.id,
                  Name: char.name || '',
                  Gender: 0,
                  Group: 0,
                  GeneralTag: null,
                  AvatarUrl: char.avatar || '',
                  AbilityAttr: null,
                  ArmsAttr: char.armsAttr || {},
                  GeneralBattleType: 0,
                  SelfTactic: null,
                  GeneralQuality: 0,
                  IsSupportDynamics: char.supportDynamics || false,
                  IsSupportCollect: char.supportCollect || false
                },
                WarBooks: char.books || [],
                SpecialTechs: [],
                Addition: {
                  AbilityAttr: {
                    ForceBase: char.stats?.attack?.toString() || '',
                    IntelligenceBase: char.stats?.intelligence?.toString() || '',
                    CommandBase: char.stats?.leadership?.toString() || '',
                    SpeedBase: char.stats?.speed?.toString() || ''
                  },
                  GeneralLevel: char.level || 50,
                  GeneralStarLevel: char.dots || 0
                },
                IsMaster: index === 0,  // 第一个武将是主将
                SoldierNum: char.power || 10000,
                ArmsAbility: 1,
                RemainNum: 0
              };

              // 只有当战法有选择时才添加战法数据
              if (char.tactics && char.tactics.some(t => t.id)) {
                generalData.EquipTactics = char.tactics;
              }

              return generalData;
            }),
          BuildingTechAttrAddition: null,
          BuildingTechGroupAddition: null,
          SoliderNum: 0,
          RemainNum: 0,
          Name: '',
          AvatarUrl: ''
        },
        EnemyTeam: {
          TeamType: 2,  // 敌方队伍
          ArmType: this.getArmTypeNumber(this.data.enemySelectedTroop),
          // 只传入已选择的武将
          BattleGenerals: this.data.teams.team2.characters
            .filter(char => char && char.id)  // 过滤掉未选择的武将
            .map((char, index) => {
              const generalData = {
                BaseInfo: {
                  Id: char.id,
                  Name: char.name || '',
                  Gender: 0,
                  Group: 0,
                  GeneralTag: null,
                  AvatarUrl: char.avatar || '',
                  AbilityAttr: null,
                  ArmsAttr: char.armsAttr || {},
                  GeneralBattleType: 0,
                  SelfTactic: null,
                  GeneralQuality: 0,
                  IsSupportDynamics: char.supportDynamics || false,
                  IsSupportCollect: char.supportCollect || false
                },
                WarBooks: char.books || [],
                SpecialTechs: [],
                Addition: {
                  AbilityAttr: {
                    ForceBase: char.stats?.attack?.toString() || '',
                    IntelligenceBase: char.stats?.intelligence?.toString() || '',
                    CommandBase: char.stats?.leadership?.toString() || '',
                    SpeedBase: char.stats?.speed?.toString() || ''
                  },
                  GeneralLevel: char.level || 50,
                  GeneralStarLevel: char.dots || 0
                },
                IsMaster: index === 0,  // 第一个武将是主将
                SoldierNum: char.power || 10000,
                ArmsAbility: 1,
                RemainNum: 0
              };

              // 只有当战法有选择时才添加战法数据
              if (char.tactics && char.tactics.some(t => t.id)) {
                generalData.EquipTactics = char.tactics;
              }

              return generalData;
            }),
          BuildingTechAttrAddition: null,
          BuildingTechGroupAddition: null,
          SoliderNum: 0,
          RemainNum: 0,
          Name: '',
          AvatarUrl: ''
        },
      };

      // 发起请求
      wx.request({
        url: `${baseUrl}/v1/battle/do`,
        method: 'POST', 
        data: requestData,
        success: (res) => {
          if (res.data && res.data.meta && res.data.meta.status_code === 0) {
            // 保存战报ID
            const battleDetail = res.data;
            
            // 跳转到对战结果页面
            wx.navigateTo({
              url: '/pages/battle-result/battle-result',
              success: (res) => {
                res.eventChannel.emit('acceptBattleDetail', {
                  // 直接传递完整的接口返回数据
                  ...battleDetail
                });
              }
            });
          } else {
            wx.showToast({
              title: res.data?.meta?.msg || '对战失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('对战请求失败:', err);
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          });
        }
      });
    } else {
      // 模拟多场的逻辑
      // ... 其他模拟逻辑 ...
    }
  },

  // 获取兵种类型对应的字
  getArmTypeNumber(armType) {
    const armTypeMap = {
      '骑兵': 1,
      '盾兵': 2,
      '弓兵': 3,
      '枪兵': 4
    };
    return armTypeMap[armType] || 0;
  },

  // 检查队伍配置是否有效
  checkTeamValid(teamType = 'both') {
    const myTeam = this.data.teams.team1.characters;
    const enemyTeam = this.data.teams.team2.characters;

    if (teamType === 'my' || teamType === 'both') {
      // 检查我方队伍第一个武将
      if (!myTeam[0]?.id) {
        wx.showToast({
          title: '请先配置我方队伍',
          icon: 'none'
        });
        return false;
      }
    }

    if (teamType === 'enemy' || teamType === 'both') {
      // 检查敌方队伍第一武将
      if (!enemyTeam[0]?.id) {
        wx.showToast({
          title: '请先配置敌方队伍',
          icon: 'none'
        });
        return false;
      }
    }

    return true;
  },

  // 跳转到战法页
  goToTacticSelect(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    const index = e.currentTarget.dataset.index;
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/tactics/tactics?characterId=${characterIndex}&tacticIndex=${index}`
    });
  },

  // 显示等级选择器
  showLevelSlider(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }

    const currentTeam = this.data.currentTeam;
    const characters = currentTeam === 'team1' ? this.data.teams.team1.characters : this.data.teams.team2.characters;
    const character = characters[characterIndex];
    
    this.setData({
      showLevelPopup: true,
      tempLevel: character.level,
      currentCharacterIndex: characterIndex
    });
  },

  // 隐藏等级选择器
  hideLevelSlider() {
    this.setData({
      showLevelPopup: false
    });
  },

  // 等级滑动中
  onLevelSliding(e) {
    this.setData({
      tempLevel: e.detail.value
    });
  },

  // 等级滑动结束
  onLevelChange(e) {
    this.setData({
      tempLevel: e.detail.value
    });
  },

  // 确认等级选择
  confirmLevel() {
    const { currentCharacterIndex, tempLevel } = this.data;
    const character = this.getCurrentTeamCharacter(currentCharacterIndex);
    
    // 更新数据
    this.updateCurrentTeamCharacter(currentCharacterIndex, {
      ...character,
      level: tempLevel
    });

    this.setData({
      showLevelPopup: false
    });
  },

  // 防止背景滚动
  preventTouchMove() {
    return;
  },

  // 显示兵力选择器
  showPowerSlider(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }

    const currentTeam = this.data.currentTeam;
    const characters = currentTeam === 'team1' ? this.data.teams.team1.characters : this.data.teams.team2.characters;
    const character = characters[characterIndex];
    
    this.setData({
      showPowerPopup: true,
      tempPower: character.power,
      currentCharacterIndex: characterIndex
    });
  },

  // 隐藏兵力选择器
  hidePowerSlider() {
    this.setData({
      showPowerPopup: false
    });
  },

  // 兵力滑动中
  onPowerSliding(e) {
    this.setData({
      tempPower: e.detail.value
    });
  },

  // 兵力滑动结束
  onPowerChange(e) {
    this.setData({
      tempPower: e.detail.value
    });
  },

  // 确认兵力选择
  confirmPower() {
    const { currentCharacterIndex, tempPower } = this.data;
    const character = this.getCurrentTeamCharacter(currentCharacterIndex);
    
    // 更新数据
    this.updateCurrentTeamCharacter(currentCharacterIndex, {
      ...character,
      power: tempPower
    });

    this.setData({
      showPowerPopup: false
    });
  },

  // 到将选择页面
  goToGeneralSelect(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    console.log('选择武将 - 点击位置:', characterIndex);
    
    // 保存当前操作的和队伍信息到本地存储
    wx.setStorageSync('selectedPosition', {
      characterIndex: characterIndex,
      currentTeam: this.data.currentTeam
    });
    
    this.setData({
      selectedGeneral: null,  // 清空之前的选择
      currentCharacterIndex: characterIndex  // 保存当前选中位置
    });

    wx.navigateTo({
      url: `/pages/generals/generals?characterId=${characterIndex}`,
      fail: (err) => {
        console.error('跳转武将选择页面失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  },

  // 跳转到兵书选择页面
  goToBookSelect(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }

    // 保存当前操作的位置信息
    wx.setStorageSync('bookPosition', {
      characterIndex,
      currentTeam: this.data.currentTeam
    });

    console.log('跳转兵书选择页面:', {
      characterIndex,
      currentTeam: this.data.currentTeam
    });

    wx.navigateTo({
      url: `/pages/books/books?index=${characterIndex}`
    });
  },

  // 选择兵种
  selectTroop(e) {
    const selectedTroop = e.currentTarget.dataset.troop;
    const currentTroop = this.data.currentTeam === 'team1' ? 
      this.data.selectedTroop : this.data.enemySelectedTroop;
    
    // 检查当前队伍是否有武将
    if (!this.isGeneralSelected(0)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }

    // 如果点击已选中的兵种，取消选择并清除适性
    if (currentTroop === selectedTroop) {
      this.setData({
        [this.data.currentTeam === 'team1' ? 'selectedTroop' : 'enemySelectedTroop']: ''
      });
      
      // 清除所有武将的兵种适性
      const currentTeam = this.data.currentTeam;
      const characters = this.data.teams[currentTeam].characters;
      characters.forEach((char, index) => {
        if (char && char.id) {
          this.updateCurrentTeamCharacter(index, {
            ...char,
            troopRank: ''
          });
        }
      });
    } else {
      // 选择新的兵种
      this.setData({
        [this.data.currentTeam === 'team1' ? 'selectedTroop' : 'enemySelectedTroop']: selectedTroop
      });

      // 设置所有武将的兵种适性
      const currentTeam = this.data.currentTeam;
      const characters = this.data.teams[currentTeam].characters;
      characters.forEach((char, index) => {
        if (char && char.id) {
          const troopRank = this.getTroopRank(char.armsAttr, selectedTroop);
          this.updateCurrentTeamCharacter(index, {
            ...char,
            troopRank
          });
        }
      });
    }
  },

  // 根据武将属性和选择的兵种获取适性等级
  getTroopRank(armsAttr, troopType) {
    if (!armsAttr || !troopType) return '';
    
    // 修正映射关系：1是S、2是A、3是B、4是C
    const rankMap = {
      1: 'S',
      2: 'A',
      3: 'B',
      4: 'C'
    };

    // 根据兵种类型获取对应的属性值
    let attrValue;
    switch(troopType) {
      case '骑兵':
        attrValue = armsAttr.Cavalry || 4;  // 默认为C
        break;
      case '盾兵':
        attrValue = armsAttr.Mauler || 4;   // 默认为C
        break;
      case '弓兵':
        attrValue = armsAttr.Archers || 4;  // 默认为C
        break;
      case '枪兵':
        attrValue = armsAttr.Spearman || 4; // 默认为C
        break;
      default:
        attrValue = 4;  // 默认为C
    }

    return rankMap[attrValue] || 'C';
  },

  // 计算可加点数
  calculateMaxPoints(character) {
    if (!character) return 0;
    
    const levelPoints = Math.floor(character.level / 10) * 10;  // 等级带来的点数
    const dotsPoints = (character.dots || 0) * 10;             // 进阶带来的点数
    const dianPoints = character.skillButtons?.dian ? 10 : 0;  // "典"按钮带来的点数
    const dongPoints = character.skillButtons?.dong ? 10 : 0;  // "动"按钮带来的点数
    
    return levelPoints + dotsPoints + dianPoints + dongPoints;
  },

  // 计算用的数
  calculateUsedPoints(stats) {
    if (!stats) return 0;
    return (stats.attack || 0) + 
           (stats.intelligence || 0) + 
           (stats.leadership || 0) + 
           (stats.speed || 0);
  },

  // 显示属性调整弹出层
  showStatsPopup(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请选择武将',
        icon: 'none'
      });
      return;
    }

    const currentTeam = this.data.currentTeam;
    const characters = currentTeam === 'team1' ? this.data.teams.team1.characters : this.data.teams.team2.characters;
    const character = characters[characterIndex];
    
    // 计算加点数
    const maxPoints = this.calculateMaxPoints(character);
    
    // 初始化临时属性值
    this.setData({
      showStatsPopup: true,
      currentCharacterIndex: characterIndex,
      tempStats: {
        attack: character.stats?.attack || 0,
        intelligence: character.stats?.intelligence || 0,
        leadership: character.stats?.leadership || 0,
        speed: character.stats?.speed || 0
      },
      maxPoints: maxPoints,
      remainingPoints: maxPoints - this.calculateUsedPoints(character.stats)
    });
  },

  // 隐藏属性调整弹出层
  hideStatsPopup() {
    this.setData({
      showStatsPopup: false
    });
  },

  // 属性滑动中
  onStatSliding(e) {
    const stat = e.currentTarget.dataset.stat;
    const newValue = parseInt(e.detail.value);
    const oldValue = this.data.tempStats[stat];
    const pointDiff = newValue - oldValue;
    
    // 检查是否超出可用点数
    if (this.data.remainingPoints - pointDiff < 0) {
      // 如果超出，不更新数值
      return;
    }
    
    // 更新属性值和剩余点数
    this.setData({
      [`tempStats.${stat}`]: newValue,
      remainingPoints: this.data.remainingPoints - pointDiff
    });
  },

  // 属性滑动结束
  onStatChange(e) {
    const stat = e.currentTarget.dataset.stat;
    const newValue = parseInt(e.detail.value);
    const oldValue = this.data.tempStats[stat];
    const pointDiff = newValue - oldValue;
    
    // 检查是否超出可用点数
    if (this.data.remainingPoints - pointDiff < 0) {
      // 如果超出，回退到原值
      this.setData({
        [`tempStats.${stat}`]: oldValue
      });
      wx.showToast({
        title: '可用点数不足',
        icon: 'none'
      });
      return;
    }
    
    // 更新属性值和剩余点数
    this.setData({
      [`tempStats.${stat}`]: newValue,
      remainingPoints: this.data.remainingPoints - pointDiff
    });
  },

  // 确认属性调整
  confirmStats() {
    const { tempStats, currentTeam, currentCharacterIndex } = this.data;
    const characters = currentTeam === 'team1' ? 'team1.characters' : 'team2.characters';
    
    // 建新数组副本
    const newCharacters = [...this.data.teams[currentTeam].characters];
    // 更新特定武的属性
    newCharacters[currentCharacterIndex] = {
      ...newCharacters[currentCharacterIndex],
      stats: { ...tempStats }
    };
    
    // 更新数据
    this.setData({
      [currentTeam === 'team1' ? 'team1.characters' : 'team2.characters']: newCharacters,
      showStatsPopup: false
    });
  },

  // 切换队伍
  switchTeam(e) {
    const team = e.currentTarget.dataset.team;
    console.log('换队伍:', {
      之前的队伍: this.data.currentTeam,
      换到: team
    });
    
    // 更新当前队伍并保存到本地存储
    this.setData({
      currentTeam: team
    });
    wx.setStorageSync('currentTeam', team);
  },

  // 选择兵种适性
  selectTroopRank(e) {
    const rank = e.currentTarget.dataset.rank;
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    const character = this.getCurrentTeamCharacter(characterIndex);
    
    // 如果击已选中等级，则取消选中
    const newRank = character.troopRank === rank ? '' : rank;
    
    // 更新数据
    this.updateCurrentTeamCharacter(characterIndex, {
      ...character,
      troopRank: newRank
    });
  },

  // 跳转到推荐阵容页面
  goToTeamRecommend() {
    console.log('点击推荐阵容按钮');
    
    // 显示loading
    this.setData({
      showPageLoading: true
    });

    // 保存当前队伍信息到本地存储
    wx.setStorageSync('selectedPosition', {
      currentTeam: this.data.currentTeam
    });
    
    wx.navigateTo({
      url: '/pages/teams/teams',
      success: () => {
        console.log('跳转推荐阵容页面成功');
      },
      fail: (err) => {
        console.error('跳转推荐阵容页面失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      },
      complete: () => {
        // 无论成功失败关闭loading
        this.setData({
          showPageLoading: false
        });
      }
    });
  },

  // 跳转到特技选择
  goToSkillSelect(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/skills/skills?index=${characterIndex}`
    });
  },

  // 切换技能按钮
  toggleSkillButton(e) {
    const type = e.currentTarget.dataset.type;
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    const character = this.getCurrentTeamCharacter(characterIndex);
    
    console.log('character:',character)

    // 检查是否支持该按钮
    if (type === 'dong' && character.supportDynamics != true) {
      wx.showToast({
        title: '该武将不支持"动态"',
        icon: 'none'
      });
      return;
    }
    
    if (type === 'dian' && character.supportCollect != true) {
      wx.showToast({
        title: '该武将不支持"典藏"',
        icon: 'none'
      });
      return;
    }

    const currentValue = character.skillButtons?.[type] || false;
    
    // 更新数据
    this.updateCurrentTeamCharacter(characterIndex, {
      ...character,
      skillButtons: {
        ...(character.skillButtons || {}),
        [type]: !currentValue
      }
    });
  },

  // 选择星星
  selectStar(e) {
    const characterIndex = parseInt(e.currentTarget.dataset.characterId);
    if (!this.isGeneralSelected(characterIndex)) {
      wx.showToast({
        title: '请先选择武将',
        icon: 'none'
      });
      return;
    }

    const starIndex = parseInt(e.currentTarget.dataset.index);
    const character = this.getCurrentTeamCharacter(characterIndex);
    
    // 如果点击的当前已选择的星星数，则取消所有星星
    const newDots = character.dots === starIndex + 1 ? 0 : starIndex + 1;
    
    // 更新进阶数
    this.updateCurrentTeamCharacter(characterIndex, {
      ...character,
      dots: newDots
    });
  },

  // 页面显示时发生
  onShow() {
    // 处理从武将选择页面返回
    if (this.data.selectedGeneral) {
      const selectedPosition = wx.getStorageSync('selectedPosition');
      if (selectedPosition) {
        const { characterIndex, currentTeam } = selectedPosition;
        
        // 打印选择的将信息
        console.log('选择的武将信息:', {
          武将数据: this.data.selectedGeneral,
          位置信息: selectedPosition,
          兵种属性: this.data.selectedGeneral.armsAttr,
          当前队伍兵种: currentTeam === 'team1' ? this.data.selectedTroop : this.data.enemySelectedTroop
        });

        const currentCharacter = this.data.teams[currentTeam].characters[characterIndex];
        
        // 更新当前操作的武将位置数据
        const updatedCharacter = {
          ...currentCharacter,
          id: this.data.selectedGeneral.id,
          name: this.data.selectedGeneral.name,
          avatar: this.data.selectedGeneral.avatar,
          force: this.data.selectedGeneral.force,
          rank: this.data.selectedGeneral.rank,
          cost: this.data.selectedGeneral.cost,
          level: 50,
          power: 10000,
          dots: 0,
          selfTactic: this.data.selectedGeneral.selfTactic,
          tactics: [
            { name: '', rank: '' },
            { name: '', rank: '' }
          ],
          books: [],
          armsAttr: this.data.selectedGeneral.armsAttr || {},  // 保存武将的兵种适性数据
          skillButtons: {
            dian: false,
            dong: false
          },
          stats: {
            attack: 0,
            intelligence: 0,
            leadership: 0,
            speed: 0
          }
        };

        // 打印更新后的武将数据
        console.log('更新后的武将数据:', {
          更新前: currentCharacter,
          更新后: updatedCharacter
        });

        // 更新数据
        this.setData({
          [`teams.${currentTeam}.characters[${characterIndex}]`]: updatedCharacter,
          selectedGeneral: null
        }, () => {
          // 如果当前队伍已选择兵种，根据武将的兵种适性设置等级
          const currentTroop = currentTeam === 'team1' ? 
            this.data.selectedTroop : this.data.enemySelectedTroop;
          
          if (currentTroop) {
            const troopRank = this.getTroopRank(updatedCharacter.armsAttr, currentTroop);
            this.updateCurrentTeamCharacter(characterIndex, {
              ...updatedCharacter,
              troopRank
            });
          }
        });

        wx.removeStorageSync('selectedPosition');
      }
    }

    // 处理推荐阵容返回
    const recommendTeamInfo = wx.getStorageSync('recommendTeamInfo');
    const teamSelectInfo = wx.getStorageSync('teamSelectInfo');
    
    if (recommendTeamInfo && teamSelectInfo && recommendTeamInfo.recommendedTeam && Array.isArray(recommendTeamInfo.recommendedTeam)) {
      const { recommendedTeam } = recommendTeamInfo;
      const { isMyTeam } = teamSelectInfo;
      
      // 根据我方还是敌方队伍决定回填位置
      const targetTeam = isMyTeam ? 'team1' : 'team2';
      
      console.log('index页面 onShow - 处理推荐阵容返回:', {
        targetTeam,
        isMyTeam,
        recommendedTeam
      });

      // 确保recommendedTeam是数组有数据
      if (recommendedTeam.length === 0) {
        wx.showToast({
          title: '推荐阵容数据为空',
          icon: 'none'
        });
        return;
      }

      // 将推荐的武将数据映射到队伍格式
      const updatedCharacters = recommendedTeam.map(general => ({
        id: general.id,
        name: general.name,
        avatar: general.avatar,
        force: general.force,
        rank: general.rank,
        cost: general.cost,
        level: 50,
        power: 10000,
        dots: 0,
        selfTactic: general.selfTactic,
        tactics: [
          { name: '', rank: '' },
          { name: '', rank: '' }
        ],
        books: general.Books ? general.Books.map(book => ({
          id: book.Id,
          name: book.Name
        })) : [],
        troopRank: '',
        armsAttr: general.armsAttr || {},
        skillButtons: {
          dian: false,
          dong: false
        },
        skillNumber: general.SpecialTechs ? general.SpecialTechs.length : 0,
        specialTechs: general.SpecialTechs ? general.SpecialTechs.map(tech => ({
          id: tech.Id,
          name: tech.Name,
          type: tech.Type,
          level: tech.Level
        })) : [],
        stats: {
          attack: 0,
          intelligence: 0,
          leadership: 0,
          speed: 0
        }
      }));

      // 确保生成的数据正确
      console.log('处理后的阵容数据:', {
        updatedCharacters,
        targetTeam
      });

      // 更新队伍数据
      this.setData({
        recommendTeamInfo: recommendTeamInfo,
        [`teams.${targetTeam}`]: {
          characters: updatedCharacters
        }
      });

      // 清除存储的数据
      wx.removeStorageSync('recommendTeamInfo');
      wx.removeStorageSync('teamSelectInfo');
    }

    // 处理兵书选择返回
    const selectedBooks = wx.getStorageSync('selectedBooks');
    const bookPosition = wx.getStorageSync('bookPosition');
    
    if (selectedBooks && bookPosition) {
      console.log('处理兵书选择返回:', { selectedBooks, bookPosition });
      const { characterIndex, currentTeam } = bookPosition;
      
      // 获取当前武将数据
      const character = this.data.teams[currentTeam].characters[characterIndex];
      if (character) {
        // 更新武将数据，包括兵书
        this.updateCurrentTeamCharacter(characterIndex, {
          ...character,
          books: selectedBooks
        });

        console.log('更新的武将数据:', this.data.teams[currentTeam].characters[characterIndex]);
      }

      // 清除存储的数据
      wx.removeStorageSync('selectedBooks');
      wx.removeStorageSync('bookPosition');
    }

    // 检查并更新武将的兵书显示
    if (this.data.characterList) {
      this.data.characterList.forEach((character, index) => {
        if (character && character.books) {
          this.setData({
            [`characterList[${index}].books`]: character.books
          });
        }
      });
    }
  },

  // 检查武将是否已选择
  isGeneralSelected(characterIndex, team = null) {
    if (characterIndex === undefined || characterIndex === null) return false;
    
    // 如果没有指定队伍，使用当前队伍
    const targetTeam = team || this.data.currentTeam;
    const character = this.data.teams[targetTeam].characters[characterIndex];
    
    return Boolean(character && character.id);
  },

  // 获取当前队伍的武将数据
  getCurrentTeamCharacter(index) {
    return this.data.teams[this.data.currentTeam].characters[index];
  },

  // 更新当前队伍的武将数据
  updateCurrentTeamCharacter(index, data) {
    const teamKey = `teams.${this.data.currentTeam}.characters[${index}]`;
    this.setData({
      [teamKey]: data
    });
  },

  // 获取指定队伍的武将数据
  getTeamCharacter(team, index) {
    return this.data.teams[team].characters[index];
  },

  // 更新指定队伍的武将数据
  updateTeamCharacter(team, index, data) {
    const teamKey = `teams.${team}.characters[${index}]`;
    this.setData({
      [teamKey]: data
    });
  },

  // 重置所有数据
  resetAll() {
    this.showResetPopup();
  },

  // 显示重置确认弹窗
  showResetPopup() {
    this.setData({
      showResetPopup: true
    });
  },

  // 隐藏重置确认弹窗
  hideResetPopup() {
    this.setData({
      showResetPopup: false
    });
  },

  // 确认重置
  confirmReset() {
    // 初始化武将数据
    const defaultCharacterData = {
      level: 50,
      power: 10000,
      tactics: [
        { name: '', rank: '' },
        { name: '', rank: '' }
      ],
      books: [],
      troopRank: '',
      armsAttr: {},
      stats: {
        attack: 0,
        intelligence: 0,
        leadership: 0,
        speed: 0
      },
      skillNumber: 0,
      skillButtons: {
        dian: false,
        dong: false
      },
      dots: 0
    };

    // 只重置当前队伍
    const currentTeam = this.data.currentTeam;
    const updatedTeams = {
      ...this.data.teams,
      [currentTeam]: {
        characters: Array(3).fill().map(() => ({...defaultCharacterData}))
      }
    };

    this.setData({ 
      teams: updatedTeams,
      [currentTeam === 'team1' ? 'selectedTroop' : 'enemySelectedTroop']: '',  // 重置兵种选择
      showResetPopup: false  // 关闭弹窗
    });
  },

  // 开始对战
  startBattle() {
    // 0. 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.Uid) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    // 1. 检查我方主将
    if (!this.isGeneralSelected(0, 'team1')) {
      wx.showToast({
        title: '请选择我方主将',
        icon: 'none'
      });
      return;
    }

    // 2. 检查敌方主将
    if (!this.isGeneralSelected(0, 'team2')) {
      wx.showToast({
        title: '请选择敌方主将',
        icon: 'none'
      });
      return;
    }

    // 3. 检查我方兵种
    if (!this.data.selectedTroop) {
      wx.showToast({
        title: '请选择我方兵种',
        icon: 'none'
      });
      return;
    }

    // 4. 检查敌方兵种
    if (!this.data.enemySelectedTroop) {
      wx.showToast({
        title: '请选择敌方兵种',
        icon: 'none'
      });
      return;
    }

    // 所有校验通过，开始对战
    this.startSimulation({ currentTarget: { dataset: { type: '1' } } });
  },

  onShareAppMessage() {
    return {
      title: '三战配将侯 - 三国武将阵容模拟器',
      path: '/pages/battle-config/battle-config',
      imageUrl: '/images/share.png',
    };
  },

  // 选择阵容后的数据处理
  processTeamData(teamData) {
    return teamData.map(general => ({
      // ... 其他字段保持不变
      
      // 处理特技数据
      skillNumber: general.SpecialTechs ? general.SpecialTechs.length : 0,
      specialTechs: general.SpecialTechs ? general.SpecialTechs.map(tech => ({
        id: tech.Id,
        name: tech.Name,
        type: tech.Type,
        level: tech.Level
      })) : [],
      
      // ... 其他字段保持不变
    }));
  }
}) 