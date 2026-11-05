var store = require('../../utils/store.js');

Page({
  data: {
    name: '', roomChips: [], hotspots: [], cchips: [],
    trackW: 1440, trackH: 360, scrollLeft: 0,
    winW: 375,
    hasPano: false, panoPath: '', hueStyle: '',
    placing: false, placingName: '', aiConts: []
  },
  onLoad: function(query){
    this.roomId = query.id;
    this.targetC = query.c || '';
    this.targetItem = query.item || '';
    var sys = wx.getSystemInfoSync();
    var trackH = Math.round(sys.windowHeight * 0.42);
    this.setData({ winW: sys.windowWidth, trackH: trackH, trackW: trackH * 4 });
    this.refresh();
  },
  onReady: function(){ this.queryRect(); },
  queryRect: function(){
    var that = this;
    wx.createSelectorQuery().in(this).select('.pano-scroll').boundingClientRect(function(r){
      if (r){ that.svLeft = r.left; that.svTop = r.top; }
    }).exec();
  },
  onShow: function(){ if (store.findRoom(this.roomId)) this.refresh(); },
  refresh: function(){
    var r = store.findRoom(this.roomId);
    if (!r) return;
    var trackW = this.data.trackW, trackH = this.data.trackH, winW = this.data.winW;
    var hotspots = r.containers.map(function(c){
      var n = c.items.filter(function(it){ return it.status !== 'discarded'; }).length;
      var label = c.name + ' · ' + n + '件';
      if (c.kind === 'checklist'){
        var un = c.items.filter(function(it){ return !store.db.checklistDone[it.id]; }).length;
        label = c.name + (un ? ' · 待确认' + un : ' · 已确认');
      }
      return { cid: c.id, emoji: c.emoji || '📦', label: label, left: Math.max(2, c.yaw / 360 * trackW - 44), top: Math.max(2, (c.row || 0.6) * trackH - 44) };
    });
    var chips = store.rooms().map(function(rr){ return { id: rr.id, name: rr.name, active: rr.id === r.id }; });
    var cchips = r.containers.map(function(c){ return { id: c.id, name: c.emoji ? c.emoji + ' ' + c.name : c.name }; });
    var scrollLeft = 0;
    var target = this.targetC ? store.findC(this.roomId, this.targetC) : null;
    var yaw = target ? target.yaw : (r.containers[0] ? r.containers[0].yaw : 180);
    scrollLeft = Math.max(0, Math.min(trackW - winW, yaw / 360 * trackW - winW / 2));
    this.setData({
      name: r.name, roomChips: chips, cchips: cchips, hotspots: hotspots,
      hasPano: !!r.panoPath, panoPath: r.panoPath || '',
      hueStyle: 'background: hsl(' + (r.hue || 210) + ',26%,55%)',
      scrollLeft: scrollLeft
    });
    this.queryRect();
    this.curScroll = scrollLeft;
    if (target && this.targetItem){
      var iid = this.targetItem;
      this.targetItem = '';
      wx.navigateTo({ url: '/pages/container/container?room=' + this.roomId + '&cid=' + this.targetC + '&item=' + iid });
    }
  },
  onScroll: function(e){ this.curScroll = e.detail.scrollLeft; },
  /* 在图上点一下，给选中的收纳点放圆点 */
  onTrackTap: function(e){
    if (!this.data.placing) return;
    if (e.target.id === 'stitch-canvas') return;
    var x = e.detail.x - (this.svLeft || 0) + (this.curScroll || 0);
    var y = e.detail.y - (this.svTop || 0);
    var trackW = this.data.trackW, trackH = this.data.trackH;
    if (x < 0 || x > trackW || y < 0 || y > trackH) return;
    var cid = this.placing;
    var c = store.findC(this.roomId, cid); if (!c) return;
    c.yaw = Math.round(x / trackW * 360) % 360;
    c.row = Math.min(0.8, Math.max(0.3, y / trackH));
    store.save();
    this.placing = null;
    this.setData({ placing: false });
    this.refresh();
    wx.showToast({ title: '「' + c.name + '」的位置已更新 ✓', icon: 'none' });
  },
  onPlaceMarker: function(){
    var r = store.findRoom(this.roomId);
    if (!r || !r.containers.length){ wx.showToast({ title: '先添加收纳点', icon: 'none' }); return; }
    var that = this;
    wx.showActionSheet({
      itemList: r.containers.map(function(c){ return (c.emoji || '📦') + ' ' + c.name; }),
      success: function(res){
        that.placing = r.containers[res.tapIndex].id;
        that.setData({ placing: true, placingName: r.containers[res.tapIndex].name });
      }
    });
  },
  onCancelPlace: function(){
    this.placing = null;
    this.setData({ placing: false });
  },
  /* 四面拍摄：按同一方向连拍数张，自动横向拼接成全景底图 */
  onStitch: function(){
    var that = this;
    wx.chooseMedia({
      count: 4, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res){
        var files = res.tempFiles.map(function(t){ return t.tempFilePath; }).slice(0, 4);
        if (files.length < 2){ wx.showToast({ title: '至少拍 2 张才能拼接', icon: 'none' }); return; }
        that.stitchPanorama(files);
      }
    });
  },
  stitchPanorama: function(paths){
    var that = this;
    wx.showLoading({ title: '拼接中…', mask: true });
    wx.createSelectorQuery().in(this).select('#stitch-canvas').fields({ node: true }).exec(function(res){
      if (!res[0] || !res[0].node){ wx.hideLoading(); wx.showToast({ title: '画布不可用', icon: 'none' }); return; }
      var canvas = res[0].node;
      var imgs = [], pending = paths.length;
      paths.forEach(function(p, i){
        var img = canvas.createImage();
        img.onload = function(){ imgs[i] = img; if (--pending === 0) that.drawStitch(canvas, imgs); };
        img.onerror = function(){ if (--pending === 0) that.drawStitch(canvas, imgs); };
        img.src = p;
      });
    });
  },
  drawStitch: function(canvas, imgs){
    var that = this;
    imgs = imgs.filter(Boolean);
    if (imgs.length < 2){ wx.hideLoading(); wx.showToast({ title: '有照片读取失败', icon: 'none' }); return; }
    /* 每张横向裁掉两侧 7%（去重复边缘），相邻图 12% 宽度交叉淡入，消除拼接割裂 */
    var CROP = 0.07, H = 720, widths = [], totalW = 0;
    function calcW(img, h){
      var sw = img.width * (1 - CROP * 2);
      return Math.max(60, Math.round(h * sw / img.height));
    }
    imgs.forEach(function(img){ totalW += calcW(img, H); });
    if (totalW > 3400){
      H = Math.max(360, Math.floor(H * 3400 / totalW));
      totalW = 0; widths = [];
      imgs.forEach(function(img){ totalW += calcW(img, H); });
    } else {
      imgs.forEach(function(img){ widths.push(calcW(img, H)); });
    }
    var n = imgs.length, ov = Math.round(Math.min(widths[0] || 200, 300) * 0.12);
    var outW = totalW - ov * (n - 1);
    canvas.width = outW; canvas.height = H;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6a6f78'; ctx.fillRect(0, 0, outW, H);
    var tmp = wx.createOffscreenCanvas({ type: '2d', width: 8, height: 8 });
    var x = 0;
    imgs.forEach(function(img, i){
      var w = widths[i];
      var sx = img.width * CROP, sw = img.width * (1 - CROP * 2);
      if (i === 0){
        ctx.drawImage(img, sx, 0, sw, img.height, 0, 0, w, H);
      } else {
        try{
          tmp.width = w; tmp.height = H;
          var tctx = tmp.getContext('2d');
          tctx.globalCompositeOperation = 'source-over';
          tctx.clearRect(0, 0, w, H);
          tctx.drawImage(img, sx, 0, sw, img.height, 0, 0, w, H);
          var grad = tctx.createLinearGradient(0, 0, ov, 0);
          grad.addColorStop(0, 'rgba(0,0,0,0)');
          grad.addColorStop(1, 'rgba(0,0,0,1)');
          tctx.globalCompositeOperation = 'destination-in';
          tctx.fillStyle = grad;
          tctx.fillRect(0, 0, w, H);
          tctx.globalCompositeOperation = 'source-over';
          ctx.drawImage(tmp, x - ov, 0);
        }catch(e){
          ctx.drawImage(img, sx, 0, sw, img.height, x - ov, 0, w, H);
        }
      }
      x += w;
    });
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: function(r){
        store.saveImage(r.tempFilePath, 1600, function(path){
          wx.hideLoading();
          var room = store.findRoom(that.roomId);
          if (room){ room.panoPath = path; store.save(); that.refresh(); }
          wx.showToast({ title: '全景底图已生成 ✓', icon: 'none' });
        });
      },
      fail: function(){ wx.hideLoading(); wx.showToast({ title: '拼接失败，请重试', icon: 'none' }); }
    });
  },
  /* ---------- AI 拍照认收纳点：拍房间照片 → 建议收纳位置 → 勾选批量创建 ---------- */
  onAICont: function(){
    var that = this;
    if (!store.db.ai || !store.db.ai.key){ store.aiGuideModal(); return; }
    wx.showModal({
      title: 'AI 拍照认收纳点',
      content: '站在房间中央拍一张照片，AI 会建议房间里有哪些收纳位置（柜子/抽屉/架子），你勾选后批量创建。',
      confirmText: '开始拍照',
      success: function(r){ if (r.confirm) that.chooseRoomPhoto(); }
    });
  },
  chooseRoomPhoto: function(){
    var that = this;
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res){
        wx.showLoading({ title: 'AI 观察房间中…', mask: true });
        store.saveImage(res.tempFiles[0].tempFilePath, 800, function(path){
          store.readDataURL(path, function(dataUrl){
            if (!dataUrl){ wx.hideLoading(); wx.showToast({ title: '照片读取失败', icon: 'none' }); return; }
            wx.request({
              url: store.db.ai.url, method: 'POST',
              header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.db.ai.key },
              data: { model: store.db.ai.model, messages: [{ role: 'user', content: [
                { type: 'text', text: '这是一张房间照片。列出房间里可见的收纳位置（如衣柜、书桌抽屉、床头柜、置物架、行李箱等），最多6个，按常见叫法命名。只输出JSON数组：[{"name":"收纳点名","emoji":"一个emoji图标"}]，不要输出其他文字。' },
                { type: 'image_url', image_url: { url: dataUrl } }
              ]}] },
              success: function(r){
                wx.hideLoading();
                try{
                  var m = r.data.choices[0].message.content.match(/\[[\s\S]*\]/);
                  var list = JSON.parse(m[0]).slice(0, 6);
                  var cards = list.map(function(x, i){
                    var em = String(x.emoji || '');
                    return { id: 'a' + i, name: x.name || '收纳点' + (i + 1), emoji: (em && em.length <= 4 && !/^[a-zA-Z0-9]+$/.test(em)) ? em : '📦', keep: true };
                  });
                  that.setData({ aiConts: cards });
                  wx.showToast({ title: '建议了 ' + cards.length + ' 个，请确认', icon: 'none' });
                }catch(e){
                  wx.showToast({ title: '没看出来，手动加吧', icon: 'none' });
                }
              },
              fail: function(){ wx.hideLoading(); wx.showToast({ title: '请求失败：检查网络', icon: 'none' }); }
            });
          });
        });
      }
    });
  },
  onAiCName: function(e){
    var i = e.currentTarget.dataset.i;
    if (this.data.aiConts[i]) this.data.aiConts[i].name = e.detail.value;
  },
  onAiCToggle: function(e){
    var i = e.currentTarget.dataset.i;
    var cards = this.data.aiConts; cards[i].keep = !cards[i].keep;
    this.setData({ aiConts: cards });
  },
  onAiCConfirm: function(){
    var r = store.findRoom(this.roomId); if (!r) return;
    var cards = this.data.aiConts.filter(function(x){ return x.keep && x.name.trim(); });
    if (!cards.length){ wx.showToast({ title: '先勾选要创建的收纳点', icon: 'none' }); return; }
    var n0 = r.containers.length, n = cards.length;
    cards.forEach(function(x, i){
      r.containers.push({ id: store.uid('c'), name: x.name.trim(), kind: 'default', emoji: x.emoji || '📦',
        yaw: Math.round((n0 + i + 0.5) / (n0 + n) * 360) % 360, row: 0.58, photoPath: '', items: [] });
    });
    store.save(); this.setData({ aiConts: [] });
    this.refresh();
    wx.showToast({ title: '已创建 ' + n + ' 个收纳点 ✓', icon: 'none' });
  },
  onSwitchRoom: function(e){
    wx.redirectTo({ url: '/pages/room/room?id=' + e.currentTarget.dataset.id });
  },
  onHot: function(e){
    wx.navigateTo({ url: '/pages/container/container?room=' + this.roomId + '&cid=' + e.currentTarget.dataset.cid });
  },
  onCChip: function(e){
    wx.navigateTo({ url: '/pages/container/container?room=' + this.roomId + '&cid=' + e.currentTarget.dataset.cid });
  },
  onBack: function(){ wx.navigateBack({ fail: function(){ wx.switchTab({ url: '/pages/home/home' }); } }); },
  onUpload: function(){
    var that = this;
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: function(res){
        wx.showLoading({ title: '压缩中…' });
        store.saveImage(res.tempFiles[0].tempFilePath, 1600, function(path){
          wx.hideLoading();
          var r = store.findRoom(that.roomId);
          if (r){ r.panoPath = path; store.save(); that.refresh(); wx.showToast({ title: '全景图已更新 ✓', icon: 'none' }); }
        });
      }
    });
  },
  onResetPano: function(){
    var r = store.findRoom(this.roomId); if (!r) return;
    delete r.panoPath; store.save(); this.refresh(); wx.showToast({ title: '已恢复默认底图', icon: 'none' });
  },
  onEdit: function(){ wx.navigateTo({ url: '/pages/form/form?type=room&edit=' + this.roomId }); },
  onDel: function(){
    var that = this; var r = store.findRoom(this.roomId); if (!r) return;
    wx.showModal({
      title: '删除房间', content: '确定删除「' + r.name + '」及其全部收纳点和物品？',
      confirmColor: '#cd3d3d',
      success: function(res){
        if (!res.confirm) return;
        var sc = store.scene(); sc.rooms = sc.rooms.filter(function(x){ return x.id !== r.id; });
        store.db.zones.forEach(function(z){ z.containerKeys = z.containerKeys.filter(function(k){ return k.split('.')[0] !== r.id; }); });
        store.save(); wx.navigateBack();
      }
    });
  },
  onAddC: function(){ wx.navigateTo({ url: '/pages/form/form?type=container&room=' + this.roomId }); }
});
