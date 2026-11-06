var store = require('../../utils/store.js');

Page({
  data: {
    title: '', path: '', kindLabel: '', kind: 'default',
    rows: [], expanded: '', aiOn: false,
    aiBusy: false, aiCards: []
  },
  onLoad: function(query){
    this.roomId = query.room; this.cid = query.cid;
    this.highlight = query.item || '';
    this.refresh();
  },
  onShow: function(){
    /* 从录入/编辑页返回时刷新列表（返回不重建页面，需手动刷新） */
    if (store.findC(this.roomId, this.cid)) this.refresh();
  },
  refresh: function(){
    var c = store.findC(this.roomId, this.cid); if (!c) return;
    var roomId = this.roomId, room = store.findRoom(roomId);
    var items = c.items.slice().sort(function(a, b){ return store.IMPRANK[a.imp] - store.IMPRANK[b.imp]; });
    var rows = items.map(function(it){
      var x = store.findItem(it.id);
      return {
        id: it.id, name: it.name, photo: it.photoPath || '', chips: store.itemChips(it),
        done: !!store.db.checklistDone[it.id],
        qty: it.qty != null ? it.qty + (it.unit || '') : '', expiry: it.expiry,
        expiryText: it.expiry ? (it.expiry <= 1 ? '明天到期' : it.expiry + '天后到期') : '',
        expiryPct: it.expiry ? Math.max(5, Math.min(100, it.expiry / 90 * 100)) : 0,
        expiryCol: it.expiry <= 7 ? 'var(--g-bad)' : (it.expiry <= 30 ? 'var(--g-warn)' : 'var(--g-ok)'),
        owner: it.owner && store.OWNLBL[it.owner] ? store.OWNLBL[it.owner][0] : '',
        secret: !!it.secret, emoji: it.emoji || '',
        detail: x ? {
          path: x.sc.name + ' · ' + x.room.name + ' · ' + x.c.name,
          tags: (it.tags || []).map(function(t){ return '#' + t; }).join('  '),
          note: it.note || '', lent: (it.lent && !store.db.returned[it.id]) ? ('外借给 ' + it.lent.to + ' · 应还 ' + it.lent.due) : '',
          ownerName: it.ownerId ? (store.memberName(it.ownerId) || '') : '',
          hist: (it.history || []).slice(0, 4).map(function(h){ return { text: h.text, t: (h.t || '').replace('T', ' ').slice(0, 16) }; })
        } : null,
        discarded: it.status === 'discarded'
      };
    });
    this.setData({
      title: c.name, kind: c.kind || 'default', kindLabel: store.KINDLABEL[c.kind] || '',
      path: room.name + ' · ' + c.name, rows: rows,
      expanded: this.highlight || this.data.expanded,
      aiOn: !!(store.db.ai && store.db.ai.key)
    });
    if (this.highlight) this.highlight = '';
  },
  onExpand: function(e){
    var id = e.currentTarget.dataset.item;
    this.setData({ expanded: this.data.expanded === id ? '' : id });
  },
  onQty: function(e){
    var x = store.findItem(e.currentTarget.dataset.item); if (!x || typeof x.it.qty !== 'number') return;
    x.it.qty = Math.max(0, Math.min(999, x.it.qty + parseInt(e.currentTarget.dataset.d, 10)));
    store.save(); this.refresh();
  },
  onToggleDone: function(e){
    var id = e.currentTarget.dataset.item;
    Store_db().checklistDone[id] = !Store_db().checklistDone[id];
    store.save(); this.refresh();
  },
  onOutOk: function(){
    var c = store.findC(this.roomId, this.cid); if (!c) return;
    c.items.forEach(function(x){ store.db.checklistDone[x.id] = true; });
    store.save(); this.refresh(); wx.showToast({ title: '出门清单已确认 ✓', icon: 'none' });
  },
  onOutHome: function(){
    var c = store.findC(this.roomId, this.cid); if (!c) return;
    c.items.forEach(function(x){ store.db.checklistDone[x.id] = false; });
    store.save(); this.refresh(); wx.showToast({ title: '已复位', icon: 'none' });
  },
  onOwner: function(e){
    var x = store.findItem(e.currentTarget.dataset.item); if (!x) return;
    var order = ['private', 'family', 'shared'];
    x.it.owner = order[(order.indexOf(x.it.owner) + 1) % 3];
    store.save(); this.refresh(); wx.showToast({ title: '权属：' + store.OWNLBL[x.it.owner][0], icon: 'none' });
  },
  onDiscard: function(e){
    var x = store.findItem(e.currentTarget.dataset.item); if (!x) return;
    x.it.status = x.it.status === 'discarded' ? null : 'discarded';
    store.save(); this.refresh();
  },
  onDel: function(e){
    var that = this; var x = store.findItem(e.currentTarget.dataset.item); if (!x) return;
    wx.showModal({
      title: '删除', content: '确定删除「' + x.it.name + '」？', confirmColor: '#cd3d3d',
      success: function(res){
        if (!res.confirm) return;
        x.c.items = x.c.items.filter(function(z){ return z.id !== x.it.id; });
        store.save(); that.refresh();
      }
    });
  },
  onAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=item&room=' + this.roomId + '&c=' + this.cid }); },
  onEditC: function(){ wx.navigateTo({ url: '/pages/form/form?type=container&room=' + this.roomId + '&edit=' + this.cid }); },
  onForm: function(e){
    var d = e.currentTarget.dataset;
    var type = d.type === 'item-edit' ? 'item' : d.type; /* 兼容旧详情按钮的编辑参数 */
    wx.navigateTo({ url: '/pages/form/form?type=' + type + (d.item ? '&item=' + d.item : '') + '&room=' + this.roomId + '&c=' + this.cid });
  },
  /* ---------- AI 识别 ---------- */
  onAI: function(){
    var that = this;
    if (!store.db.ai || !store.db.ai.key){ store.aiGuideModal(); return; }
    wx.showModal({
      title: 'AI 拍照认物品',
      content: '拍一张「这格里面」的照片，AI 会列出看到的物品，你勾选确认后一键入库。靠近拍、光线足、一次拍一层最准。',
      confirmText: '开始拍照',
      success: function(r){ if (r.confirm) that.chooseAndIdentify(); }
    });
  },
  chooseAndIdentify: function(){
    var that = this;
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res){
        that.setData({ aiBusy: true, aiCards: [] });
        store.saveImage(res.tempFiles[0].tempFilePath, 800, function(path){
          store.readDataURL(path, function(dataUrl){
            if (!dataUrl){ that.setData({ aiBusy: false }); wx.showToast({ title: '照片读取失败', icon: 'none' }); return; }
            wx.request({
              url: store.db.ai.url,
              method: 'POST',
              header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.db.ai.key },
              data: {
                model: store.db.ai.model,
                messages: [{ role: 'user', content: [
                  { type: 'text', text: '这是家中一个收纳位置的照片。识别其中最多5件物品，只输出JSON数组：[{"name":"物品名","category":"电子|生活|学习|工具|药品|衣物|证件|玩具|办公|文具","tags":["标签"]}]，不要输出其他文字。' },
                  { type: 'image_url', image_url: { url: dataUrl } }
                ]}]
              },
              success: function(r){
                try{
                  var txt = r.data.choices[0].message.content;
                  var m = txt.match(/\[[\s\S]*\]/);
                  if (!m) throw new Error('无法解析');
                  var cards = JSON.parse(m[0]).slice(0, 5).map(function(x){
                    return { name: x.name || '未命名', cat: x.category || '生活', tags: x.tags || [], keep: true };
                  });
                  /* 入库位置列表（默认当前收纳点，可选其他） */
                  var locs = [];
                  store.rooms().forEach(function(rr){ rr.containers.forEach(function(cc){ locs.push({ roomId: rr.id, cid: cc.id, name: rr.name + ' · ' + cc.name }); }); });
                  var cur = locs.filter(function(l){ return l.roomId === that.roomId && l.cid === that.cid; })[0];
                  var idx = Math.max(0, locs.indexOf(cur));
                  that.aiLocs = locs;
                  that.setData({ aiBusy: false, aiCards: cards, aiPhoto: path,
                    aiLocs: locs.map(function(l){ return l.name; }), aiLocIdx: idx, aiLocName: locs[idx] ? locs[idx].name : '' });
                }catch(e){
                  that.setData({ aiBusy: false });
                  wx.showToast({ title: '识别失败：' + (e.message || ''), icon: 'none' });
                }
              },
              fail: function(){
                that.setData({ aiBusy: false });
                wx.showToast({ title: '请求失败：检查网络/域名白名单', icon: 'none' });
              }
            });
          });
        });
      }
    });
  },
  onAiName: function(e){
    var i = e.currentTarget.dataset.i;
    if (this.data.aiCards[i]) this.data.aiCards[i].name = e.detail.value;
  },
  onAiCat: function(e){
    var i = e.currentTarget.dataset.i;
    if (this.data.aiCards[i]) this.data.aiCards[i].cat = e.detail.value;
  },
  onAiKeep: function(e){
    var i = e.currentTarget.dataset.i;
    var cards = this.data.aiCards; cards[i].keep = !cards[i].keep;
    this.setData({ aiCards: cards });
  },
  onAiLoc: function(e){
    var i = parseInt(e.detail.value, 10);
    this.setData({ aiLocIdx: i, aiLocName: this.data.aiLocs[i] });
  },
  onAiConfirm: function(){
    var c = store.findC(this.roomId, this.cid); if (!c) return;
    var n = 0;
    var targetRoomId = this.roomId, targetCid = this.cid;
    if (this.data.aiLocs && this.data.aiLocs.length && this.aiLocs){
      var chosen = this.aiLocs[this.data.aiLocIdx];
      if (chosen && (chosen.roomId !== this.roomId || chosen.cid !== this.cid)){
        targetRoomId = chosen.roomId; targetCid = chosen.cid;
      }
    }
    var targetC = store.findC(targetRoomId, targetCid); if (!targetC) return;
    var targetRoom = store.findRoom(targetRoomId);
    this.data.aiCards.forEach(function(cd){
      if (!cd.keep || !cd.name.trim()) return;
      targetC.items.push({ id: store.uid('i'), name: cd.name.trim(), imp: 'normal', owner: 'private',
        tags: [cd.cat].concat(cd.tags || []), cons: false, qty: 1, note: '',
        photoPath: this.data.aiPhoto || '', history: [{ t: new Date().toISOString(), text: '录入（AI 识别）' }] });
      n++;
    }, this);
    Store_db().lastCat = (this.data.aiCards[0] && this.data.aiCards[0].cat) || Store_db().lastCat;
    store.save(); this.setData({ aiCards: [] });
    if (targetRoomId !== this.roomId){
      wx.showToast({ title: '已入库 ' + n + ' 件到 ' + targetRoom.name + ' · ' + targetC.name, icon: 'none' });
      wx.redirectTo({ url: '/pages/container/container?room=' + targetRoomId + '&cid=' + targetCid });
    } else {
      this.refresh();
      wx.showToast({ title: 'AI 已入库 ' + n + ' 件 ✓', icon: 'none' });
    }
  }
});
function Store_db(){ return store.db; }
