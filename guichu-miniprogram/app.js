/* 知物寻迹 —— 小程序入口 */
var store = require('./utils/store.js');

App({
  onLaunch: function(){
    store.load();
    if (store.db.lock) {
      wx.reLaunch({ url: '/pages/lock/lock' });
    }
  }
});
