var store = require('../../utils/store.js');

var IMP_OPTS = ['daily', 'vital', 'normal', 'dormant'];
var IMP_LABELS = ['高频常用', '低频但重要', '普通', '换季冬眠'];
var OWNER_OPTS = ['private', 'family', 'shared'];
var OWNER_LABELS = ['私有', '家庭共享', '公共'];
var KIND_OPTS = ['default', 'stock', 'checklist', 'archive', 'kids'];
var KIND_LABELS = ['普通列表', '库存（数量/效期）', '打卡（出门清单）', '档案（保密）', '趣味（儿童）'];
var ROW_OPTS = [0.42, 0.58, 0.68];
var ROW_LABELS = ['较高处（如挂钩）', '中部', '较低处（如抽屉）'];
var HUES = [28, 48, 130, 170, 215, 262, 345];
var HUE_NAMES = ['暖木色', '明亮黄', '清新绿', '青碧色', '沉稳蓝', '雅紫', '玫红'];
var CATS = ['电子', '生活', '学习', '工具', '药品', '衣物', '证件', '玩具', '办公', '文具'];
var CONT_EMOJIS = ['📦', '🗄️', '🧰', '🚪', '🛏️', '🧺', '👚', '👟', '💼', '🎧', '💻', '🔌', '💊', '📖', '✏️', '🧸', '🍳', '🔑'];
var GEN_EMOJIS = ['🏠', '🏡', '🏢', '🏷️', '🎒', '🧳', '🚗', '✈️', '📅', '⛺', '🏥', '📚', '🎁', '🎂', '🐶', '💻'];
var MEMBER_EMOJIS = ['🙂', '👩', '👨', '🧑', '👵', '👴', '👧', '👦', '🐶', '🐱', '🦊', '🐼', '🌟', '🚀', '🍀', '🎨'];

