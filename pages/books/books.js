// pages/books/books.js
const { baseUrl } = require('../../config/api.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    categories: ['作战', '虚实', '军形', '九变', '始计', '用间'],
    categoryMap: {
      '作战': 1,
      '虚实': 2,
      '军形': 3,
      '九变': 4,
      '始计': 5,
      '用间': 6
    },
    selectedCategory: '作战',
    books: [],
    booksByLevel: {},
    selectedBooks: [],
    generalIndex: null,
    generalId: null,
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options.index !== undefined) {
      const index = parseInt(options.index);
      
      // 获取上一页实例
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        const currentTeam = prevPage.data.currentTeam;
        const character = prevPage.data.teams[currentTeam].characters[index];
        
        if (!character || !character.id) {
          wx.showToast({
            title: '武将数据异常',
            icon: 'none'
          });
          return;
        }

        console.log('兵书页面 onLoad - 武将数据:', {
          index: index,
          character: character,
          generalId: character.id,
          books: character.books
        });

        this.setData({ 
          generalIndex: index,
          generalId: character.id
        }, () => {
          // 如果有已选中的兵书，需要将名称数组转换为兵书对象数组
          if (character && character.books && character.books.length > 0) {
            const selectedBooks = character.books.map(bookName => ({
              id: 0,  // 这里id不重要，因为我们最终只保存名称
              name: bookName,
              type: 0,  // 这里type不重要，因为我们最终只保存名称
              level: bookName === character.books[0] ? 2 : 3  // 第一本是大兵书，其他是小兵书
            }));
            
            this.setData({
              selectedBooks: selectedBooks
            });
          }

          // 加载时获取兵书列表
          this.fetchBooks();
        });
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
   * 页面相关事件处理函数--监听用户下拉
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

  },

  // 更新兵书选中状态
  updateBooksSelection() {
    const { booksByLevel, selectedBooks } = this.data;
    const updatedBooksByLevel = {};

    // 更新大兵书
    if (booksByLevel['2']) {
      updatedBooksByLevel['2'] = booksByLevel['2'].map(book => ({
        ...book,
        selected: selectedBooks.some(selected => selected.id === book.id)
      }));
    }

    // 更新小兵书
    if (booksByLevel['3']) {
      updatedBooksByLevel['3'] = booksByLevel['3'].map(book => ({
        ...book,
        selected: selectedBooks.some(selected => selected.id === book.id)
      }));
    }

    this.setData({ booksByLevel: updatedBooksByLevel });
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    
    // 如果切换到不同的分类，清空已选择的兵书
    if (category !== this.data.selectedCategory) {
      this.setData({
        selectedBooks: []
      });
    }
    
    this.setData({
      selectedCategory: category
    });
    
    this.fetchBooks(); // 切换分类时重新请求
  },

  // 选择兵书
  selectBook(e) {
    const id = e.currentTarget.dataset.id;
    const book = this.data.books.find(book => book.id === id);
    
    if (!book) return;

    const selectedBooks = [...this.data.selectedBooks];
    const existingIndex = selectedBooks.findIndex(b => b.id === id);
    
    // 如果是大兵书(level === 2)
    if (book.level === 2) {
      // 如果点击已选中的大兵书，则取消选择并重置所有小兵书
      if (existingIndex > -1) {
        selectedBooks.length = 0; // 清空所有选择
      } else {
        // 先移除之前选择的大兵书（如果有）
        const bigBookIndex = selectedBooks.findIndex(b => b.level === 2);
        if (bigBookIndex > -1) {
          selectedBooks.splice(bigBookIndex, 1);
        }
        // 添加新选择的大兵书
        selectedBooks.push({
          id: book.id,
          name: book.name,
          type: book.type,
          level: book.level
        });
      }
    } else {
      // 如果是小兵书，先检查是否已选择大兵书
      const hasBigBook = selectedBooks.some(b => b.level === 2);
      if (!hasBigBook) {
        wx.showToast({
          title: '请先选择大兵书',
          icon: 'none'
        });
        return;
      }

      // 小兵书的逻辑保持不变
      if (existingIndex > -1) {
        // 取消选中
        selectedBooks.splice(existingIndex, 1);
      } else {
        // 添加选中
        if (selectedBooks.length >= 3) {
          wx.showToast({
            title: '最多选择3本兵书',
            icon: 'none'
          });
          return;
        }
        selectedBooks.push({
          id: book.id,
          name: book.name,
          type: book.type,
          level: book.level
        });
      }
    }

    console.log('选择兵书后的状态:', {
      选中的兵书: selectedBooks,
      当前选择的兵书: book
    });

    this.setData({ selectedBooks }, () => {
      this.updateBooksSelection();
    });
  },

  // 重置选择
  resetSelection() {
    if (this.data.selectedBooks.length === 0) return;
    
    this.setData({ selectedBooks: [] }, () => {
      this.updateBooksSelection();
    });
  },

  // 确认选择
  confirmSelection() {
    // 保存选择的兵书数据到本地存储
    wx.setStorageSync('selectedBooks', this.data.selectedBooks);
    
    console.log('保存兵书数据:', {
      selectedBooks: this.data.selectedBooks,
      bookPosition: wx.getStorageSync('bookPosition')
    });

    // 返回上一页
    wx.navigateBack();
  },

  // 获取兵书列表
  fetchBooks() {
    if (this.data.loading || !this.data.generalId) return;
    
    this.setData({ loading: true });

    const params = {
      GeneralId: this.data.generalId,
      WarbookType: this.data.categoryMap[this.data.selectedCategory]
    };

    console.log('请求参数:', params);

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');

    wx.request({
      url: `${baseUrl}/v1/book/list`,
      method: 'GET',
      timeout: 5000,
      success: (res) => {
        console.log('请求成功:', res.data);
        if (res.statusCode === 200 && res.data && res.data.WarBookMapList) {
          const currentTypeBooks = res.data.WarBookMapList[this.data.categoryMap[this.data.selectedCategory]];
          
          if (currentTypeBooks) {
            const booksByLevel = {};
            const books = [];
            Object.entries(currentTypeBooks).forEach(([level, bookList]) => {
              if (level === '2' || level === '3') {
                const mappedBooks = bookList.map(book => ({
                  id: book.Id,
                  name: book.Name,
                  type: book.Type,
                  level: parseInt(level),
                  selected: this.data.selectedBooks.some(selected => selected.id === book.Id)
                }));
                booksByLevel[level] = mappedBooks;
                books.push(...mappedBooks);
              }
            });
            
            this.setData({
              booksByLevel,
              books
            });
          }
        } else {
          wx.showToast({
            title: '获取数据失败',
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
        setTimeout(() => {
          this.setData({ loading: false });
        }, 500);
      }
    });
  },

  // 获取品质等级
  getQualityRank(quality) {
    switch (quality) {
      case 1: return 'S';
      case 2: return 'A';
      case 3: return 'B';
      case 4: return 'C';
      default: return 'S';
    }
  },

  // 在确认选择后
  confirmSelect() {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2]; // 获取对战配置页面
    
    // 更新对战配置页面的数据
    prevPage.setData({
      [`characterList[${this.data.characterIndex}].books`]: {
        mainBook: this.data.selectedMainBook,
        subBookMain: this.data.selectedSubBookMain,
        otherSubBooks: this.data.selectedOtherSubBooks
      }
    });

    wx.navigateBack();
  }
})