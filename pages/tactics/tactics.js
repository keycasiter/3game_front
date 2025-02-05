const { baseUrl } = require('../../config/api.js');

Page({
  data: {
    searchValue: '',
    categories: ['全部', '主动', '被动', '指挥', '突击', '阵法', '兵种'],
    categoryMap: {
      '全部': 0,
      '主动': 1,
      '被动': 2,
      '指挥': 3,
      '突击': 4,
      '阵法': 5,
      '兵种': 6
    },
    qualities: [
      { label: '全部', value: 0 },
      { label: 'S', value: 1 },
      { label: 'A', value: 2 },
      { label: 'B', value: 3 },
      { label: 'C', value: 4 }
    ],
    selectedCategory: '全部',
    selectedQuality: 0,
    tactics: [],
    selectedTactic: null,
    characterId: 0,
    tacticIndex: 0,
    loading: false,
    pageSize: 500,
    selectedTactics: [],
    selfTactic: null,
  },

  onLoad(options) {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    if (options.characterId && prevPage) {
      const currentTeam = prevPage.data.currentTeam;
      const characters = prevPage.data.teams[currentTeam].characters;
      
      const selectedTactics = characters
        .filter(char => char)  // 过滤空位置
        .reduce((acc, char) => {
          // 收集所有已选择的战法ID
          if (char.tactics) {
            char.tactics.forEach(tactic => {
              if (tactic && tactic.id) {
                acc.push(tactic.id);
              }
            });
          }
          return acc;
        }, []);

      const currentChar = characters[parseInt(options.characterId)];
      const selfTactic = currentChar?.selfTactic;

      this.setData({
        characterId: parseInt(options.characterId),
        tacticIndex: parseInt(options.tacticIndex) || 0,
        selectedTactics,
        selfTactic
      });
    }

    this.fetchTactics();
  },

  // 获取战法列表
  fetchTactics() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });

    const params = {
      Name: this.data.searchValue || undefined,
      Type: this.data.categoryMap[this.data.selectedCategory] || undefined,
      Quality: this.data.selectedQuality || undefined,
      PageNo: 1,
      PageSize: this.data.pageSize
    };

    // 构建URL查询参数
    const queryParams = Object.keys(params)
      .filter(key => params[key] !== undefined)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');

    wx.request({
      url: `${baseUrl}/v1/tactic/list?${queryParams}`,
      method: 'GET',
      timeout: 5000,  // 5秒超时
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.TacticList) {
          const tactics = res.data.TacticList.map(item => ({
            id: item.Id,
            name: item.Name,
            quality: item.Quality,
            rank: this.getQualityRank(item.Quality)
          }));
          
          this.setData({ tactics });
        } else {
          wx.showToast({
            title: '获取战法失败',
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
        setTimeout(() => {
          this.setData({ loading: false });
        }, 500);
      }
    });
  },

  // 添加一个辅助方法来转换Quality到Rank
  getQualityRank(quality) {
    switch (quality) {
      case 1: return 'S';
      case 2: return 'A';
      case 3: return 'B';
      case 4: return 'C';
      default: return 'S';
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      searchValue: e.detail.value,
    });
    this.fetchTactics(); // 实时搜索，重置页码
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      selectedCategory: category
    });
    this.fetchTactics(); // 切换分类时重新请求，重置页码
  },

  selectTactic(e) {
    const id = e.currentTarget.dataset.id;
    
    if (this.data.selfTactic && this.data.selfTactic.id === id) {
      wx.showToast({
        title: '不能选择与自带战法相同的战法',
        icon: 'none'
      });
      return;
    }

    if (this.data.selectedTactics.includes(id)) {
      wx.showToast({
        title: '该战法已在当前队伍中使用',
        icon: 'none'
      });
      return;
    }

    const selectedTactic = this.data.tactics.find(tactic => tactic.id === id);
    if (selectedTactic) {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      const currentTeam = prevPage.data.currentTeam;
      const characterId = this.data.characterId;
      const tacticIndex = this.data.tacticIndex;

      prevPage.setData({
        [`teams.${currentTeam}.characters[${characterId}].tactics[${tacticIndex}]`]: {
          id: selectedTactic.id,
          name: selectedTactic.name,
          quality: selectedTactic.quality,
          rank: selectedTactic.rank
        }
      });

      wx.navigateBack();
    }
  },

  confirmSelection() {
    if (this.data.selectedTactic) {
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      const characters = prevPage.data.characters;
      const character = characters[this.data.characterId];
      character.tactics[this.data.tacticIndex] = this.data.selectedTactic.name;
      
      prevPage.setData({ characters });
      wx.navigateBack();
    }
  },

  // 选择品质
  selectQuality(e) {
    const quality = e.currentTarget.dataset.quality;
    this.setData({
      selectedQuality: quality
    });
    this.fetchTactics();
  }
}); 