var store = require('../../utils/store.js');

Page({
  data: { type: '', title: '', rows: [], box: '' },
  onLoad: function(query){
    this.type = query.type; this.param = query.id || query.box || '';
    this.build();
  },
  build: function(){
    var rows = [];
    var title = '';
    if (this.type === 'zone'){
      var z = store.db.zones.filter(function(x){ return x.id === this.param; }, this)[0];
      if (!z) return;
      title = (z.emoji || '🏷️') + ' ' + z.name;
      z.containerKeys.forEach(function(k){
        var p = k.split('.'), c = store.findC(p[0], p[1]), r = store.findRoom(p[0]);
        if (!c) return;
        rows.push({ key: k, icon: c.emoji || '📦', name: c.name, sub: r.name + ' · ' + c.items.length + ' 件', roomId: r.id, cid: c.id,
          items: c.items.map(function(it){ return it.name; }) });
      });
      this.zoneId = z.id;
    }
    else if (this.type === 'trip'){
      var ev = store.db.events.filter(function(x){ return x.id === this.param; }, this)[0];
      if (!ev) return;
      title = (ev.emoji || '📅') + ' ' + ev.title + ' · ' + ev.date;
      this.eventId = ev.id;
      store.eventChecklist(ev).forEach(function(x){
        rows.push({ key: x.it.id, icon: x.c.emoji || '📦', name: x.it.name, sub: x.room.name + ' · ' + x.c.name, roomId: x.room.id, cid: x.c.id, itemId: x.it.id,
          warn: (x.it.lent && !store.db.returned[x.it.id]) ? '外借中 · 记得取回' : '' });
      });
      this.tripRows = rows.length;
    }
    else if (this.type === 'box'){
      title = '📦 ' + this.param;
      this.box = this.param;
      store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){
        var packed = c.items.filter(function(it){ return it.status === 'packed' && it.box === this.param; }, this);
        if (!packed.length) return;
        rows.push({ key: c.id, icon: '📦', name: r.name + ' · ' + c.name, sub: packed.map(function(it){ return it.name; }).join('、'), roomId: r.id, cid: c.id, isGroup: true });
      }, this); });
    }
    this.setData({ type: this.type, title: title, rows: rows, box: this.box || '' });
  },
  onJump: function(e){
    var d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/container/container?room=' + d.room + '&cid=' + d.cid + (d.item ? '&item=' + d.item : '') });
  },
  onDelZone: function(){
    var that = this;
    wx.showModal({ title: '删除分区', content: '分区删除后物品不受影响', confirmColor: '#cd3d3d',
      success: function(res){
        if (!res.confirm) return;
        store.db.zones = store.db.zones.filter(function(z){ return z.id !== that.zoneId; });
        store.save(); wx.navigateBack();
      } });
  },
  onDelEvent: function(){
    var that = this;
    wx.showModal({ title: '删除日程', content: '确定删除该日程？', confirmColor: '#cd3d3d',
      success: function(res){
        if (!res.confirm) return;
        store.db.events = store.db.events.filter(function(x){ return x.id !== that.eventId; });
        store.save(); wx.navigateBack();
      } });
  },
  onUnpack: function(){
    var that = this; var box = this.box; var m = 0;
    store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){ if (it.status === 'packed' && it.box === box){ it.status = null; it.box = null; m++; } }); }); });
    store.save(); wx.showToast({ title: '已开箱 ' + m + ' 件', icon: 'none' });
    setTimeout(function(){ wx.navigateBack(); }, 600);
  },
  onCopyList: function(){
    var txt = this.data.rows.map(function(r){ return r.name + '：' + r.sub; }).join('\n');
    wx.setClipboardData({ data: '【' + this.data.title + '】\n' + txt });
  }
});
