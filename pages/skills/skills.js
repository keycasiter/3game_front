const app = getApp()
const { baseUrl } = require('../../config/api.js');

// 防抖函数
function debounce(fn, delay = 500) {
  let timer = null
  return function(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

Page({
  data: {
    // 品质分类
    categories: ['全部', '珍品', '上品'],
    selectedCategory: '全部',
    // 类型分类
    types: ['全部', '武器', '防具', '坐骑', '宝物'],
    selectedType: '全部',
    searchValue: '',
    skills: [],
    loading: false,
    // 分页参数
    pageNo: 1,
    pageSize: 500,
    // 选中的特技
    selectedSkills: [],
    // 来源武将索引
    generalIndex: null
  },

  onLoad(options) {
    // 初始化防抖函数
    this.debouncedFetchSkills = debounce(this.fetchSkills)
    
    console.log('页面参数:', options)
    // 获取来源武将索引
    if (options.index !== undefined) {
      const index = parseInt(options.index)
      this.setData({ generalIndex: index })

      // 获取上一页实例
      const pages = getCurrentPages()
      const prevPage = pages[pages.length - 2]
      
      if (prevPage) {
        const currentTeam = prevPage.data.currentTeam
        const character = prevPage.data.teams[currentTeam].characters[index]
        
        // 如果有已选中的特技，设置到当前页面
        if (character && character.skills && character.skills.length > 0) {
          console.log('已选中的特技:', character.skills)
          this.setData({
            selectedSkills: character.skills
          })
        }
      }
    }

    this.fetchSkills()
  },

  // 处理搜索输入
  onSearchInput(e) {
    const value = e.detail.value
    console.log('搜索输入:', value)
    this.setData({ searchValue: value })
    this.debouncedFetchSkills()
  },

  // 处理品质分类选择
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    console.log('选择品质:', category)
    this.setData({ selectedCategory: category })
    this.fetchSkills()
  },

  // 处理类型分类选择
  selectType(e) {
    const type = e.currentTarget.dataset.type
    console.log('选择类型:', type)
    this.setData({ selectedType: type })
    this.fetchSkills()
  },

  // 获取特技列表
  fetchSkills() {
    console.log('发起请求，参数:', {
      searchValue: this.data.searchValue,
      category: this.data.selectedCategory,
      type: this.data.selectedType
    })
    
    this.setData({ loading: true })

    // 获取Level映射值
    const levelMap = {
      '全部': 0,
      '珍品': 1,
      '上品': 2
    }

    // 获取Type映射值
    const typeMap = {
      '全部': 0,
      '武器': 1,
      '防具': 2,
      '坐骑': 3,
      '宝物': 4
    }

    // 类型简写映射
    const typeShortNames = {
      1: '武',
      2: '防',
      3: '骑',
      4: '宝'
    }

    wx.request({
      url: `${baseUrl}/v1/skill/list`,
      method: 'GET',
      data: {
        PageNo: this.data.pageNo,
        PageSize: this.data.pageSize,
        Name: this.data.searchValue,
        Level: levelMap[this.data.selectedCategory],
        Type: typeMap[this.data.selectedType]
      },
      success: (res) => {
        console.log('请求成功:', res.data)
        if (res.statusCode === 200 && res.data && res.data.meta.status_code === 0) {
          // 处理返回的特技列表数据
          const skills = res.data.SpecialTechList || []
          this.setData({
            skills: skills.map(skill => ({
              id: skill.Id,
              name: skill.Name,
              type: skill.Type,
              typeText: typeShortNames[skill.Type] || '',
              level: skill.Level,
              rank: skill.Level === 1 ? 'S' : skill.Level === 2 ? 'A' : '',
              selected: this.data.selectedSkills.some(s => s.id === skill.Id)
            }))
          })
        } else {
          wx.showToast({
            title: res.data?.meta?.status_msg || '获取数据失败',
            icon: 'none'
          })
        }
      },
      fail: (error) => {
        console.error('请求失败:', error)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 检查特技类型数量是否超限
  checkSkillTypeLimit(selectedSkills, newSkill) {
    // 类型映射
    const typeNames = {
      1: '武器',
      2: '防具',
      3: '坐骑',
      4: '宝物'
    }

    // 计算当前类型的特技数量
    const typeCount = selectedSkills.filter(skill => skill.type === newSkill.type).length

    if (typeCount >= 2) {
      wx.showToast({
        title: `${typeNames[newSkill.type]}特技不能超过2个`,
        icon: 'none'
      })
      return false
    }
    return true
  },

  // 选择特技
  selectSkill(e) {
    const id = e.currentTarget.dataset.id
    const skills = this.data.skills
    const selectedSkill = skills.find(s => s.id === id)
    
    if (!selectedSkill) return

    // 更新选中状态
    const selectedSkills = [...this.data.selectedSkills]
    const existingIndex = selectedSkills.findIndex(s => s.id === id)
    
    if (existingIndex > -1) {
      // 取消选中
      selectedSkills.splice(existingIndex, 1)
    } else {
      // 添加选中前检查类型数量限制
      if (!this.checkSkillTypeLimit(selectedSkills, selectedSkill)) {
        return
      }
      // 添加选中
      selectedSkills.push({
        id: selectedSkill.id,
        name: selectedSkill.name,
        type: selectedSkill.type,
        level: selectedSkill.level,
        rank: selectedSkill.rank
      })
    }

    // 更新状态
    this.setData({
      selectedSkills,
      skills: skills.map(skill => ({
        ...skill,
        selected: selectedSkills.some(s => s.id === skill.id)
      }))
    })
  },

  // 重置选择
  resetSelection() {
    // 如果没有选中的特技，不需要重置
    if (this.data.selectedSkills.length === 0) {
      return
    }

    // 更新状态
    this.setData({
      selectedSkills: [],
      skills: this.data.skills.map(skill => ({
        ...skill,
        selected: false
      }))
    })
  },

  // 确认选择
  confirmSelection() {
    const { generalIndex, selectedSkills } = this.data
    
    console.log('确认选择:', {
      generalIndex,
      selectedSkills
    })

    if (generalIndex === null) {
      wx.showToast({
        title: '请从武将页面进入',
        icon: 'none'
      })
      return
    }

    // 获取上一页实例
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    
    if (!prevPage) {
      wx.showToast({
        title: '数据异常',
        icon: 'none'
      })
      return
    }

    try {
      const currentTeam = prevPage.data.currentTeam
      // 更新上一页数据
      prevPage.setData({
        [`teams.${currentTeam}.characters[${generalIndex}].skills`]: selectedSkills,
        [`teams.${currentTeam}.characters[${generalIndex}].skillNumber`]: selectedSkills.length
      })

      // 返回上一页
      wx.navigateBack()
    } catch (error) {
      console.error('更新数据失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
}) 