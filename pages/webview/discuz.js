const { discuzUrl } = require('../../config/api.js');

Page({
  data: {
    url: discuzUrl
  },
  onLoad(options) {
    console.log('webview options:', options);
    
    // 检查 URL 是否合法
    if (options.url) {
      const decodedUrl = decodeURIComponent(options.url);
      console.log('decoded url:', decodedUrl);
      
      // 确保 URL 使用 HTTPS
      if (decodedUrl.startsWith('https://')) {
        this.setData({ url: decodedUrl });
      } else {
        wx.showToast({
          title: '不支持非 HTTPS 链接',
          icon: 'none'
        });
      }
    }
  },
  
  // 添加错误处理
  bindError(e) {
    console.error('webview error:', e.detail);
    wx.showToast({
      title: '页面加载失败',
      icon: 'none'
    });
  }
})
