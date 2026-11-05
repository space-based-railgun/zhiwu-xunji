/* 自定义导航栏公共数据：三个标签页（首页/提醒/设置）使用大字号品牌栏 */
function info(){
  var sbH = 20, barH = 40;
  try{
    var wi = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    if (wi.statusBarHeight) sbH = wi.statusBarHeight;
    var mb = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    if (mb && mb.top && mb.height){
      barH = (mb.top - sbH) * 2 + mb.height;
      if (barH < 36) barH = 36;
    }
  }catch(e){}
  return { sbH: sbH, barH: barH, navPad: sbH + barH };
}
module.exports = { info: info };
