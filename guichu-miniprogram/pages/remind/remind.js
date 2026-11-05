var store = require('../../utils/store.js');

Page({
  data: { sections: [] },
  onLoad: function(){ this.setData(require('../../utils/nav.js').info()); },
  onShow: function(){ this.refresh(); },
  refresh: function(){
    var due = store.dueList(), lent = store.lentList(), rs = store.restockList(), custom = store.customDueList();
    var sections = [];
    var basket = store.basketList();
    if (basket.length) sections.push({ title: '🧺 购物清单', clear: true, rows: basket.map(function(x){
      return { key: x.it.id, icon: '🧺', name: x.it.name, sub: x.room.name + ' · ' + x.c.name, badge: '待买',
        badgeCls: 'background:var(--g-brandsoft);color:var(--g-brand)',
        roomId: x.room.id, cid: x.c.id, itemId: x.it.id, action: '移出', actionData: x.it.id, act: 'basket' };
    }) });
    sections.push({ title: '⏰ 临期提醒', rows: due.slice(0, 5).map(function(x){
      return { key: x.it.id, icon: '📦', name: x.it.name, sub: x.it.expiry + '天 · ' + x.c.name, badge: x.it.expiry <= 1 ? '明天到期' : x.it.expiry + '天后到期',
        badgeCls: x.it.expiry <= 7 ? 'background:var(--g-bad);color:#fff' : 'background:var(--g-warn);color:#fff',
        roomId: x.room.id, cid: x.c.id, itemId: x.it.id, action: '顺延7天', actionData: x.it.id, act: 'defer' };
    }) });
    sections.push({ title: '🤝 借出归还', rows: lent.map(function(x){
      var days = Math.round((new Date(x.it.lent.due + 'T00:00:00') - store.today()) / 864e5);
      return { key: x.it.id, icon: '📦', name: x.it.name, sub: '借给 ' + x.it.lent.to + ' · 应还 ' + (days <= 0 ? '今天' : store.fmtDate(days)), badge: '借出', badgeCls: '',
        roomId: x.room.id, cid: x.c.id, itemId: x.it.id, action: '已归还', actionData: x.it.id };
    }) });
    sections.push({ title: '🔔 自定义 / 周期盘点', rows: custom.map(function(x){
      return { key: x.r.id, icon: '🔔', name: x.r.title, sub: (x.r.repeat === 'quarter' ? '每 3 个月 · ' : x.r.repeat === 'year' ? '每年 · ' : '') + store.fmtDate(x.due), badge: x.due + '天', badgeCls: 'background:var(--g-brandsoft);color:var(--g-brand)',
        roomId: x.r.room, cid: x.r.c, itemId: '', action: '删除', actionData: x.r.id, act: 'delr' };
    }) });
    sections.push({ title: '🧺 库存补货', rows: rs.map(function(x){
      return { key: x.it.id, icon: '📦', name: x.it.name, sub: '仅剩 ' + x.it.qty + (x.it.unit || '') + ' · ' + x.room.name + ' ' + x.c.name, badge: '补货', badgeCls: '',
        roomId: x.room.id, cid: x.c.id, itemId: x.it.id, action: '加入清单', actionData: x.it.id, act: 'basket' };
    }) });
    this.setData({ sections: sections });
    var n = store.remindCount();
    if (n > 0) wx.setTabBarBadge({ index: 1, text: String(Math.min(99, n)) });
    else wx.removeTabBarBadge({ index: 1, fail: function(){} });
  },
  onRow: function(e){
    var d = e.currentTarget.dataset;
    if (!d.room) return;
    wx.navigateTo({ url: '/pages/room/room?id=' + d.room + '&c=' + d.c + '&item=' + d.item });
  },
  onAction: function(e){
    var d = e.currentTarget.dataset;
    var that = this;
    if (d.act === 'delr'){
      store.db.customReminders = store.db.customReminders.filter(function(r){ return r.id !== d.actiondata; });
      store.save(); this.refresh(); wx.showToast({ title: '提醒已删除', icon: 'none' });
    } else if (d.act === 'basket'){
      store.toggleBasket(d.item);
      store.save(); this.refresh();
      wx.showToast({ title: store.db.shopping[d.item] ? '已加入购物清单 🧺' : '已移出清单', icon: 'none' });
    } else if (d.act === 'defer'){
      var y = store.findItem(d.item);
      if (!y) return;
      y.it.expiry = (y.it.expiry || 0) + 7;
      store.save(); this.refresh(); wx.showToast({ title: '已顺延 7 天', icon: 'none' });
    } else {
      /* 已归还 */
      var x = store.findItem(d.item);
      if (!x) return;
      store.db.returned[d.item] = true;
      store.db.ledger.unshift({ id: store.uid('l'), text: x.it.name + ' → ' + x.it.lent.to, date: store.today().toISOString().slice(0, 10), returned: true });
      store.save(); this.refresh(); wx.showToast({ title: '已确认归还 ✓', icon: 'none' });
    }
  },
  onAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=reminder' }); },
  onBasketClear: function(){
    var that = this;
    wx.showModal({
      title: '清空购物清单', content: '确定移出全部物品？', confirmColor: '#cd3d3d',
      success: function(r){
        if (!r.confirm) return;
        store.clearBasket(); store.save(); that.refresh();
        wx.showToast({ title: '已清空', icon: 'none' });
      }
    });
  }
});