Page({
  data: {
    type: '', title: '', hint: '',
    f: {}, opt: {}, showSave: true,
    rooms: [], conts: [], zoneFlags: [],
    photoPath: '', contsForMove: []
  },
  onLoad: function(query){
    this.type = query.type;
    this.query = query;
    this.build(query);
  },
  build: function(query){
    var db = store.db, data = { type: this.type, adv: false, hint: '' };
    var t = this.type;
    if (t === 'item'){
      this.roomId = query.room; this.cid = query.c;
      var c = store.findC(this.roomId, this.cid);
      var it = query.item ? (store.findItem(query.item) || {}).it : null;
      data.title = (it ? '编辑物品' : '添加物品') + ' · ' + (c ? c.name : '');
      data.hint = it ? '' : (query.cont ? '上一件已保存 ✓ 正在连续录入：继续填名字保存即可；不想连续录，在「更多选项」取消勾选最后一项。' : '正在给「' + (c ? c.name : '') + '」添加一件物品：填个名字就能保存，其他以后再补也行。');
      data.f = { name: it ? it.name : '', impIdx: it ? IMP_OPTS.indexOf(it.imp) : 2, ownerIdx: it ? OWNER_OPTS.indexOf(it.owner || 'private') : 0, tags: it ? (it.tags || []).join(',') : '', cons: it ? !!it.cons : false, qty: it && it.qty != null ? String(it.qty) : '1', unit: it ? (it.unit || '') : '', expiry: it && it.expiry != null ? String(it.expiry) : '', note: it ? (it.note || '') : '', cont: db.contEntry && !it };
      data.photoPath = it ? (it.photoPath || '') : '';
      data.editId = it ? it.id : '';
    }
    else if (t === 'container'){
      this.roomId = query.room;
      var r = store.findRoom(this.roomId);
      var c = query.edit ? store.findC(this.roomId, query.edit) : null;
      data.title = (c ? '编辑收纳点' : '添加收纳点') + ' · ' + (r ? r.name : '');
      data.emojis = CONT_EMOJIS;
      data.hint = c ? '' : '一个收纳点 = 一个柜子 / 抽屉 / 盒子。取个好认的名字就行，其他以后再改。';
      data.f = { name: c ? c.name : '', kindIdx: c ? KIND_OPTS.indexOf(c.kind) : 0, emoji: c ? (c.emoji || '') : '📦', yaw: c ? c.yaw : 180, rowIdx: c ? ROW_OPTS.indexOf(c.row || 0.58) : 1 };
      data.zoneFlags = db.zones.map(function(z){
        var on = c ? z.containerKeys.indexOf(query.room + '.' + c.id) >= 0 : false;
        return { id: z.id, name: z.emoji + ' ' + z.name, on: on };
      });
      data.photoPath = c ? (c.photoPath || '') : '';
      data.editId = c ? c.id : '';
    }
    else if (t === 'room'){
      this.roomId = query.edit || '';
      var r2 = this.roomId ? store.findRoom(this.roomId) : null;
      data.title = r2 ? '编辑房间' : '添加房间';
      data.f = { name: r2 ? r2.name : '', hueIdx: r2 ? HUES.indexOf(r2.hue) : 4 };
      data.hueNames = HUE_NAMES;
    }
    else if (t === 'scene'){ data.title = '添加住址'; data.emojis = GEN_EMOJIS; data.f = { name: '', emoji: '🏠' }; }
    else if (t === 'zone'){ data.title = '添加逻辑分区'; data.emojis = GEN_EMOJIS; data.f = { name: '', emoji: '🏷️' }; }
    else if (t === 'event'){ data.title = '添加日程（自动联想备物）'; data.emojis = GEN_EMOJIS; data.f = { title: '', date: store.fmtDate(1) ? new Date(Date.now() + 864e5).toISOString().slice(0, 10) : '', emoji: '📅' }; data.today = new Date().toISOString().slice(0, 10); }
    else if (t === 'lend'){
      var x1 = store.findItem(query.item);
      data.title = '标记外借 · ' + (x1 ? x1.it.name : '');
      data.f = { to: '', due: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) };
      data.today = new Date().toISOString().slice(0, 10);
      this.itemId = query.item;
    }
    else if (t === 'move'){
      var x2 = store.findItem(query.item);
      data.title = '移动 · ' + (x2 ? x2.it.name : '');
      var rooms = store.rooms();
      data.rooms = rooms.map(function(r){ return r.name; });
      data.roomIdx = rooms.indexOf(x2.room);
      data.contsForMove = x2.room.containers.map(function(c){ return c.name; });
      data.contIdx = x2.room.containers.indexOf(x2.c);
      this.itemId = query.item;
    }
    else if (t === 'reminder'){
      data.title = '添加提醒';
      data.f = { title: '', date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), repeatIdx: 0 };
      data.today = new Date().toISOString().slice(0, 10);
      this.roomId = query.room || ''; this.cid = query.c || '';
    }
    else if (t === 'ai'){
      var ai = db.ai || {};
      data.title = 'AI 识别配置';
      data.f = { url: ai.url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions', key: ai.key || '', model: ai.model || 'glm-4v-flash' };
      data.showSave = true;
    }
    else if (t === 'lockset'){ data.title = '设置应用锁'; data.f = { pin1: '', pin2: '' }; }
    else if (t === 'pack'){
      data.title = '📦 搬家打包';
      data.showSave = false;
      var boxes = {};
      store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){ if (it.status === 'packed') boxes[it.box] = (boxes[it.box] || 0) + 1; }); }); });
      var next = '纸箱' + (Object.keys(boxes).length + 1);
      data.packRows = [];
      store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){
        if (!c.items.length) return;
        var packed = c.items[0].status === 'packed';
        data.packRows.push({ room: r.name, roomId: r.id, cname: c.name, cid: c.id, packed: packed, box: packed ? c.items[0].box : '', n: c.items.length, next: next });
      });});
      data.boxNames = Object.keys(boxes);
    }
    else if (t === 'member'){
      var m9 = query.edit ? (db.members.filter(function(x){ return x.id === query.edit; })[0] || null) : null;
      if (query.edit && !m9){ wx.navigateBack(); return; }
      data.title = m9 ? '编辑成员' : '添加成员';
      data.emojis = MEMBER_EMOJIS;
      data.hint = '成员是这台设备上的使用身份。绑定微信头像/昵称后，开通云同步即可对应到家人账号。';
      data.f = { name: m9 ? m9.name : '', emoji: m9 ? (m9.emoji || '🙂') : '🙂', pin: m9 && m9.pin ? m9.pin : '', wxName: m9 ? (m9.wxName || '') : '' };
      data.wxAvatar = m9 ? (m9.wxAvatar || '') : '';
      data.editMember = m9 ? m9.id : '';
    }
    else if (t === 'packone'){
      var c9 = store.findC(query.room, query.cid);
      if (!c9){ wx.navigateBack(); return; }
      data.title = '📦 打包 · ' + c9.name;
      data.hint = '保存后，这个收纳点的 ' + c9.items.length + ' 件物品会全部标记为已打包，装进下面的纸箱。搬完点击箱子可整箱开箱。';
      data.f = { box: '纸箱' + (Object.keys(packBoxes()).length + 1) };
    }
    data.contEntry = db.contEntry;
    data.impLabels = IMP_LABELS; data.ownerLabels = OWNER_LABELS; data.kindLabels = KIND_LABELS; data.rowLabels = ROW_LABELS; data.cats = CATS;
    this.setData(data);
  },
  bindF: function(e){
    var key = e.currentTarget.dataset.k;
    var patch = {}; patch['f.' + key] = e.detail.value;
    this.setData(patch);
  },
  onAdv: function(){ this.setData({ adv: !this.data.adv }); },
  onEmoji: function(e){ this.setData({ 'f.emoji': e.currentTarget.dataset.e }); },
  /* AI 配置助手：复制注册网址 / 从剪贴板一键填 Key */
  /* 绑定微信头像（官方「头像昵称填写能力」，无需额外授权） */
  onWxAvatar: function(e){
    var that = this;
    var p = e.detail && e.detail.avatarUrl;
    if (!p) return;
    store.saveImage(p, 200, function(path){ that.setData({ wxAvatar: path }); });
  },
  /* 删除成员：物品保留、录入人标记清空；至少保留一个成员 */
  onDeleteMember: function(){
    var db = store.db, id = this.data.editMember;
    var m = db.members.filter(function(x){ return x.id === id; })[0];
    if (!m) return;
    var that = this;
    if (db.members.length <= 1){ wx.showToast({ title: '至少保留一个成员', icon: 'none' }); return; }
    var owned = 0;
    db.scenes.forEach(function(s){ s.rooms.forEach(function(r){ r.containers.forEach(function(c){
      c.items.forEach(function(it){ if (it.ownerId === id) owned++; });
    }); }); });
    wx.showModal({
      title: '删除成员「' + m.name + '」',
      content: owned ? ('ta 名下有 ' + owned + ' 件物品，删除后物品保留、仅清除录入人标记。') : '确定删除该成员？',
      confirmColor: '#cd3d3d',
      success: function(r){
        if (!r.confirm) return;
        db.scenes.forEach(function(s){ s.rooms.forEach(function(rr){ rr.containers.forEach(function(c){
          c.items.forEach(function(it){ if (it.ownerId === id) it.ownerId = null; });
        }); }); });
        db.members = db.members.filter(function(x){ return x.id !== id; });
        if (db.currentUserId === id) db.currentUserId = null;
        store.save();
        wx.showToast({ title: '已删除', icon: 'none' });
        wx.navigateBack();
      }
    });
  },
  onCopyAiUrl: function(){
    wx.setClipboardData({ data: 'https://open.bigmodel.cn', success: function(){ wx.showToast({ title: '网址已复制，去浏览器打开注册', icon: 'none', duration: 2500 }); } });
  },
  onPasteKey: function(){
    var that = this;
    wx.getClipboardData({
      success: function(r){
        var t = (r.data || '').trim();
        if (/^[0-9a-fA-F]{32}\.[A-Za-z0-9]{16}$/.test(t)){
          that.setData({ 'f.key': t });
          wx.showToast({ title: '已填入，点保存即可 ✓', icon: 'none' });
        } else {
          wx.showToast({ title: '剪贴板里没有 Key，请先去复制', icon: 'none' });
        }
      },
      fail: function(){ wx.showToast({ title: '读取剪贴板失败', icon: 'none' }); }
    });
  },
  /* 拍照让 AI 预填当前物品（名称/标签/照片），用户确认后保存 */
  onAiFill: function(){
    var that = this;
    if (!store.db.ai || !store.db.ai.key){ store.aiGuideModal(); return; }
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res){
        wx.showLoading({ title: 'AI 识别中…', mask: true });
        store.saveImage(res.tempFiles[0].tempFilePath, 800, function(path){
          store.readDataURL(path, function(dataUrl){
            if (!dataUrl){ wx.hideLoading(); wx.showToast({ title: '照片读取失败', icon: 'none' }); return; }
            wx.request({
              url: store.db.ai.url, method: 'POST',
              header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.db.ai.key },
              data: { model: store.db.ai.model, messages: [{ role: 'user', content: [
                { type: 'text', text: '识别照片中最主要的一件物品。只输出JSON：{"name":"物品名","category":"电子|生活|学习|工具|药品|衣物|证件|玩具|办公|文具","tags":["标签","标签2"]}，不要输出其他文字。' },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]}] },
              success: function(r){
                wx.hideLoading();
                try{
                  var m = r.data.choices[0].message.content.match(/\{[\s\S]*\}/);
                  var o = JSON.parse(m[0]);
                  that.setData({ 'f.name': o.name || '', 'f.tags': [o.category].concat(o.tags || []).filter(Boolean).join(','), photoPath: path });
                  wx.showToast({ title: '已填好，请确认', icon: 'none' });
                }catch(e){ wx.showToast({ title: '没认出来，手动填吧', icon: 'none' }); }
              },
              fail: function(){ wx.hideLoading(); wx.showToast({ title: 'AI 连不上：检查网络；真机需配置域名或开调试', icon: 'none', duration: 2500 }); }
            });
          });
        });
      }
    });
  },
  onRoomMove: function(e){
    var idx = parseInt(e.detail.value, 10);
    var r = store.rooms()[idx];
    this.setData({ roomIdx: idx, contsForMove: r.containers.map(function(c){ return c.name; }), contIdx: 0 });
    this.moveRoom = r;
  },
  onPhoto: function(){
    var that = this;
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res){
        wx.showLoading({ title: '压缩中…' });
        store.saveImage(res.tempFiles[0].tempFilePath, 800, function(path){
          wx.hideLoading();
          that.setData({ photoPath: path });
        });
      }
    });
  },
  onZoneFlag: function(e){
    var i = e.currentTarget.dataset.i;
    var z = this.data.zoneFlags; z[i].on = !z[i].on;
    this.setData({ zoneFlags: z });
  },
  onSave: function(){
    try{ this._save(); }
    catch(e){ wx.showToast({ title: '保存出错：' + (e.message || e), icon: 'none', duration: 2500 }); }
  },
  _save: function(){
    var f = this.data.f, t = this.type, db = store.db;
    var that = this;
    if (t === 'item'){
      var c = store.findC(this.roomId, this.cid);
      if (!c){ wx.showToast({ title: '入口参数异常，请返回后重新进入', icon: 'none', duration: 2500 }); return; }
      if (!f.name || !f.name.trim()){
        var self1 = this;
        wx.showToast({ title: '请先填写物品名称', icon: 'none', duration: 2500 });
        this.setData({ nameFocus: true });
        setTimeout(function(){ self1.setData({ nameFocus: false }); }, 400);
        return;
      }
      var tags = (f.tags || '').split(/[,，]/).map(function(s){ return s.trim(); }).filter(Boolean);
      if (this.data.editId){
        var x = store.findItem(this.data.editId);
        x.it.name = f.name; x.it.imp = IMP_OPTS[f.impIdx]; x.it.owner = OWNER_OPTS[f.ownerIdx];
        x.it.tags = tags; x.it.cons = f.cons; x.it.qty = parseInt(f.qty, 10) || 0; x.it.unit = f.unit;
        x.it.expiry = f.expiry ? parseInt(f.expiry, 10) : null; x.it.note = f.note;
        if (this.data.photoPath) x.it.photoPath = this.data.photoPath;
      } else {
        c.items.push({ id: store.uid('i'), name: f.name, imp: IMP_OPTS[f.impIdx], owner: OWNER_OPTS[f.ownerIdx],
          tags: tags, cons: f.cons, qty: parseInt(f.qty, 10) || 0, unit: f.unit, expiry: f.expiry ? parseInt(f.expiry, 10) : null,
          note: f.note, photoPath: this.data.photoPath || '', ownerId: db.currentUserId || null,
          history: [{ t: new Date().toISOString(), text: '录入于 ' + (store.findRoom(this.roomId) || {}).name + ' · ' + c.name }] });
        db.lastCat = tags[0] || db.lastCat;
        store.markTask('item');
      }
      store.save(); wx.showToast({ title: '已保存', icon: 'success' });
      if (f.cont && !this.data.editId){ wx.redirectTo({ url: '/pages/form/form?type=item&room=' + this.roomId + '&c=' + this.cid + '&cont=1' }); return; }
      wx.navigateBack();
    }
    else if (t === 'container'){
      var r = store.findRoom(this.roomId); if (!r) return;
      if (!f.name || !f.name.trim()){ wx.showToast({ title: '请先填写收纳点名称', icon: 'none' }); return; }
      var that2 = this;
      var key = this.roomId + '.' + (this.data.editId || '');
      if (this.data.editId){
        var c2 = store.findC(this.roomId, this.data.editId);
        c2.name = f.name; c2.kind = KIND_OPTS[f.kindIdx]; c2.emoji = f.emoji; c2.yaw = f.yaw; c2.row = ROW_OPTS[f.rowIdx];
        if (this.data.photoPath) c2.photoPath = this.data.photoPath;
        db.zones.forEach(function(z){
          var i = z.containerKeys.indexOf(key);
          var want = that_zoneOn(that2, z.id);
          if (want && i < 0) z.containerKeys.push(key);
          if (!want && i >= 0) z.containerKeys.splice(i, 1);
        });
      } else {
        var nc = { id: store.uid('c'), name: f.name, kind: KIND_OPTS[f.kindIdx], yaw: f.yaw, row: ROW_OPTS[f.rowIdx], emoji: f.emoji || '📦', photoPath: this.data.photoPath || '', items: [] };
        r.containers.push(nc);
        store.markTask('cont');
        db.zones.forEach(function(z){ if (that_zoneOn(that2, z.id)) z.containerKeys.push(that2.roomId + '.' + nc.id); });
      }
      store.save(); wx.navigateBack();
    }
    else if (t === 'room'){
      if (!f.name || !f.name.trim()){ wx.showToast({ title: '请先填写房间名称', icon: 'none' }); return; }
      if (this.roomId){
        var r3 = store.findRoom(this.roomId); r3.name = f.name; r3.hue = HUES[f.hueIdx];
      } else {
        var sc = store.scene();
        var nr = { id: store.uid('r'), name: f.name, hue: HUES[f.hueIdx], containers: [] };
        sc.rooms.push(nr);
        store.markTask('room');
        store.save(); wx.redirectTo({ url: '/pages/room/room?id=' + nr.id }); return;
      }
      store.save(); wx.navigateBack();
    }
    else if (t === 'scene'){
      if (!f.name || !f.name.trim()){ wx.showToast({ title: '请先填写名称', icon: 'none' }); return; }
      db.scenes.push({ id: store.uid('s'), name: f.name, emoji: f.emoji || '🏠', rooms: [] });
      store.save(); wx.navigateBack(); 
    }
    else if (t === 'zone'){
      if (!f.name || !f.name.trim()){ wx.showToast({ title: '请先填写名称', icon: 'none' }); return; }
      db.zones.push({ id: store.uid('z'), name: f.name, emoji: f.emoji || '🏷️', containerKeys: [] });
      store.save(); wx.navigateBack();
    }
    else if (t === 'event'){
      if (!f.title || !f.title.trim()){ wx.showToast({ title: '请先填写日程标题', icon: 'none' }); return; }
      db.events.unshift({ id: store.uid('e'), emoji: f.emoji || '📅', title: f.title, date: f.date });
      store.save(); wx.navigateBack();
    }
    else if (t === 'lend'){
      if (!f.to || !f.to.trim()){ wx.showToast({ title: '请填写借给谁', icon: 'none' }); return; }
      var x4 = store.findItem(this.itemId);
      x4.it.lent = { to: f.to, due: f.due };
      delete db.returned[this.itemId];
      db.ledger.unshift({ id: store.uid('l'), text: x4.it.name + ' → ' + f.to, date: f.due, returned: false });
      store.save(); wx.navigateBack();
    }
    else if (t === 'move'){
      var x5 = store.findItem(this.itemId);
      var targetRoom = store.rooms()[this.data.roomIdx];
      var targetC = targetRoom.containers[this.data.contIdx];
      if (targetC.id === x5.c.id){ wx.showToast({ title: '已在该收纳点', icon: 'none' }); return; }
      var from = x5.room.name + ' · ' + x5.c.name;
      var iid = this.itemId;
      x5.c.items = x5.c.items.filter(function(z){ return z.id !== iid; });
      targetC.items.push(x5.it);
      if (x5.it.status === 'packed'){ x5.it.status = null; x5.it.box = null; }
      x5.it.history = x5.it.history || [];
      x5.it.history.unshift({ t: new Date().toISOString(), text: '从 ' + from + ' 移到 ' + targetRoom.name + ' · ' + targetC.name });
      store.save(); wx.navigateBack();
    }
    else if (t === 'reminder'){
      if (!f.title || !f.title.trim()){ wx.showToast({ title: '请先填写提醒内容', icon: 'none' }); return; }
      db.customReminders.push({ id: store.uid('r'), title: f.title, date: f.date, repeat: ['none', 'quarter', 'year'][f.repeatIdx || 0], room: this.roomId || '', c: this.cid || '' });
      store.save(); wx.navigateBack();
    }
    else if (t === 'ai'){
      db.ai = f.key ? { url: f.url, key: f.key, model: f.model || 'glm-4v-flash' } : null;
      store.save(); wx.navigateBack(); wx.showToast({ title: db.ai ? 'AI 已配置 ✓' : '已清除', icon: 'none' });
    }
    else if (t === 'member'){
      var pin9 = (f.pin || '').trim();
      if (!f.name.trim()){ wx.showToast({ title: '请填写名字', icon: 'none' }); return; }
      if (pin9 && !/^\d{4}$/.test(pin9)){ wx.showToast({ title: 'PIN 需为 4 位数字', icon: 'none' }); return; }
      if (this.data.editMember){
        var mm = db.members.filter(function(x){ return x.id === that.data.editMember; })[0];
        if (mm){
          mm.name = f.name.trim(); mm.emoji = f.emoji || '🙂'; mm.pin = pin9 || null;
          mm.wxName = (f.wxName || '').trim();
          if (this.data.wxAvatar) mm.wxAvatar = this.data.wxAvatar;
        }
      } else {
        db.members.push({ id: store.uid('m'), name: f.name.trim(), role: '成员', emoji: f.emoji || '🙂', pin: pin9 || null,
          wxName: (f.wxName || '').trim(), wxAvatar: this.data.wxAvatar || '' });
      }
      store.save(); wx.navigateBack();
    }
    else if (t === 'lockset'){
      if (!/^\d{4,6}$/.test(f.pin1) || f.pin1 !== f.pin2){ wx.showToast({ title: '两次不一致或格式不对', icon: 'none' }); return; }
      db.lock = { hash: djb2(f.pin1, db.lockSalt || (db.lockSalt = store.uid('s'))), salt: db.lockSalt };
      store.save(); wx.navigateBack(); wx.showToast({ title: '应用锁已开启 ✓', icon: 'none' });
    }
    else if (t === 'packone'){
      var c8 = store.findC(this.query.room, this.query.cid); if (!c8) return;
      var nb = (f.box || '').trim() || '纸箱' + (Object.keys(packBoxes()).length + 1), m = 0;
      c8.items.forEach(function(it){ it.status = 'packed'; it.box = nb; m++; });
      store.save(); wx.navigateBack(); wx.showToast({ title: '已打包 ' + m + ' 件至「' + nb + '」', icon: 'none' });
    }
  },
  onPackOne: function(e){
    var d = e.currentTarget.dataset;
    wx.navigateTo({ url: '/pages/form/form?type=packone&room=' + d.roomid + '&cid=' + d.cid });
  },
  onBoxView: function(e){
    wx.navigateTo({ url: '/pages/view/view?type=box&box=' + e.currentTarget.dataset.box });
  },
  onUnpack: function(e){
    var box = e.currentTarget.dataset.box, m = 0;
    store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){ if (it.status === 'packed' && it.box === box){ it.status = null; it.box = null; m++; } }); }); });
    store.save(); this.build(this.query); wx.showToast({ title: '已开箱 ' + m + ' 件', icon: 'none' });
  }
});
function that_zoneOn(that, zid){
  var f = that.data.zoneFlags.filter(function(z){ return z.id === zid; })[0];
  return !!(f && f.on);
}
function packBoxes(){
  var boxes = {};
  store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){ if (it.status === 'packed') boxes[it.box] = (boxes[it.box] || 0) + 1; }); }); });
  return boxes;
}
function djb2(pin, salt){
  var input = salt + '|' + pin, h = 5381;
  for (var i = 0; i < input.length; i++){ h = ((h << 5) + h + input.charCodeAt(i)) | 0; }
  return 'djb2:' + (h >>> 0).toString(16);
}
