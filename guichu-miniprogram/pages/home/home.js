var store = require('../../utils/store.js');

Page({
  data: {
    scenes: [], rooms: [], zones: [], events: [],
    dueLine: null, lentLine: null, total: 0,
    q: '', searchOpen: false, zoneHit: null, results: [],
    isHome: true, sceneName: '', searchFocus: false,
    guideTasks: [], guideDone: 0, curUser: { emoji: '👤', name: '未登录', avatar: '' }
  },
  onLoad: function(){ this.setData(require('../../utils/nav.js').info()); },
  onShow: function(){
    this.refresh();
    /* 首次使用自动进入新手引导（每次冷启动最多触发一次，看完/跳过即不再弹） */
    if (!this._guideTried && (!store.db.guide || !store.db.guide.seen)){
      this._guideTried = true;
      wx.navigateTo({ url: '/pages/guide/guide' });
    }
  },
  refresh: function(){
    var db = store.db, sc = store.scene();
    var due = store.dueList(), lent = store.lentList();
    var rooms = store.rooms().map(function(r){
      var n = r.containers.reduce(function(a, c){ return a + c.items.length; }, 0);
      return { id: r.id, name: r.name, hue: r.hue, img: r.panoPath || '', n: n, cs: r.containers.length };
    });
    var zones = db.zones.map(function(z){
      var n = 0; z.containerKeys.forEach(function(k){ var p = k.split('.'); var c = store.findC(p[0], p[1]); if (c) n += c.items.length; });
      return { id: z.id, name: z.name, emoji: z.emoji || '🏷️', n: n };
    });
    var total = store.remindCount();
    /* 新手任务卡：四步全部完成或被收起后不再显示 */
    var gd = db.guide || { seen: false, tasks: {} };
    var gdefs = [
      { id: 'room', icon: '🏠', label: '创建第一个房间', desc: '家、宿舍、办公室都可以', type: 'room' },
      { id: 'cont', icon: '📸', label: '建一个收纳点', desc: '推荐用「拍照认收纳点」', type: 'cont' },
      { id: 'item', icon: '🎒', label: '录入第一件物品', desc: '拍照让 AI 帮你填名字', type: 'item' },
      { id: 'search', icon: '🔍', label: '搜一次东西', desc: '支持拼音 yaoshi 和模糊说法', type: 'search' }
    ];
    var gtasks = gdefs.map(function(d){ return { id: d.id, icon: d.icon, label: d.label, desc: d.desc, type: d.type, done: !!gd.tasks[d.id] }; });
    var gdone = gtasks.filter(function(t){ return t.done; }).length;
    this.setData({
      scenes: db.scenes.map(function(s){ return { id: s.id, name: s.name, emoji: s.emoji || '🏠', active: s.id === sc.id, n: s.rooms.length }; }),
      sceneName: sc.name, isHome: sc.id === 'home',
      rooms: rooms, zones: zones,
      events: db.events,
      dueLine: due[0] ? { name: due[0].it.name, due: due[0].it.expiry <= 1 ? '明天到期' : due[0].it.expiry + '天后到期', where: due[0].room.name + ' · ' + due[0].c.name, roomId: due[0].room.id, cid: due[0].c.id, itemId: due[0].it.id } : null,
      lentLine: lent[0] ? (function(x){
        var days = Math.round((new Date(x.it.lent.due + 'T00:00:00') - store.today()) / 864e5);
        return { name: x.it.name + ' 外借中 · 应还 ' + (days <= 0 ? '今天' : store.fmtDate(days)), where: '借给 ' + x.it.lent.to, roomId: x.room.id, cid: x.c.id, itemId: x.it.id };
      })(lent[0]) : null,
      total: total, itemCount: store.allItems().length, roomCount: rooms.length,
      curUser: (function(mm){ return mm ? { emoji: mm.emoji || '🙂', name: mm.name, avatar: mm.wxAvatar || '' } : { emoji: '👤', name: '未登录', avatar: '' }; })(store.currentMember()),
      guideTasks: (gdone < gtasks.length && !gd.tasks.hide) ? gtasks : [], guideDone: gdone
    });
    if (total > 0) wx.setTabBarBadge({ index: 1, text: String(Math.min(99, total)) });
    else wx.removeTabBarBadge({ index: 1, fail: function(){} });
  },
  onScene: function(e){
    Store_setScene(e.currentTarget.dataset.s);
  },
  onSceneAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=scene' }); },
  onInput: function(e){ this.setData({ q: e.detail.value }); },
  onQuick: function(e){ this.runSearch(e.currentTarget.dataset.q); },
  onGo: function(){ this.runSearch(this.data.q); },
  runSearch: function(q){
    if (!q || !q.trim()) return;
    store.markTask('search'); store.save();
    var r = store.search(q);
    this.setData({ searchOpen: true, zoneHit: r.zoneHit ? { id: r.zoneHit.id, name: r.zoneHit.name, emoji: r.zoneHit.emoji || '🏷️', n: r.zoneHit.containerKeys.length } : null,
      results: r.results.map(function(rs){
        return { name: rs.x.it.name, why: rs.why || '', room: rs.x.room.name, c: rs.x.c.name, roomId: rs.x.room.id, cid: rs.x.c.id, itemId: rs.x.it.id, chips: store.itemChips(rs.x.it) };
      }) });
  },
  closeSearch: function(){ this.setData({ searchOpen: false }); },
  onZone: function(e){ wx.navigateTo({ url: '/pages/view/view?type=zone&id=' + e.currentTarget.dataset.id }); },
  onZoneAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=zone' }); },
  onEvent: function(e){ wx.navigateTo({ url: '/pages/view/view?type=trip&id=' + e.currentTarget.dataset.id }); },
  onEventAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=event' }); },
  onPack: function(){ wx.navigateTo({ url: '/pages/form/form?type=pack' }); },
  onRoom: function(e){ wx.navigateTo({ url: '/pages/room/room?id=' + e.currentTarget.dataset.id }); },
  onRoomAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=room' }); },
  onSwitchUser: function(){ wx.navigateTo({ url: '/pages/switch/switch' }); },
  /* ---------- 新手引导任务 ---------- */
  onGuideStep: function(e){
    var t = e.currentTarget.dataset.type;
    var r0 = store.rooms()[0];
    if (t === 'room' || !r0){ wx.navigateTo({ url: '/pages/form/form?type=room' }); return; }
    if (t === 'cont'){
      wx.navigateTo({ url: '/pages/room/room?id=' + r0.id });
      wx.showToast({ title: '点「🤖 拍照认收纳点」或「＋ 添加收纳点」', icon: 'none', duration: 2500 });
      return;
    }
    if (t === 'item'){
      var c0 = r0.containers[0];
      if (c0) wx.navigateTo({ url: '/pages/form/form?type=item&room=' + r0.id + '&c=' + c0.id });
      else { wx.navigateTo({ url: '/pages/room/room?id=' + r0.id }); wx.showToast({ title: '先建一个收纳点', icon: 'none' }); }
      return;
    }
    if (t === 'search'){
      var that = this;
      this.setData({ searchFocus: true });
      setTimeout(function(){ that.setData({ searchFocus: false }); }, 600);
    }
  },
  onGuideHide: function(){ store.markTask('hide'); store.save(); this.refresh(); },
  onGuideOpen: function(){ wx.navigateTo({ url: '/pages/guide/guide' }); },
  onGeo: function(){
    var hook = null, hookRoom = null;
    store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ if (c.kind === 'checklist' && !hook){ hook = c; hookRoom = r.id; } }); });
    if (hook) wx.navigateTo({ url: '/pages/container/container?room=' + hookRoom + '&cid=' + hook.id });
    else wx.showToast({ title: '先创建打卡类收纳点', icon: 'none' });
  },
  onDueTap: function(e){ wx.navigateTo({ url: '/pages/room/room?id=' + e.currentTarget.dataset.room + '&c=' + e.currentTarget.dataset.c + '&item=' + e.currentTarget.dataset.item }); },
  onResultFly: function(e){
    var d = e.currentTarget.dataset;
    this.setData({ searchOpen: false });
    wx.navigateTo({ url: '/pages/room/room?id=' + d.room + '&c=' + d.c + '&item=' + d.item });
  }
});
function Store_setScene(id){
  store.db.activeScene = id; store.save();
  var pages = getCurrentPages(); var cur = pages[pages.length - 1];
  cur.refresh();
  wx.showToast({ title: '已切换到「' + store.scene().name + '」', icon: 'none' });
}
