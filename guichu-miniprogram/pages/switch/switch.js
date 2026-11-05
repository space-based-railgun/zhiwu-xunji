var store = require('../../utils/store.js');

Page({
  data: { members: [] },
  onShow: function(){ this.refresh(); },
  refresh: function(){
    var cur = store.db.currentUserId;
    this.setData({ members: store.db.members.map(function(m){
      return { id: m.id, name: m.name, emoji: m.emoji || '🙂', role: m.role, pin: !!m.pin, cur: m.id === cur, avatar: m.wxAvatar || '' };
    }) });
  },
  onPick: function(e){
    var that = this;
    var id = e.currentTarget.dataset.id;
    var m = store.db.members.filter(function(x){ return x.id === id; })[0];
    if (!m) return;
    if (m.pin){
      wx.showModal({
        title: m.emoji + ' ' + m.name, editable: true, placeholderText: '输入 4 位 PIN',
        success: function(r){
          if (!r.confirm) return;
          if ((r.content || '').trim() !== m.pin){ wx.showToast({ title: 'PIN 不正确', icon: 'none' }); return; }
          that.enter(id);
        }
      });
      return;
    }
    this.enter(id);
  },
  enter: function(id){
    store.setCurrentUser(id); store.save();
    wx.showToast({ title: '已切换 · ' + store.memberName(id), icon: 'none' });
    wx.navigateBack({ fail: function(){ wx.switchTab({ url: '/pages/home/home' }); } });
  },
  onAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=member' }); }
});
