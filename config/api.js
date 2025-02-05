// API域名配置
const config = {
  // 开发环境
  development: {
    baseUrl: 'https://3game.tech:8443',
    discuzUrl: 'https://3game.tech'
  },
  // 生产环境 
  production: {
    baseUrl: 'https://3game.tech:8443',
    discuzUrl: 'https://3game.tech'
  }
};

// 根据环境返回对应配置
const env = __wxConfig.envVersion || 'release';
const isDev = ['develop', 'trial'].includes(env);
const apiConfig = isDev ? config.development : config.production;

module.exports = {
  baseUrl: apiConfig.baseUrl,
  discuzUrl: apiConfig.discuzUrl
}; 