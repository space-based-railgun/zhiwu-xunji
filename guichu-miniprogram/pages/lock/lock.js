var store = require('../../utils/store.js');

function djb2(pin, salt){
  var input = salt + '|' + pin, h = 5381;
  for (var i = 0; i < input.length; i++){ h = ((h << 5) + h + input.charCodeAt(i)) | 0; }
  return 'djb2:' + (h >>> 0).toString(16);
}

Page({
  data: { pin: '', err: '', keys: ['1','2','3','4','5','6','7','8','9','del','0','ok'] },
  onKey: function(e){
    var k = e.currentTarget.dataset.k;
    var pin = this.data.pin;
    if (k === 'del') pin = pin.slice(0, -1);
    else if (k === 'ok'){ this.tryUnlock(); return; }
    else if (/^\d$/.test(k) && pin.length < 6) pin += k;
    this.setData({ pin: pin, err: '' });
    if (pin.length >= 6) this.tryUnlock();
  },
  tryUnlock: function(){
    var that = this;
    var pin = this.data.pin;
    if (!/^\d{4,6}$/.test(pin)){ this.setData({ err: '请输入 4-6 位数字', pin: '' }); return; }
    var lock = store.db.lock || { hash: '', salt: '' };
    if (djb2(pin, lock.salt) === lock.hash){
      wx.switchTab({ url: '/pages/home/home' });
    } else {
      this.setData({ err: 'PIN 不正确', pin: '' });
      wx.vibrateShort({ type: 'medium', fail: function(){} });
    }
  }
});
