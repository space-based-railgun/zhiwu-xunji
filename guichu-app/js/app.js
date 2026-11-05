/* 归处 · 空间记忆管家 —— 主程序：界面渲染 / 交互 / 表单 / 搜索 / 提醒 / 导入导出 */
"use strict";

var App = (function(){
  var S = {
    tab:'home', view:'app', room:null, exp:null, openC:null,
    panoTarget:null, importBusy:false, unlocked:true,
    geoWatch:null, geoOut:false,
    formPhoto:null, modalSubmit:null, aiTarget:null
  };
  var $ = function(s, el){ return (el || document).querySelector(s); };
  var $$ = function(s, el){ return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = Store.esc, uid = Store.uid;

  /* ================= 基础 UI ================= */
  var toastTimer = 0;
  function toast(msg){
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.hidden = true; }, 2600);
  }
  function openSheet(html){ $('#sheet').innerHTML = html; $('#sheet').hidden = false; $('#dim').hidden = false; }
  function closeSheet(){ $('#sheet').hidden = true; $('#dim').hidden = true; S.openC = null; }
  function sheetHead(title, path, kind){
    var badge = kind ? '<span class="chip c-blue">' + (Store.KINDLABEL[kind] || '') + '</span>' : '';
    return '<div class="sh-head"><div class="sht"><b>' + esc(title) + ' ' + badge + '</b><small>' + esc(path || '') + '</small></div>' +
      '<button type="button" class="x cursor" data-act="close-sheet" aria-label="关闭">✕</button></div>';
  }
  function openModal(title, fieldsHTML, onSubmit){
    S.modalSubmit = onSubmit;
    $('#m-title').textContent = title;
    $('#m-form').innerHTML = fieldsHTML + '<button type="submit" class="btn primary block">保存</button>';
    S.formPhoto = null;
    $('#modal').hidden = false;
  }
  function closeModal(){ $('#modal').hidden = true; S.modalSubmit = null; S.formPhoto = null; }
  function formPhotoField(cur){
    return '<div><span class="f-label">照片（可选，自动压缩存储）</span>' +
      (cur ? '<img class="f-preview" src="' + cur + '" alt="">' : '') +
      '<input type="file" accept="image/*" data-photo><input type="hidden" name="photo" value="' + (cur || '') + '">' +
      '<div class="f-hint">支持相机拍摄或从相册选择</div></div>';
  }

  /* ================= 首页 ================= */
  function renderHome(){
    var db = Store.db, sc = Store.scene();
    var due = Store.dueList(), lent = Store.lentList();
    var total = Store.remindCount();
    var h = '';
    h += '<div class="g-head"><div><p class="g-hi">' + (db.senior ? '您好 👋' : '下午好 👋') + '</p>' +
      '<div class="g-date">' + (new Date().getMonth()+1) + '月' + new Date().getDate() + '日 周' + '日一二三四五六'[new Date().getDay()] +
      ' · ' + esc(sc.name) + ' · ' + Store.rooms().length + ' 个房间 · ' + Store.allItems().length + ' 件物品</div></div>' +
      '<button type="button" class="icoBtn cursor" data-act="senior" aria-pressed="' + db.senior + '" aria-label="长辈模式">♿</button></div>';

    /* 场景切换 */
    h += '<div class="chiprow" style="margin-top:10px">';
    db.scenes.forEach(function(s){
      h += '<button type="button" class="qchip cursor' + (s.id === sc.id ? ' active' : '') + '" data-act="scene-switch" data-s="' + s.id + '">' + (s.emoji || '🏠') + ' ' + esc(s.name) + (s.rooms.length ? ' · ' + s.rooms.length + '房' : ' · 待添加') + '</button>';
    });
    h += '<button type="button" class="qchip cursor" data-act="scene-add">＋ 住址</button></div>';

    /* 搜索 */
    h += '<form class="searchbar" id="searchform"><span>🔍</span>' +
      '<input id="q" type="search" placeholder="搜：护照在哪？充电的东西…" aria-label="搜索物品">' +
      '<button type="button" class="btn btn-sm cursor" data-act="voice-search" aria-label="语音搜索" style="border:0;background:var(--g-surface2)">🎙️</button>' +
      '<button type="submit" class="go cursor" aria-label="搜索">→</button></form>';
    h += '<div class="chiprow" style="margin-top:9px">';
    ['护照在哪','充电的东西','感冒药','露营装备'].forEach(function(q){
      h += '<button type="button" class="qchip cursor" data-act="q" data-q="' + q + '">' + q + '</button>';
    });
    h += '</div>';
    h += '<button type="button" class="voicebig cursor" data-act="voice-search">🎙️ 按住外圈说话 · 找东西</button>';

    /* 主动提醒 */
    h += '<div class="sec"><div class="secrow"><p class="g-h">主动提醒</p><span class="sub">共 ' + total + ' 条</span></div><div class="card">';
    if(due[0]) h += homeRow('⏰', due[0].it.name + ' · ' + dueChip(due[0].it.expiry), due[0].room.name + ' · ' + due[0].c.name, due[0]);
    if(lent[0]) h += homeRow('🤝', lent[0].it.name + ' 外借中 · 应还 ' + shortDate(lent[0].it.lent.due), '借给 ' + lent[0].it.lent.to, lent[0]);
    if(sc.id === 'home') h += '<button type="button" class="rrow cursor" data-act="geofence-check"><span class="ricon">📍</span><span class="rmain"><b>防忘带 · 出门必带清单</b><small>出门前打勾确认：钥匙、工牌、雨伞</small></span><span class="chip c-green">打卡</span></button>';
    h += '<button type="button" class="linkbtn cursor" data-act="tab" data-t="remind">查看全部 ' + total + ' 条 →</button>';
    h += '</div></div>';

    /* 本周日程（按标签联想备物） */
    if(sc.id === 'home'){
      h += '<div class="sec senior-hide"><div class="secrow"><p class="g-h">本周日程 · 自动备物</p><button type="button" class="linkbtn cursor" data-act="event-add">＋ 日程</button></div><div class="card">';
      db.events.forEach(function(ev){
        h += '<button type="button" class="rrow cursor" data-act="event-open" data-ev="' + ev.id + '"><span class="ricon">' + (ev.emoji || '📅') + '</span><span class="rmain"><b>' + esc(ev.title) + '</b><small>' + esc(ev.date) + ' · 点击生成携带清单</small></span><span>›</span></button>';
      });
      h += '</div></div>';

      /* 逻辑分区 */
      h += '<div class="sec senior-hide"><div class="secrow"><p class="g-h">逻辑分区</p><button type="button" class="linkbtn cursor" data-act="zone-add">＋ 分区</button></div><div class="chiprow">';
      db.zones.forEach(function(z){
        var n = 0; z.containerKeys.forEach(function(k){ var p = k.split('.'); var c = Store.findC(p[0], p[1]); if(c) n += c.items.length; });
        h += '<button type="button" class="qchip cursor" data-act="zone-open" data-zone="' + z.id + '">' + (z.emoji || '🏷️') + ' <b>' + esc(z.name) + '</b> · ' + n + '件</button>';
      });
      h += '</div></div>';
    }

    /* 房间网格 */
    h += '<div class="sec"><div class="secrow"><p class="g-h">' + esc(sc.name) + '</p><span class="sub">' + (sc.id === 'home' ? '<button type="button" class="linkbtn cursor" data-act="pack-open">📦 搬家打包</button>' : '点击进入全景环视') + '</span></div><div class="roomgrid">';
    if(!Store.rooms().length) h += '<div class="sub" style="grid-column:1/-1;padding:8px 2px">该住址还没有房间，点下方「＋ 添加房间」开始搭建</div>';
    Store.rooms().forEach(function(r){
      var n = r.containers.reduce(function(a, c){ return a + c.items.length; }, 0);
      h += '<button type="button" class="roomcard cursor" data-act="open-room" data-room="' + r.id + '">' +
        '<span class="rimg" style="background-image:url(' + Pano.roomImage(r) + ')"></span><span class="rshade"></span>' +
        '<span class="rlabel"><b>' + esc(r.name) + '</b><small>' + r.containers.length + ' 个收纳点 · ' + n + ' 件物品</small></span></button>';
    });
    h += '<button type="button" class="roomadd cursor" data-act="room-add">＋ 添加房间</button></div></div>';

    $('#scr-home').innerHTML = h;
    updateBadge();
  }
  function homeRow(icon, title, sub, x){
    return '<button type="button" class="rrow cursor" data-act="fly" data-room="' + x.room.id + '" data-c="' + x.c.id + '" data-item="' + x.it.id + '">' +
      '<span class="ricon">' + icon + '</span><span class="rmain"><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span><span>›</span></button>';
  }
  function dueChip(d){ return d <= 1 ? '明天到期' : d + '天后到期'; }
  function shortDate(iso){ var d = new Date(iso + 'T00:00:00'); return (d.getMonth()+1) + '月' + d.getDate() + '日'; }
  function updateBadge(){
    var n = Store.remindCount();
    var b = $('#rbadge'); b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0;
  }

  /* ================= 提醒中心 ================= */
  function renderRemind(){
    var db = Store.db;
    var due = Store.dueList(), lent = Store.lentList(), rs = Store.restockList(), custom = Store.customDueList();
    var h = '<div class="g-head"><div><p class="g-hi">提醒中心</p><div class="g-date">挂在物品与容器上的「时间层」</div></div>' +
      '<button type="button" class="btn btn-sm cursor" data-act="remind-add">＋ 自定义提醒</button></div>';

    h += '<div class="sect"><p class="g-h">⏰ 临期提醒</p><div class="card">';
    if(!due.length) h += '<div class="empty">暂无临期物品</div>';
    due.slice(0, 5).forEach(function(x){
      var sev = x.it.expiry <= 7 ? 'background:var(--g-bad);color:#fff' : 'background:var(--g-warn);color:#fff';
      h += remRow(x, '<span class="due" style="' + sev + '">' + dueChip(x.it.expiry) + '</span>', x.it.expiry + '天 · ' + x.c.name);
    });
    h += '</div></div>';

    h += '<div class="sect"><p class="g-h">🤝 借出归还</p><div class="card">';
    if(!lent.length) h += '<div class="empty">暂无外借物品</div>';
    lent.forEach(function(x){
      h += '<div style="display:flex;align-items:center;border-bottom:1px solid var(--g-line)"><div style="flex:1;min-width:0">' +
        remRow(x, '<span class="due" style="background:var(--g-brandsoft);color:var(--g-brand)">' + shortDate(x.it.lent.due) + '</span>', '借给 ' + x.it.lent.to) + '</div>' +
        '<button type="button" class="btn btn-sm cursor" data-act="return" data-item="' + x.it.id + '">已归还</button></div>';
    });
    h += '</div></div>';

    h += '<div class="sect"><p class="g-h">🔔 自定义 / 周期盘点</p><div class="card">';
    if(!custom.length) h += '<div class="empty">暂无自定义提醒</div>';
    custom.forEach(function(x){
      h += '<div style="display:flex;align-items:center;border-bottom:1px solid var(--g-line)"><div style="flex:1;min-width:0">' +
        '<button type="button" class="rrow cursor" data-act="fly" data-room="' + x.r.room + '" data-c="' + x.r.c + '"><span class="ricon">🔔</span><span class="rmain"><b>' + esc(x.r.title) + '</b><small>' + (x.r.repeat === 'quarter' ? '每 3 个月 · ' : x.r.repeat === 'year' ? '每年 · ' : '') + shortDate(nextDueISO(x.r)) + '</small></span><span class="due" style="background:var(--g-brandsoft);color:var(--g-brand)">' + x.due + '天</span></button></div>' +
        '<button type="button" class="btn btn-sm btn-danger cursor" data-act="remind-del" data-r="' + x.r.id + '">删除</button></div>';
    });
    h += '</div></div>';

    h += '<div class="sect"><p class="g-h">🧺 库存补货</p><div class="card">';
    if(!rs.length) h += '<div class="empty">库存充足</div>';
    rs.forEach(function(x){
      h += '<div style="display:flex;align-items:center;border-bottom:1px solid var(--g-line)"><div style="flex:1;min-width:0">' +
        remRow(x, '<span class="due" style="background:var(--g-warn);color:#fff">仅剩 ' + x.it.qty + (x.it.unit || '') + '</span>', x.room.name + ' · ' + x.c.name) + '</div>' +
        '<button type="button" class="btn btn-sm cursor" data-act="restock" data-item="' + x.it.id + '">加入购物清单</button></div>';
    });
    h += '</div></div>';

    h += '<div class="note">提醒来源：物品效期 / 外借归还 / 自定义周期盘点 / 消耗品阈值。所有数据仅存本机，可随时导出备份。</div>';
    $('#scr-remind').innerHTML = h;
    updateBadge();
  }
  function nextDueISO(r){
    var d = Store.reminderDue(r);
    return new Date(Store.today().getTime() + d * 864e5).toISOString().slice(0, 10);
  }
  function remRow(x, right, sub){
    return '<button type="button" class="rrow cursor" data-act="fly" data-room="' + x.room.id + '" data-c="' + x.c.id + '" data-item="' + x.it.id + '">' +
      '<span class="ricon">📦</span><span class="rmain"><b>' + esc(x.it.name) + '</b><small>' + esc(sub) + '</small></span>' + right + '</button>';
  }

  /* ================= 设置页 ================= */
  function renderSet(){
    var db = Store.db;
    var h = '<div class="g-head"><div><p class="g-hi">设置</p><div class="g-date">本地优先 · 数据不出设备</div></div></div>';
    h += '<div class="card" style="margin-top:10px;padding:2px 13px">';
    h += '<div class="merow"><span class="ricon">♿</span><span style="flex:1"><b style="font-weight:500">长辈模式</b><br><small style="color:var(--g-text2)">大字号 · 界面精简 · 语音找物</small></span><button type="button" class="switch cursor" data-act="senior" aria-pressed="' + db.senior + '" aria-label="长辈模式开关"></button></div>';
    h += '<div class="merow"><span class="ricon">🔔</span><span style="flex:1"><b style="font-weight:500">到期系统通知</b><br><small style="color:var(--g-text2)">效期 / 归还 / 盘点到期时弹系统通知' + (db.notifyEnabled ? '' : '（首次开启需授权）') + '</small></span><button type="button" class="switch cursor" data-act="notify-toggle" aria-pressed="' + db.notifyEnabled + '" aria-label="到期通知开关"></button>' + (db.notifyEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted' ? '<button type="button" class="btn btn-sm cursor" style="margin-left:8px" data-act="notify-test">测试</button>' : '') + '</div>';
    h += '<div class="merow"><span class="ricon">🔒</span><span style="flex:1"><b style="font-weight:500">应用锁</b><br><small style="color:var(--g-text2)">' + (db.lock ? '已开启 · 打开应用需输入 PIN' : 'PIN 保护，证件/房产证等敏感数据不上锁不看') + '</small></span>' +
      (db.lock
        ? '<button type="button" class="btn btn-sm cursor" data-act="lock-set">修改</button><button type="button" class="btn btn-sm btn-danger cursor" style="margin-left:6px" data-act="lock-off">关闭</button><button type="button" class="btn btn-sm cursor" style="margin-left:6px" data-act="lock-now">锁定</button>'
        : '<button type="button" class="btn btn-sm cursor" data-act="lock-set">开启</button>') + '</div>';
    h += '<div class="merow"><span class="ricon">🤖</span><span style="flex:1"><b style="font-weight:500">AI 识别（可选）</b><br><small style="color:var(--g-text2)">' + (db.ai && db.ai.key ? '已配置 · ' + esc(db.ai.model) : '未配置 · 自带 Key，兼容 OpenAI 格式') + '</small></span><button type="button" class="btn btn-sm cursor" data-act="ai-config">配置</button></div>';
    h += '<div class="merow"><span class="ricon">✍️</span><span style="flex:1"><b style="font-weight:500">连续录入</b><br><small style="color:var(--g-text2)">保存后自动开下一条，收拾抽屉不关表单</small></span><button type="button" class="switch cursor" data-act="cont-toggle" aria-pressed="' + db.contEntry + '" aria-label="连续录入开关"></button></div>';
    h += '<div class="merow"><span class="ricon">🤝</span><span style="flex:1"><b style="font-weight:500">家庭共享 · 借用台账</b><br><small style="color:var(--g-text2)">' + db.members.length + ' 位成员 · 权限隔离 · 公物台账</small></span><button type="button" class="btn btn-sm cursor" data-act="share-open">查看</button></div>';
    h += '<div class="merow"><span class="ricon">📦</span><span style="flex:1"><b style="font-weight:500">搬家打包模式</b><br><small style="color:var(--g-text2)">按容器打包 · 纸箱编号 · 扫码开箱</small></span><button type="button" class="btn btn-sm cursor" data-act="pack-open">打开</button></div>';
    h += '</div>';

    h += '<div class="sec"><div class="secrow"><p class="g-h">📍 防忘带地理围栏</p></div><div class="card">';
    h += '<div class="merow"><span style="flex:1"><b style="font-weight:500">离家提醒</b><br><small style="color:var(--g-text2)">' +
      (db.homeLoc ? '已记录家的位置' : '尚未记录家的位置') + ' · ' + (db.geofenceArmed ? '已布防' : '未布防') + '</small></span>' +
      '<button type="button" class="btn btn-sm cursor" data-act="geo-home">设当前位置为家</button>' +
      '<button type="button" class="switch cursor" data-act="geo-arm" aria-pressed="' + db.geofenceArmed + '" aria-label="离家提醒开关"></button></div>';
    h += '<div class="note" style="padding-top:4px">开启后离开家约 300 米会弹出出门清单；需要浏览器授权定位（https 或 localhost 环境可用）。</div></div></div>';

    h += '<div class="sec"><div class="secrow"><p class="g-h">💾 数据（全部存于本机浏览器）</p></div><div class="card">';
    h += '<div class="merow"><span class="ricon">📤</span><span style="flex:1"><b style="font-weight:500">导出完整备份（含照片）</b></span><button type="button" class="btn btn-sm cursor" data-act="exp-backup">导出 JSON</button></div>';
    h += '<div class="merow"><span class="ricon">📋</span><span style="flex:1"><b style="font-weight:500">导出物品清单</b></span><button type="button" class="btn btn-sm cursor" data-act="exp-json">JSON</button><button type="button" class="btn btn-sm cursor" style="margin-left:6px" data-act="exp-csv">CSV</button></div>';
    h += '<div class="merow"><span class="ricon">📥</span><span style="flex:1"><b style="font-weight:500">导入备份</b><br><small style="color:var(--g-text2)">选择之前导出的 JSON 文件，覆盖当前数据</small></span><button type="button" class="btn btn-sm cursor" data-act="imp-json">选择文件</button></div>';
    h += '<div class="merow"><span class="ricon">♻️</span><span style="flex:1"><b style="font-weight:500">清空并恢复示例数据</b></span><button type="button" class="btn btn-sm btn-danger cursor" data-act="wipe">重置</button></div>';
    h += '</div></div>';

    h += '<div class="card"><p class="sub" style="margin-bottom:6px">关于</p><div class="note" style="padding-top:0">' +
      '归处 · 空间记忆管家 v1.2（纯前端本地应用，零依赖，可离线运行）<br>' +
      '· 四级空间树：住址 → 房间 → 收纳点 → 物品<br>' +
      '· 全景环视（真实照片 WebGL 球面投影）+ 热区 + 搜索镜头飞转<br>' +
      '· 搜索：文本/拼音/首字母/模糊容错/语音<br>' +
      '· 重要级 / 状态 / 权属 / 分区 / 借还 / 打包 / 提醒 / 位置历史<br>' +
      '· AI 识别（自带 Key）/ 连续录入 / 箱贴打印 / 应用锁<br>' +
      '· 数据迁移建议：定期「导出完整备份」；更换设备时「导入备份」即可整体搬家。</div></div>';
    $('#scr-set').innerHTML = h;
  }

  /* ================= Tab / 导航 ================= */
  function showTab(t){
    S.tab = t; S.view = 'app';
    $('#scr-room').hidden = true;
    $('#scr-home').hidden = t !== 'home';
    $('#scr-remind').hidden = t !== 'remind';
    $('#scr-set').hidden = t !== 'set';
    $$('#tabbar button').forEach(function(b){ b.setAttribute('aria-current', String(b.dataset.t === t)); });
    if(t === 'remind') renderRemind();
    if(t === 'set') renderSet();
    if(t === 'home') renderHome();
  }
  function openRoomView(roomId, opts){
    S.view = 'room'; S.room = roomId;
    $('#scr-home').hidden = true; $('#scr-remind').hidden = true; $('#scr-set').hidden = true;
    $('#scr-room').hidden = false;
    if(opts && opts.c){
      Pano.onHighlight = function(o){ openContainer(S.room, o.c, o.item); };
      Pano.open(roomId, { c:opts.c, item:opts.item });
    } else {
      Pano.onHighlight = null;
      Pano.open(roomId, null);
    }
  }
  function closeRoomView(){ Pano.close(); showTab(S.tab); }

  /* ================= 容器浮层与条目 ================= */
  function chips(it){
    var h = '';
    var imp = Store.IMP[it.imp] || Store.IMP.normal;
    h += '<span class="chip ' + imp.cls + '">' + imp.label + '</span>';
    if(it.cons) h += '<span class="chip c-green">消耗品</span>';
    if(it.lent && !Store.db.returned[it.id]) h += '<span class="chip c-orange">外借 · ' + esc(it.lent.to) + '</span>';
    if(Store.isLow(it)) h += '<span class="chip c-orange">需补货</span>';
    if(it.owner && Store.OWNLBL[it.owner]) h += '<span class="chip ' + Store.OWNLBL[it.owner][1] + '">' + Store.OWNLBL[it.owner][0] + '</span>';
    if(it.status === 'packed') h += '<span class="chip c-purple">📦 ' + esc(it.box || '') + '</span>';
    if(it.status === 'discarded') h += '<span class="chip c-gray">已丢弃</span>';
    return h;
  }
  function openContainer(roomId, cid, hiItem, keepExp){
    var c = Store.findC(roomId, cid); if(!c) return;
    S.openC = cid; S.room = roomId;
    if(!keepExp) S.exp = null;
    var path = Store.findRoom(roomId).name + ' · ' + c.name;
    var body = '';
    if(c.kind === 'checklist') body = ckBody(c);
    else if(c.kind === 'stock') body = stockBody(c);
    else if(c.kind === 'archive') body = archBody(c);
    else if(c.kind === 'kids') body = kidsBody(c);
    else body = listBody(c);
    var html = sheetHead(c.name, path, c.kind) +
      '<div class="sh-body" id="shbody">' + body + '</div>' +
      '<div class="sh-foot" style="display:flex;gap:9px;flex-wrap:wrap">' +
      '<button type="button" class="btn primary cursor" style="flex:1.3" data-act="item-add">＋ 快速录入</button>' +
      (Store.db.ai && Store.db.ai.key ? '<button type="button" class="btn cursor" style="flex:1" data-act="ai-capture" data-room="' + roomId + '" data-c="' + cid + '">🤖 AI 识别</button>' : '') +
      '<button type="button" class="btn cursor" data-act="c-edit" data-room="' + roomId + '" data-c="' + cid + '">编辑</button></div>';
    openSheet(html);
    if(hiItem) highlightItem(hiItem);
  }
  function refreshSheet(){
    if(S.openC && !$('#sheet').hidden) openContainer(S.room, S.openC, null, true);
  }
  function highlightItem(iid){
    var row = $('#sheet [data-itemrow="' + iid + '"]');
    if(row){ row.scrollIntoView({ block:'center' }); row.classList.add('flash'); setTimeout(function(){ row.classList.remove('flash'); }, 1900); }
  }
  function itemDetail(x){
    var it = x.it, c = x.c;
    var tags = (it.tags || []).map(function(t){ return '<span class="chip c-gray">#' + esc(t) + '</span>'; }).join('');
    var photo = Store.imgSrc(it.photoId) ? '<img class="thumb" src="' + Store.imgSrc(it.photoId) + '" alt="">' : '';
    var hist = (it.history || []).slice(0, 4).map(function(h){ return '<div class="dpath">🕘 ' + esc(h.text) + '<span style="margin-left:auto">' + esc(String(h.t).slice(0, 10)) + '</span></div>'; }).join('');
    var ex = it.expiry ? '<div>⏳ 效期剩余 <b>' + it.expiry + '</b> 天</div>' : '';
    var lent = (it.lent && !Store.db.returned[it.id]) ? '<div>🤝 外借给 <b>' + esc(it.lent.to) + '</b> · 应还 ' + shortDate(it.lent.due) + '</div>' : '';
    var note = it.note ? '<div>📝 ' + esc(it.note) + '</div>' : '';
    var owner = (it.owner && Store.OWNLBL[it.owner]) ? '<div>👤 ' + Store.OWNLBL[it.owner][0] + '</div>' : '';
    return '<div class="idetail">' + photo +
      '<div class="dpath">📍 完整路径：' + esc(x.sc.name) + ' · ' + esc(x.room.name) + ' · ' + esc(c.name) + '</div>' +
      (tags ? '<div style="display:flex;gap:5px;flex-wrap:wrap">' + tags + '</div>' : '') +
      ex + lent + owner + note +
      (hist ? '<div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--g-line);padding-top:7px">' + hist + '</div>' : '') +
      '<div class="dacts">' +
      '<button type="button" class="btn btn-sm cursor" data-act="item-edit" data-item="' + it.id + '">编辑</button>' +
      '<button type="button" class="btn btn-sm cursor" data-act="item-move" data-item="' + it.id + '">移动</button>' +
      '<button type="button" class="btn btn-sm btn-danger cursor" data-act="item-del" data-item="' + it.id + '">删除</button>' +
      '<button type="button" class="btn btn-sm cursor" data-act="lend" data-item="' + it.id + '">标记外借</button>' +
      '<button type="button" class="btn btn-sm cursor" data-act="remind-add" data-room="' + x.room.id + '" data-c="' + c.id + '" data-item="' + it.id + '">设提醒</button>' +
      '<button type="button" class="btn btn-sm cursor" data-act="owner-cycle" data-item="' + it.id + '">权属</button>' +
      '<button type="button" class="btn btn-sm cursor" data-act="nfc-tag" data-item="' + it.id + '">NFC 标签</button>' +
      '<button type="button" class="btn btn-sm btn-danger cursor" data-act="discard" data-item="' + it.id + '">' + (it.status === 'discarded' ? '恢复' : '丢弃') + '</button>' +
      '</div></div>';
  }
  function findX(iid){ return Store.findItem(iid); }
  function listBody(c){
    var items = c.items.slice().sort(function(a,b){ return Store.IMPRANK[a.imp] - Store.IMPRANK[b.imp]; });
    var h = '<div class="sub" style="margin:2px 2px 6px">按重要级排序 · 点击条目查看详情与操作</div>';
    items.forEach(function(it){
      var x = { it:it, room:Store.findRoom(S.room), c:c, sc:Store.scene() };
      h += '<div><button type="button" class="irow cursor" data-act="itemx" data-item="' + it.id + '" data-itemrow="' + it.id + '">' +
        (Store.imgSrc(it.photoId) ? '<img class="thumb" src="' + Store.imgSrc(it.photoId) + '" alt="">' : '') +
        '<span class="imain"><span class="iname">' + esc(it.name) + '</span><span class="ichipline">' + chips(it) + '</span></span><span>▾</span></button>';
      if(S.exp === it.id) h += itemDetail(x);
      h += '</div>';
    });
    return h;
  }
  function stockBody(c){
    var h = '<div class="sub" style="margin:2px 2px 8px">库存视图 · 数量增减与效期一目了然</div>';
    c.items.forEach(function(it){
      h += '<div style="border-bottom:1px solid var(--g-line);padding-bottom:10px;margin-bottom:10px">';
      h += '<div style="display:flex;align-items:center;gap:10px">' +
        '<button type="button" class="irow cursor" style="flex:1;padding:6px 0;border:0" data-act="itemx" data-item="' + it.id + '" data-itemrow="' + it.id + '"><span class="imain"><span class="iname">' + esc(it.name) + '</span><span class="ichipline">' + chips(it) + '</span></span></button>' +
        '<span class="stepper"><button type="button" class="cursor" data-act="qty" data-d="-1" data-item="' + it.id + '" aria-label="减少">−</button><b>' + (it.qty || 0) + esc(it.unit || '') + '</b><button type="button" class="cursor" data-act="qty" data-d="1" data-item="' + it.id + '" aria-label="增加">＋</button></span></div>';
      if(it.expiry){
        var pct = Math.max(5, Math.min(100, it.expiry / 90 * 100));
        var col = it.expiry <= 7 ? 'var(--g-bad)' : (it.expiry <= 30 ? 'var(--g-warn)' : 'var(--g-ok)');
        h += '<div class="barline"><div class="track"><div class="fill" style="width:' + pct + '%;background:' + col + '"></div></div><small>效期 ' + dueChip(it.expiry) + '</small></div>';
      }
      if(S.exp === it.id){
        var x = { it:it, room:Store.findRoom(S.room), c:c, sc:Store.scene() };
        h += itemDetail(x);
      }
      h += '</div>';
    });
    return h;
  }
  function ckBody(c){
    var un = 0;
    var h = '<div class="sub" style="margin:2px 2px 8px">打卡视图 · 出门打勾带走，回家打勾归位</div>';
    c.items.forEach(function(it){
      var done = !!Store.db.checklistDone[it.id];
      if(!done) un++;
      h += '<button type="button" class="ckrow cursor" data-act="toggle-done" data-item="' + it.id + '" aria-pressed="' + done + '"><span class="ckdot">' + (done ? '✓' : '') + '</span>' + esc(it.name) + '</button>';
    });
    h += '<div style="display:flex;gap:9px;margin-top:14px">' +
      '<button type="button" class="btn primary cursor" style="flex:1" data-act="out-ok">✓ 出门确认' + (un ? '（还有 ' + un + ' 项）' : '') + '</button>' +
      '<button type="button" class="btn cursor" data-act="out-home">↺ 回家复位</button></div>';
    return h;
  }
  function archBody(c){
    var h = '<div class="sub" style="margin:2px 2px 8px">档案视图 · 敏感资料建议标记私有</div>';
    c.items.forEach(function(it){
      h += '<div><button type="button" class="acrow cursor" data-act="itemx" data-item="' + it.id + '" data-itemrow="' + it.id + '">' +
        '<span class="alock">' + (it.owner === 'private' ? '🔒' : '📁') + '</span><span style="flex:1">' + esc(it.name) +
        (it.owner === 'private' ? ' <span class="chip c-red" style="margin-left:6px">保密</span>' : '') + '</span><span>▾</span></button>';
      if(S.exp === it.id){
        var x = { it:it, room:Store.findRoom(S.room), c:c, sc:Store.scene() };
        h += itemDetail(x);
      }
      h += '</div>';
    });
    return h;
  }
  function kidsBody(c){
    var cols = ['#ffe3a8', '#ffd0d8', '#cdeffd', '#d9f2cf'];
    var h = '<div class="sub" style="margin:2px 2px 8px">趣味视图 · 大图标大色块 · 无复杂层级</div><div class="kidgrid">';
    c.items.forEach(function(it, i){
      h += '<button type="button" class="kid cursor" data-act="itemx" data-item="' + it.id + '" style="background:' + cols[i % 4] + '"><span class="kico">' + (it.emoji || '🧸') + '</span><b>' + esc(it.name) + '</b></button>';
    });
    h += '</div>';
    if(S.exp){
      var it2 = null; c.items.forEach(function(x){ if(x.id === S.exp) it2 = x; });
      if(it2){
        var r = Store.findRoom(S.room);
        h += '<div class="idetail" style="margin-top:10px"><div class="dpath">📍 ' + esc(it2.name) + ' 就放在：' + esc(r.name) + ' · ' + esc(c.name) + '</div>' +
          '<div class="dacts"><button type="button" class="btn btn-sm cursor" data-act="itemx" data-item="' + it2.id + '">查看详情</button></div></div>';
      }
    }
    return h;
  }

  /* ================= 搜索 ================= */
  function doSearch(q){
    q = (q || '').trim();
    var clean = q.replace(/在哪|在哪里|哪里|呢|？|\?/g, '').trim();
    var terms = [], seen = {};
    [q, clean].forEach(function(t){ if(t && !seen[t]){ seen[t] = 1; terms.push(t); } });
    Object.keys(Store.SYN).forEach(function(k){
      if((q + clean).indexOf(k) >= 0) Store.SYN[k].forEach(function(w){ if(!seen[w]){ seen[w] = 1; terms.push(w); } });
    });
    var zoneHit = null;
    Store.db.zones.forEach(function(z){
      if(!zoneHit && (q + clean).indexOf(z.name.replace('区', '')) >= 0 && clean.length >= 1) zoneHit = z;
    });
    var results = [];
    Store.allItems().forEach(function(x){
      var s = 0, why = '';
      terms.forEach(function(t){
        if(x.it.name.indexOf(t) >= 0){ s += 10; why = why || ('名称匹配「' + t + '」'); }
        (x.it.tags || []).forEach(function(tg){ if(tg.indexOf(t) >= 0){ s += 6; why = why || ('标签「' + tg + '」'); } });
        if(x.c.name.indexOf(t) >= 0){ s += 4; why = why || ('收纳点「' + x.c.name + '」'); }
        if(x.room.name.indexOf(t) >= 0){ s += 2; }
        if(x.it.note && x.it.note.indexOf(t) >= 0){ s += 5; why = why || ('备注匹配'); }
        if(x.it.box && x.it.box.indexOf(t) >= 0){ s += 9; why = why || ('打包箱「' + x.it.box + '」'); }
        /* 拼音匹配：全拼（yao shi→yaoshi）与首字母（ys） */
        var tq = t.toLowerCase().replace(/\s+/g, '');
        if(/[a-z]/.test(tq) && tq.length >= 2){
          var namePy = Store.pyOf(x.it.name);
          if(namePy.full.indexOf(tq) >= 0){ s += 7; why = why || '拼音匹配'; }
          else if(namePy.ini.indexOf(tq) >= 0){ s += 6; why = why || '拼音首字母'; }
          else {
            var tagPy = Store.pyOf((x.it.tags || []).join(','));
            if(tagPy.full.indexOf(tq) >= 0){ s += 5; why = why || '标签拼音'; }
            else if(tagPy.ini.indexOf(tq) >= 0){ s += 4; why = why || '标签拼音'; }
          }
        } else if(s === 0 && t.length >= 2 && x.it.name.length >= 2){
          /* 模糊容错：近似错别字 */
          var d2 = Store.lev(t, x.it.name);
          if(d2 <= (t.length >= 4 ? 2 : 1)){ s += 6; why = why || ('近似「' + x.it.name + '」'); }
        }
      });
      if(s > 0) results.push({ x:x, s:s, why:why });
    });
    results.sort(function(a,b){ return b.s - a.s; });
    openSearchSheet(q, zoneHit, results.slice(0, 12));
  }
  function openSearchSheet(q, zoneHit, results){
    var h = sheetHead('搜索「' + (q ? esc(q) : '') + '」', results.length + ' 个结果' + (zoneHit ? ' · 含分区' : ''));
    var body = '';
    if(zoneHit){
      var zn = 0; zoneHit.containerKeys.forEach(function(k){ var p = k.split('.'); var c = Store.findC(p[0], p[1]); if(c) zn += c.items.length; });
      body += '<button type="button" class="srow cursor" style="width:100%;border:0;background:none;text-align:left" data-act="zone-open" data-zone="' + zoneHit.id + '"><span class="ricon">' + (zoneHit.emoji || '🏷️') + '</span><span class="smain"><span class="iname">分区 · ' + esc(zoneHit.name) + '</span><span class="spath">跨房间聚合 · ' + zn + ' 件物品</span></span><span>›</span></button>';
    }
    if(results.length){
      results.forEach(function(rs){
        var x = rs.x;
        body += '<div class="srow"><span class="ricon">' + (x.c.emoji || '📦') + '</span>' +
          '<span class="smain"><span class="iname">' + esc(x.it.name) + '</span><span class="ichipline" style="margin-top:3px">' + chips(x.it) + '</span>' +
          '<span class="spath">📍 ' + esc(x.room.name) + ' · ' + esc(x.c.name) + (rs.why ? ' · ' + esc(rs.why) : '') + '</span></span>' +
          '<button type="button" class="btn btn-sm primary cursor" style="margin-top:4px" data-act="fly" data-room="' + x.room.id + '" data-c="' + x.c.id + '" data-item="' + x.it.id + '">看实景</button></div>';
      });
    } else if(!zoneHit){
      body += '<div class="empty">没有找到「' + esc(q) + '」<br>试试下面的说法：</div><div class="chiprow" style="justify-content:center">';
      ['护照在哪','充电的东西','感冒药','证件'].forEach(function(s){ body += '<button type="button" class="qchip cursor" data-act="q" data-q="' + s + '">' + s + '</button>'; });
      body += '</div>';
    }
    openSheet(h + '<div class="sh-body">' + body + '</div>');
  }

  /* ================= 分区 / 日程 / 打包 / 共享 ================= */
  function openZone(zid){
    var z = Store.db.zones.filter(function(x){ return x.id === zid; })[0]; if(!z) return;
    var body = '<div class="sub" style="margin:2px 2px 8px">逻辑分区 · 跨房间聚合，不改变物理位置</div>';
    z.containerKeys.forEach(function(k){
      var p = k.split('.'), c = Store.findC(p[0], p[1]), r = Store.findRoom(p[0]);
      if(!c) return;
      body += '<button type="button" class="srow cursor" style="width:100%;border:0;background:none;text-align:left" data-act="fly" data-room="' + r.id + '" data-c="' + c.id + '">' +
        '<span class="ricon">' + (c.emoji || '📦') + '</span><span class="smain"><span class="iname">' + esc(c.name) + '</span><span class="spath">📍 ' + esc(r.name) + ' · ' + c.items.length + ' 件</span></span><span>›</span></button>' +
        '<div style="padding:0 2px 8px;display:flex;gap:5px;flex-wrap:wrap">' + c.items.map(function(it){ return '<span class="chip c-gray">' + esc(it.name) + '</span>'; }).join('') + '</div>';
    });
    body += '<div class="rowbtns" style="margin-top:8px"><button type="button" class="btn btn-sm btn-danger cursor" data-act="zone-del" data-zone="' + z.id + '">删除该分区（不删物品）</button></div>';
    openSheet(sheetHead((z.emoji || '🏷️') + ' ' + z.name, '逻辑分区 · ' + z.containerKeys.length + ' 个收纳点') + '<div class="sh-body">' + body + '</div>');
  }
  function openEvent(eid){
    var ev = Store.db.events.filter(function(x){ return x.id === eid; })[0]; if(!ev) return;
    var rows = Store.eventChecklist(ev);
    var body = '<div class="sub" style="margin:2px 2px 8px">按日程标题联想物品标签（离线规则引擎）· 点击跳转实景</div>';
    if(!rows.length) body += '<div class="empty">没联想到相关物品 · 可先给物品打上对应标签（如「露营」「出行」「证件」）</div>';
    rows.forEach(function(x){
      var warn = (x.it.lent && !Store.db.returned[x.it.id]) ? ' <span class="chip c-orange">外借中 · 记得取回</span>' : '';
      body += '<div class="srow" style="align-items:center"><span class="ricon">' + (x.c.emoji || '📦') + '</span>' +
        '<span class="smain"><span class="iname">' + esc(x.it.name) + warn + '</span><span class="spath">📍 ' + esc(x.room.name) + ' · ' + esc(x.c.name) + '</span></span>' +
        '<button type="button" class="btn btn-sm primary cursor" data-act="fly" data-room="' + x.room.id + '" data-c="' + x.c.id + '" data-item="' + x.it.id + '">去拿</button></div>';
    });
    body += '<div class="rowbtns" style="margin-top:10px"><button type="button" class="btn btn-sm btn-danger cursor" data-act="event-del" data-ev="' + ev.id + '">删除日程</button></div>';
    openSheet(sheetHead((ev.emoji || '📅') + ' ' + ev.title, ev.date + ' · 自动备物清单') + '<div class="sh-body">' + body + '</div>');
  }
  function packBoxes(){
    var boxes = {};
    Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){ if(it.status === 'packed') boxes[it.box] = (boxes[it.box] || 0) + 1; }); }); });
    return boxes;
  }
  function nextBoxName(){ return '纸箱' + (Object.keys(packBoxes()).length + 1); }
  function openPack(){
    var boxes = packBoxes();
    var h = sheetHead('📦 搬家打包模式', '按容器打包 · 到新家按箱号开箱');
    var body = '';
    var bk = Object.keys(boxes);
    if(bk.length){
      body += '<div class="sub" style="margin:2px 2px 6px">已打包 ' + bk.length + ' 箱 · 搜索箱号可整箱找到 · 点击查看</div><div class="chiprow" style="margin-bottom:10px">';
      bk.forEach(function(b){ body += '<button type="button" class="qchip cursor" data-act="box-view" data-box="' + esc(b) + '">📦 ' + esc(b) + ' · ' + boxes[b] + '件</button>'; });
      body += '</div>';
    } else {
      body += '<div class="sub" style="margin:2px 2px 8px">还没有打包任何柜子 · 下面按「住址：我的家」的容器逐个打包</div>';
    }
    Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){
      if(!c.items.length) return;
      var packed = c.items[0].status === 'packed';
      body += '<div class="irow"><span class="imain"><span class="iname">' + (c.emoji || '📦') + ' ' + esc(c.name) + '</span><span class="spath">' + esc(r.name) + ' · ' + c.items.length + ' 件</span></span>' +
        (packed
          ? '<button type="button" class="btn btn-sm cursor" data-act="box-view" data-box="' + esc(c.items[0].box) + '">已打包 · ' + esc(c.items[0].box) + '</button>'
          : '<button type="button" class="btn btn-sm primary cursor" data-act="pack-one" data-c="' + c.id + '">打包为' + esc(nextBoxName()) + '</button>') +
        '</div>';
    });});
    openSheet(h + '<div class="sh-body">' + body + '</div>');
  }
  function boxView(box){
    var h = sheetHead('📦 ' + box, '箱内物品 · 搬到新家后逐箱核对');
    var body = '';
    Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){
      var packed = c.items.filter(function(it){ return it.status === 'packed' && it.box === box; });
      if(!packed.length) return;
      body += '<div class="sub" style="margin:8px 2px 2px">' + esc(r.name) + ' · ' + esc(c.name) + '</div>';
      packed.forEach(function(it){ body += '<div class="irow"><span class="imain"><span class="iname">' + esc(it.name) + '</span></span><span class="chip c-purple">' + esc(box) + '</span></div>'; });
    });});
    body += '<div class="rowbtns" style="margin-top:12px"><button type="button" class="btn cursor" data-act="pack-open">← 返回</button><button type="button" class="btn primary cursor" style="flex:1" data-act="unpack" data-box="' + esc(box) + '">✓ 确认开箱 · 恢复原位</button><button type="button" class="btn cursor" data-act="box-print" data-box="' + esc(box) + '">🖨️ 打印箱贴</button></div>';
    openSheet(h + '<div class="sh-body">' + body + '</div>');
  }
  function openShare(){
    var db = Store.db;
    var h = sheetHead('🤝 家庭共享', db.members.length + ' 位成员 · 权限隔离 · 借用台账');
    var body = '<div class="sub" style="margin:2px 2px 8px">成员（私人物品仅自己可见，家庭/公共物品全员可见）</div>';
    db.members.forEach(function(m){
      body += '<div class="irow"><span class="ricon">👤</span><span class="imain"><span class="iname">' + esc(m.name) + '</span><span class="spath">' + esc(m.role) + '</span></span>' +
        (m.role !== '管理员' ? '<button type="button" class="btn btn-sm btn-danger cursor" data-act="member-del" data-m="' + m.id + '">移除</button>' : '') + '</div>';
    });
    body += '<div class="rowbtns" style="margin:8px 0 14px"><button type="button" class="btn primary cursor" style="flex:1" data-act="member-add">＋ 邀请成员（生成邀请码）</button></div>';
    body += '<div class="sub" style="margin:2px 2px 8px">公共物资借用台账</div><div class="card" style="padding:2px 12px">';
    var ledger = db.ledger.slice().sort(function(a,b){ return a.date < b.date ? 1 : -1; });
    db.scenes[0].rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){
      if(it.lent && !db.returned[it.id]) ledger.unshift({ id:it.id, text:it.name + ' → ' + it.lent.to, date:it.lent.due, returned:false, live:true });
    });});});
    if(!ledger.length) body += '<div class="empty">暂无记录</div>';
    ledger.slice(0, 8).forEach(function(l){
      body += '<div class="irow"><span class="imain"><span class="iname">' + esc(l.text) + '</span><span class="spath">' + esc(l.date) + (l.returned ? ' · 已归还' : (l.live ? ' · 进行中' : '')) + '</span></span>' +
        '<span class="chip ' + (l.returned ? 'c-green' : 'c-orange') + '">' + (l.returned ? '已还' : '借出') + '</span></div>';
    });
    body += '</div>';
    openSheet(h + '<div class="sh-body">' + body + '</div>');
  }

  /* ================= 表单（增删改） ================= */
  function itemForm(x){
    var it = x || {};
    var cats = ['电子','生活','学习','工具','药品','衣物','证件','玩具','办公','文具'];
    var opts = function(list, cur){ return list.map(function(v){ return '<option' + (v === cur ? ' selected' : '') + '>' + v + '</option>'; }).join(''); };
    return '<div><span class="f-label">物品名称 *</span><input class="f-input" name="name" required value="' + esc(it.name || '') + '" placeholder="如：护照"></div>' +
      '<div class="f-row"><div><span class="f-label">重要级</span><select class="f-select" name="imp">' +
      '<option value="daily"' + (it.imp === 'daily' ? ' selected' : '') + '>高频常用</option>' +
      '<option value="vital"' + (it.imp === 'vital' ? ' selected' : '') + '>低频但重要</option>' +
      '<option value="normal"' + (!it.imp || it.imp === 'normal' ? ' selected' : '') + '>普通</option>' +
      '<option value="dormant"' + (it.imp === 'dormant' ? ' selected' : '') + '>换季冬眠</option></select></div>' +
      '<div><span class="f-label">权属</span><select class="f-select" name="owner">' +
      '<option value="private"' + (it.owner === 'private' ? ' selected' : '') + '>私有</option>' +
      '<option value="family"' + (it.owner === 'family' ? ' selected' : '') + '>家庭共享</option>' +
      '<option value="shared"' + (it.owner === 'shared' ? ' selected' : '') + '>公共</option></select></div></div>' +
      '<div><span class="f-label">标签（逗号分隔，用于联想与搜索）</span><input class="f-input" name="tags" value="' + esc((it.tags || []).join(',')) + '" placeholder="如：证件,出行"></div>' +
      '<div class="f-check"><input type="checkbox" name="cons" id="f-cons"' + (it.cons ? ' checked' : '') + '><label for="f-cons">消耗品（启用数量管理）</label></div>' +
      '<div class="f-row"><div><span class="f-label">数量</span><input class="f-input" name="qty" type="number" min="0" value="' + (it.qty != null ? it.qty : 1) + '"></div>' +
      '<div><span class="f-label">单位</span><input class="f-input" name="unit" value="' + esc(it.unit || '') + '" placeholder="盒/瓶/包"></div>' +
      '<div><span class="f-label">效期剩余(天)</span><input class="f-input" name="expiry" type="number" min="0" value="' + (it.expiry != null ? it.expiry : '') + '"></div></div>' +
      '<div><span class="f-label">备注</span><textarea class="f-textarea" name="note" placeholder="如：一次一袋，温水冲服">' + esc(it.note || '') + '</textarea></div>' +
      '<div class="f-check"><input type="checkbox" name="cont" id="f-cont"' + (Store.db.contEntry ? ' checked' : '') + '><label for="f-cont">保存后继续录入下一件（连续模式）</label></div>' +
      formPhotoField(it ? Store.imgSrc(it.photoId) : null) +
      '<div class="f-hint">智能继承：本次类别默认沿用上次录入' + (Store.db.lastCat ? '（当前：' + esc(Store.db.lastCat) + '）' : '') + '</div>';
  }
  function containerForm(c, zones){
    c = c || {};
    return '<div><span class="f-label">收纳点名称 *</span><input class="f-input" name="name" required value="' + esc(c.name || '') + '" placeholder="如：书桌·左抽屉"></div>' +
      '<div class="f-row"><div><span class="f-label">视图类型</span><select class="f-select" name="kind">' +
      ['default:普通列表','stock:库存（数量/效期）','checklist:打卡（出门清单）','archive:档案（保密）','kids:趣味（儿童）'].map(function(s){
        var v = s.split(':')[0], t = s.split(':')[1];
        return '<option value="' + v + '"' + (c.kind === v || (!c.kind && v === 'default') ? ' selected' : '') + '>' + t + '</option>';
      }).join('') + '</select></div>' +
      '<div><span class="f-label">图标 emoji</span><input class="f-input" name="emoji" value="' + esc(c.emoji || '') + '" placeholder="📦"></div></div>' +
      '<div><span class="f-label">热区方位角 <span id="yaw-val">' + (c.yaw != null ? c.yaw : 180) + '°</span>（在全景图上的水平位置）</span>' +
      '<input class="f-range" type="range" name="yaw" min="0" max="359" value="' + (c.yaw != null ? c.yaw : 180) + '"></div>' +
      '<div><span class="f-label">热区高度</span><select class="f-select" name="row">' +
      '<option value="0.42"' + (c.row === 0.42 ? ' selected' : '') + '>较高处（如挂钩）</option>' +
      '<option value="0.58"' + (c.row === 0.58 || !c.row ? ' selected' : '') + '>中部</option>' +
      '<option value="0.68"' + (c.row === 0.68 ? ' selected' : '') + '>较低处（如抽屉）</option></select></div>' +
      '<div><span class="f-label">所属逻辑分区（可多选）</span>' +
      zones.map(function(z){
        var on = z.containerKeys.indexOf((c ? c._roomKey : '') ) >= 0;
        return '<label class="f-check"><input type="checkbox" name="zone" value="' + z.id + '"' + (on ? ' checked' : '') + '> ' + esc(z.emoji || '') + ' ' + esc(z.name) + '</label>';
      }).join('') + '</div>' + formPhotoField(c ? Store.imgSrc(c.photoId) : null);
  }
  function openItemModal(roomId, cid, editItem){
    var c = Store.findC(roomId, cid); if(!c) return;
    var it = editItem || null;
    var title = (it ? '编辑物品' : '快速录入') + ' → ' + c.name;
    openModal(title, itemForm(it), function(vals){
      if(!vals.name){ toast('请填写物品名称'); return; }
      if(it){
        it.name = vals.name; it.imp = vals.imp; it.owner = vals.owner;
        it.tags = vals.tags ? vals.tags.split(/[,，]/).map(function(s){ return s.trim(); }).filter(Boolean) : [];
        it.cons = vals.cons; it.qty = vals.qty; it.unit = vals.unit; it.expiry = vals.expiry;
        it.note = vals.note;
        if(S.formPhoto) it.photoId = Store.putImg(S.formPhoto);
      } else {
        c.items.push({
          id: uid('i'), name: vals.name, imp: vals.imp, owner: vals.owner,
          tags: vals.tags ? vals.tags.split(/[,，]/).map(function(s){ return s.trim(); }).filter(Boolean) : [],
          cons: vals.cons, qty: vals.qty, unit: vals.unit, expiry: vals.expiry, note: vals.note,
          photoId: S.formPhoto ? Store.putImg(S.formPhoto) : undefined,
          history: [{ t: new Date().toISOString(), text: '录入于 ' + (Store.findRoom(roomId) || {}).name + ' · ' + c.name }]
        });
        Store.db.lastCat = (vals.tags || '').split(/[,，]/)[0] || Store.db.lastCat;
      }
      Store.persist(); refreshSheet(); toast(it ? '已保存修改 ✓' : '已入库 ✓');
      if(vals.cont && !it){ openItemModal(roomId, cid, null); return true; }
    });
    /* 继承：新录入时默认标签建议 */
    if(!it && Store.db.lastCat){
      var t = $('#m-form [name=tags]');
      if(t && !t.value) t.value = Store.db.lastCat;
    }
  }
  function openContainerModal(roomId, editC){
    var r = Store.findRoom(roomId); if(!r) return;
    var c = editC || null;
    var key = roomId + '.' + (c ? c.id : '');
    var zones = Store.db.zones;
    var zonesCopy = zones.map(function(z){ return { id:z.id, name:z.name, emoji:z.emoji, containerKeys:z.containerKeys.slice(), _on: z.containerKeys.indexOf(key) >= 0 }; });
    var fields = containerForm(c ? Object.assign({ _roomKey:key }, c) : null, zonesCopy);
    openModal((c ? '编辑收纳点' : '添加收纳点') + ' · ' + r.name, fields, function(vals){
      if(c){
        c.name = vals.name; c.kind = vals.kind; c.emoji = vals.emoji;
        c.yaw = vals.yaw; c.row = vals.row;
        if(S.formPhoto) c.photoId = Store.putImg(S.formPhoto);
        zones.forEach(function(z){
          var i = z.containerKeys.indexOf(key);
          var want = vals.zones.indexOf(z.id) >= 0;
          if(want && i < 0) z.containerKeys.push(key);
          if(!want && i >= 0) z.containerKeys.splice(i, 1);
        });
      } else {
        var nc = { id: uid('c'), name: vals.name, kind: vals.kind, yaw: vals.yaw, row: vals.row, emoji: vals.emoji || '📦', photoId: S.formPhoto ? Store.putImg(S.formPhoto) : undefined, items: [] };
        r.containers.push(nc);
        zones.forEach(function(z){
          if(vals.zones.indexOf(z.id) >= 0) z.containerKeys.push(roomId + '.' + nc.id);
        });
      }
      Store.persist(); Pano.invalidate(roomId);
      if(S.view === 'room') openRoomView(roomId);
      openContainer(roomId, c ? c.id : nc.id);
      toast('已保存 ✓');
    });
  }
  function openRoomModal(editR){
    var sc = Store.scene();
    if(editR){
      openModal('编辑房间 · ' + editR.name,
        '<div><span class="f-label">房间名称 *</span><input class="f-input" name="name" required value="' + esc(editR.name) + '"></div>' +
        '<div><span class="f-label">主题色</span><select class="f-select" name="hue">' +
        [28,48,130,170,215,262,345].map(function(hu){ return '<option value="' + hu + '"' + (editR.hue === hu ? ' selected' : '') + '>' + ({28:'暖木色',48:'明亮黄',130:'清新绿',170:'青碧色',215:'沉稳蓝',262:'雅紫',345:'玫红'})[hu] + '</option>'; }).join('') + '</select></div>',
        function(vals){
          editR.name = vals.name; editR.hue = vals.hue;
          Store.persist(); Pano.invalidate(editR.id);
          if(S.view === 'room') openRoomView(editR.id); else renderHome();
          toast('已保存 ✓');
        });
      return;
    }
    openModal('添加房间 · ' + sc.name,
      '<div><span class="f-label">房间名称 *</span><input class="f-input" name="name" required placeholder="如：书房"></div>' +
      '<div><span class="f-label">主题色</span><select class="f-select" name="hue">' +
      [28,48,130,170,215,262,345].map(function(hu){ return '<option value="' + hu + '">' + ({28:'暖木色',48:'明亮黄',130:'清新绿',170:'青碧色',215:'沉稳蓝',262:'雅紫',345:'玫红'})[hu] + '</option>'; }).join('') + '</select></div>' +
      '<div class="f-hint">创建后进入房间，可上传 360° 全景照片或使用默认示意图，再添加收纳点。</div>',
      function(vals){
        var nr = { id: uid('r'), name: vals.name, hue: vals.hue, containers: [] };
        sc.rooms.push(nr);
        Store.persist(); renderHome();
        openRoomView(nr.id);
        toast('房间已创建，开始添加收纳点吧');
      });
  }
  function openLendModal(iid){
    var x = findX(iid); if(!x) return;
    openModal('标记外借 · ' + x.it.name,
      '<div><span class="f-label">借给谁 *</span><input class="f-input" name="to" required placeholder="如：同事小王"></div>' +
      '<div><span class="f-label">预计归还日期 *</span><input class="f-input" name="due" type="date" required value="' + new Date(Date.now() + 7*864e5).toISOString().slice(0,10) + '"></div>',
      function(vals){
        x.it.lent = { to: vals.to, due: vals.due };
        delete Store.db.returned[iid];
        Store.db.ledger.unshift({ id: uid('l'), text: x.it.name + ' → ' + vals.to, date: vals.due, returned: false });
        Store.persist(); refreshSheet(); renderRemind(); toast('已标记外借，到期自动提醒 ✓');
      });
  }
  function openRemindModal(roomId, cid, itemId){
    openModal('添加提醒',
      '<div><span class="f-label">提醒内容 *</span><input class="f-input" name="title" required placeholder="如：检查药箱 / 确认护照在原位"></div>' +
      '<div><span class="f-label">日期 *</span><input class="f-input" name="date" type="date" required value="' + new Date(Date.now() + 7*864e5).toISOString().slice(0,10) + '"></div>' +
      '<div><span class="f-label">重复</span><select class="f-select" name="repeat"><option value="none">不重复</option><option value="quarter">每 3 个月</option><option value="year">每年</option></select></div>',
      function(vals){
        Store.db.customReminders.push({ id: uid('r'), title: vals.title, date: vals.date, repeat: vals.repeat, room: roomId || '', c: cid || '' });
        Store.persist(); renderRemind(); toast('提醒已添加 ✓');
      });
  }

  /* ================= 语音 / NFC / 围栏 ================= */
  function voiceSearch(){
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ openModal('语音找物（不可用）', '<div class="note" style="padding:0">当前浏览器不支持语音识别（推荐 Chrome / Edge）。可直接在搜索框输入，例如「护照在哪」。</div><div><span class="f-label">或直接输入</span><input class="f-input" name="q" placeholder="护照在哪"></div>', function(v){ if(v.q) doSearch(v.q); }); return; }
    try{
      var rec = new SR(); rec.lang = 'zh-CN'; rec.interimResults = false;
      toast('🎙️ 正在聆听，请说出要找的物品…');
      rec.onresult = function(e){ var t = e.results[0][0].transcript; toast('识别到：' + t); doSearch(t); };
      rec.onerror = function(){ toast('语音识别失败，请手动输入'); };
      rec.start();
    }catch(e){ toast('语音识别启动失败'); }
  }
  function nfcTag(iid){
    var x = findX(iid); if(!x) return;
    if(!('NDEFReader' in window)){ toast('此环境不支持 Web NFC（需 Chrome on Android）；正式版可用贴纸二维码替代'); return; }
    try{
      var ndef = new NDEFReader();
      ndef.write({ records: [{ recordType: 'text', data: '归处·' + x.it.name + '·' + x.room.name + '·' + x.c.name }] })
        .then(function(){ toast('已写入 NFC 标签：碰一碰即可查看该物品 ✓'); })
        .catch(function(){ toast('NFC 写入失败：请靠近标签后重试'); });
    }catch(e){ toast('NFC 不可用'); }
  }
  function geoDist(a, b){
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var s = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
  }
  function geoHome(){
    if(!navigator.geolocation){ toast('当前环境不支持定位（需 https 或 localhost）'); return; }
    toast('正在获取当前位置…');
    navigator.geolocation.getCurrentPosition(function(p){
      Store.db.homeLoc = { lat: p.coords.latitude, lng: p.coords.longitude };
      Store.persist(); renderSet(); toast('已记录家的位置 ✓ 现在可以打开「离家提醒」开关');
    }, function(){ toast('定位失败：请检查浏览器定位权限'); }, { timeout: 8000 });
  }
  function geoArm(){
    var db = Store.db;
    if(!db.geofenceArmed){
      if(!db.homeLoc){ toast('请先「设当前位置为家」'); return; }
      if(!navigator.geolocation){ toast('当前环境不支持定位'); return; }
      db.geofenceArmed = true; Store.persist(); renderSet();
      S.geoWatch = navigator.geolocation.watchPosition(function(p){
        var d = geoDist(db.homeLoc, { lat: p.coords.latitude, lng: p.coords.longitude });
        if(d > 300 && !S.geoOut){ S.geoOut = true; $('#geobanner').hidden = false; }
        if(d < 150 && S.geoOut){ S.geoOut = false; $('#geobanner').hidden = true; }
      }, function(){}, { maximumAge: 30000 });
      toast('离家提醒已布防 ✓');
    } else {
      db.geofenceArmed = false; Store.persist(); renderSet();
      if(S.geoWatch){ navigator.geolocation.clearWatch(S.geoWatch); S.geoWatch = null; }
      $('#geobanner').hidden = true;
      toast('离家提醒已关闭');
    }
  }

  /* ================= 移动物品（记录位置历史） ================= */
  function openMoveModal(iid){
    var x = findX(iid); if(!x) return;
    var rooms = Store.rooms();
    var firstRoom = rooms[0];
    var opts = rooms.map(function(r){ return '<option value="' + r.id + '"' + (r.id === x.room.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('');
    var copts = firstRoom ? firstRoom.containers.map(function(c){ return '<option value="' + c.id + '"' + (c.id === x.c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') : '';
    openModal('移动 · ' + x.it.name,
      '<div><span class="f-label">目标房间</span><select class="f-select" name="mroom">' + opts + '</select></div>' +
      '<div><span class="f-label">目标收纳点</span><select class="f-select" name="mcont">' + copts + '</select></div>' +
      '<div class="f-hint">移动会记入位置变更历史，以后找不到了可以回溯。</div>',
      function(vals){
        var targetC = Store.findC(vals.mroom, vals.mcont);
        var targetR = Store.findRoom(vals.mroom);
        if(!targetC || !targetR){ toast('目标不存在'); return true; }
        if(targetC.id === x.c.id){ toast('已在该收纳点'); return true; }
        var from = x.room.name + ' · ' + x.c.name;
        x.c.items = x.c.items.filter(function(z){ return z.id !== iid; });
        targetC.items.push(x.it);
        if(x.it.status === 'packed'){ x.it.status = null; x.it.box = null; }
        x.it.history = x.it.history || [];
        x.it.history.unshift({ t: new Date().toISOString(), text: '从 ' + from + ' 移到 ' + targetR.name + ' · ' + targetC.name });
        Store.persist();
        S.room = vals.mroom;
        S.exp = iid;
        openContainer(vals.mroom, vals.mcont, iid, true);
        toast('已移动到 ' + targetR.name + ' · ' + targetC.name + ' ✓');
      });
  }

  /* ================= 系统通知（PWA） ================= */
  function dueSummary(){
    var lines = [];
    Store.dueList().slice(0, 2).forEach(function(x){ lines.push(x.it.name + ' · ' + dueChip(x.it.expiry)); });
    Store.customDueList().slice(0, 2).forEach(function(x){ if(x.due <= 3) lines.push(x.r.title + ' · ' + (x.due === 0 ? '今天' : x.due + '天后')); });
    var ll = Store.lentList();
    if(ll[0]) lines.push(ll[0].it.name + ' 应还 ' + shortDate(ll[0].it.lent.due));
    return lines;
  }
  function notifyCheck(force){
    if(!Store.db.notifyEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    var lines = dueSummary();
    if(!lines.length) return;
    var sig = new Date().toISOString().slice(0, 10) + '|' + lines.join('|');
    if(!force && localStorage.getItem('guichu-notify-sig') === sig) return;
    try{ localStorage.setItem('guichu-notify-sig', sig); }catch(e){}
    try{ new Notification('归处 · 今日提醒', { body: lines.slice(0, 3).join('\n'), tag: 'guichu-remind' }); }catch(e){}
  }
  var notifyTimer = 0;
  function notifyInit(){
    if(!Store.db.notifyEnabled) return;
    notifyCheck();
    clearInterval(notifyTimer);
    notifyTimer = setInterval(function(){ notifyCheck(); }, 30 * 60 * 1000);
  }
  function notifyToggle(){
    var db = Store.db;
    if(db.notifyEnabled){
      db.notifyEnabled = false; Store.persist(); renderSet(); toast('到期通知已关闭'); return;
    }
    if(typeof Notification === 'undefined'){ toast('当前浏览器不支持系统通知'); return; }
    Notification.requestPermission().then(function(p){
      if(p === 'granted'){
        db.notifyEnabled = true; Store.persist(); renderSet();
        notifyCheck(true);
        toast('系统通知已开启 ✓ 应用运行期间会推送到期提醒');
      } else toast('通知权限被拒绝：可在浏览器地址栏左侧的权限设置里恢复');
    }).catch(function(){ toast('无法请求通知权限'); });
  }

  /* ================= 应用锁（PIN，存哈希不存明文） ================= */
  function hashPin(pin, salt){
    var input = salt + '|' + pin;
    if(window.crypto && crypto.subtle && window.isSecureContext){
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)).then(function(buf){
        return 'sha256:' + Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    return Promise.resolve((function(){
      var h = 5381;
      for(var i = 0; i < input.length; i++){ h = ((h << 5) + h + input.charCodeAt(i)) | 0; }
      return 'djb2:' + (h >>> 0).toString(16);
    })());
  }
  function showLock(){
    S.unlocked = false;
    $('#lockscreen').hidden = false;
    var inp = $('#lock-input'); inp.value = ''; $('#lock-err').textContent = '';
    setTimeout(function(){ try{ inp.focus(); }catch(e){} }, 60);
  }
  function lockErr(msg){
    var box = $('#lock-box');
    box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    $('#lock-err').textContent = msg; $('#lock-input').value = '';
  }
  function tryUnlock(){
    var pin = $('#lock-input').value;
    if(!/^\d{4,6}$/.test(pin)){ lockErr('请输入 4-6 位数字'); return; }
    hashPin(pin, Store.db.lock.salt).then(function(h){
      if(h === Store.db.lock.hash){ S.unlocked = true; $('#lockscreen').hidden = true; toast('已解锁 ✓'); }
      else lockErr('PIN 不正确');
    });
  }
  function lockSetModal(){
    openModal('设置应用锁',
      '<div><span class="f-label">PIN（4-6 位数字）*</span><input class="f-input" name="pin1" type="password" inputmode="numeric" maxlength="6" required></div>' +
      '<div><span class="f-label">再输入一次 *</span><input class="f-input" name="pin2" type="password" inputmode="numeric" maxlength="6" required></div>' +
      '<div class="f-hint">PIN 以哈希保存在本机，不存明文。忘记 PIN 的解除方式：导出备份 → 清空数据 → 导入备份。</div>',
      function(vals){
        if(!/^\d{4,6}$/.test(vals.pin1) || vals.pin1 !== vals.pin2){ toast('两次输入不一致或格式不对'); return true; }
        var salt = uid('s');
        return hashPin(vals.pin1, salt).then(function(h){
          Store.db.lock = { hash: h, salt: salt };
          Store.persist(); renderSet(); toast('应用锁已开启 ✓ 下次打开需解锁');
        });
      });
  }
  function lockVerifyThen(title, onOk){
    openModal(title, '<div><span class="f-label">输入当前 PIN</span><input class="f-input" name="pin" type="password" inputmode="numeric" maxlength="6" required></div>', function(vals){
      return hashPin(vals.pin, Store.db.lock.salt).then(function(h){
        if(h !== Store.db.lock.hash){ toast('PIN 不正确'); return true; }
        onOk();
      });
    });
  }

  /* ================= AI 识别（OpenAI 兼容多模态接口，用户自带 Key） ================= */
  function aiConfigModal(){
    var ai = Store.db.ai || {};
    openModal('AI 识别配置（可选）',
      '<div><span class="f-label">API 地址（OpenAI 兼容 chat/completions）</span><input class="f-input" name="url" value="' + esc(ai.url || 'https://open.bigmodel.cn/api/paas/v4/chat/completions') + '"></div>' +
      '<div><span class="f-label">API Key（仅存本机）</span><input class="f-input" name="key" type="password" value="' + esc(ai.key || '') + '"></div>' +
      '<div><span class="f-label">模型名（需支持图片输入）</span><input class="f-input" name="model" value="' + esc(ai.model || 'glm-4v-flash') + '"></div>' +
      '<div class="f-hint">拍照后自动压缩发给该接口，返回名称/类别/标签建议。若提示跨域错误，请换支持 CORS 的服务商。</div>',
      function(vals){
        Store.db.ai = vals.key ? { url: (vals.url || '').trim(), key: vals.key.trim(), model: (vals.model || '').trim() || 'glm-4v-flash' } : null;
        Store.persist(); renderSet(); toast(Store.db.ai ? 'AI 识别已配置 ✓ 收纳点里会出现「AI 识别」按钮' : 'AI 配置已清除');
      });
  }
  function aiIdentify(dataURL){
    var ai = Store.db.ai;
    return fetch(ai.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ai.key },
      body: JSON.stringify({
        model: ai.model,
        messages: [{ role: 'user', content: [
          { type: 'text', text: '这是家中一个收纳位置（抽屉/柜子）的照片。识别其中最多 5 件物品，只输出 JSON 数组，格式：[{"name":"物品名","category":"电子|生活|学习|工具|药品|衣物|证件|玩具|办公|文具","tags":["标签"]}]，不要输出其他文字。' },
          { type: 'image_url', image_url: { url: dataURL } }
        ]}]
      })
    }).then(function(res){
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(data){
      var txt = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      var m = txt.match(/\[[\s\S]*\]/);
      if(!m) throw new Error('返回内容无法解析');
      return JSON.parse(m[0]);
    });
  }
  function aiCaptureModal(roomId, cid){
    var c = Store.findC(roomId, cid); if(!c) return;
    if(!Store.db.ai || !Store.db.ai.key){ toast('请先在「设置 → AI 识别」填写 API 地址与 Key'); return; }
    S.aiTarget = { room: roomId, c: cid, photo: null, cards: null };
    var h = sheetHead('🤖 AI 识别', '拍摄「' + c.name + '」内部 → AI 预填 → 你确认入库');
    h += '<div class="sh-body"><input type="file" accept="image/*" id="ai-photo" style="width:100%"><div id="ai-result" style="margin-top:10px"><div class="empty">选择照片后自动识别</div></div></div>' +
      '<div class="sh-foot"><button type="button" class="btn primary block cursor" data-act="ai-confirm" id="ai-confirm" disabled>确认入库</button></div>';
    openSheet(h);
    $('#ai-photo').addEventListener('change', function(e){
      var f = e.target.files && e.target.files[0]; if(!f) return;
      Store.fileToDataURL(f, 800, function(url){
        if(!url){ toast('照片读取失败'); return; }
        S.aiTarget.photo = url;
        $('#ai-result').innerHTML = '<img class="f-preview" src="' + url + '"><div class="empty">🤖 正在识别…</div>';
        aiIdentify(url).then(function(cards){
          if(!Array.isArray(cards) || !cards.length) throw new Error('未识别到物品');
          S.aiTarget.cards = cards.slice(0, 5).map(function(x){ return { name: x.name || '未命名', cat: x.category || '生活', tags: x.tags || [], keep: true }; });
          renderAiCards();
        }).catch(function(err){
          $('#ai-result').innerHTML = '<div class="empty">识别失败：' + esc(err.message || '') + '<br>若为跨域/网络错误，请更换支持 CORS 的服务商；仍可手动录入。</div>';
        });
      });
    });
  }
  function renderAiCards(){
    var t = S.aiTarget; if(!t || !t.cards) return;
    var h = '';
    t.cards.forEach(function(cd, i){
      h += '<div class="aicard"><button type="button" class="keepbtn cursor" data-aikeep="' + i + '" aria-pressed="' + cd.keep + '">' + (cd.keep ? '✓' : '') + '</button>' +
        '<div style="flex:1;min-width:0"><input class="f-input" style="margin-bottom:5px" value="' + esc(cd.name) + '" data-ainame="' + i + '">' +
        '<select class="f-select" data-aicat="' + i + '">' + ['电子','生活','学习','工具','药品','衣物','证件','玩具','办公','文具'].map(function(cat){ return '<option' + (cat === cd.cat ? ' selected' : '') + '>' + cat + '</option>'; }).join('') + '</select></div></div>';
    });
    h += '<div class="f-hint">取消勾选 = 不入库；名称可直接修改。</div>';
    $('#ai-result').innerHTML = h;
    var btn = $('#ai-confirm'); if(btn){ btn.disabled = false; btn.textContent = '确认入库（' + t.cards.filter(function(x){ return x.keep; }).length + ' 件）'; }
  }
  function aiConfirm(){
    var t = S.aiTarget; if(!t || !t.cards) return;
    var c = Store.findC(t.room, t.c); if(!c) return;
    var n = 0;
    t.cards.forEach(function(cd){
      if(!cd.keep || !cd.name.trim()) return;
      c.items.push({ id: uid('i'), name: cd.name.trim(), imp: 'normal', owner: 'private',
        tags: [cd.cat].concat(cd.tags || []), cons: false, qty: 1, note: '',
        photoId: t.photo ? Store.putImg(t.photo) : undefined,
        history: [{ t: new Date().toISOString(), text: '录入于 ' + (Store.findRoom(t.room) || {}).name + ' · ' + c.name + '（AI 识别）' }] });
      n++;
    });
    Store.db.lastCat = (t.cards[0] && t.cards[0].cat) || Store.db.lastCat;
    Store.persist(); openContainer(t.room, t.c);
    toast('AI 已入库 ' + n + ' 件 ✓');
  }

  /* ================= 箱贴打印 ================= */
  function printBoxLabel(box){
    var groups = [];
    Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){
      var packed = c.items.filter(function(it){ return it.status === 'packed' && it.box === box; });
      if(packed.length) groups.push({ room: r.name, c: c.name, items: packed });
    });});
    var total = groups.reduce(function(a, g){ return a + g.items.length; }, 0);
    var h = '<div class="pl-card"><div class="pl-brand">GUICHU · 归处搬家箱贴</div><div class="pl-no">' + esc(box) + '</div>' +
      '<div class="pl-qr">扫码区<br>（预留）</div>' +
      '<div class="pl-meta">打包日期：' + new Date().toLocaleDateString('zh-CN') + ' · 共 ' + total + ' 件</div>';
    groups.forEach(function(g){
      h += '<div class="pl-g"><b>' + esc(g.room) + ' · ' + esc(g.c) + '</b><ul>' + g.items.map(function(it){ return '<li>' + esc(it.name) + '</li>'; }).join('') + '</ul></div>';
    });
    h += '</div>';
    $('#print-area').innerHTML = h;
    window.print();
  }

  /* ================= 导入 / 导出 / 重置 ================= */
  function exportBackup(){
    if(Store.downloadText('guichu-backup-' + new Date().toISOString().slice(0,10) + '.json', Store.buildBackup(), 'application/json')) toast('备份已导出 ✓ 含全部数据与照片');
    else toast('导出失败');
  }
  function exportList(kind){
    if(Store.downloadText('guichu-items.' + kind, Store.buildExport(kind), kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json')) toast('清单已导出 .' + kind + ' ✓');
    else toast('导出失败');
  }
  function importBackupFile(file){
    var fr = new FileReader();
    fr.onload = function(){
      try{
        Store.importBackup(fr.result);
        applySenior();
        renderHome(); closeSheet(); toast('备份导入成功 ✓');
        showTab('home');
      }catch(e){ toast('导入失败：' + (e.message || '文件格式不符')); }
    };
    fr.readAsText(file);
  }

  function applySenior(){ $('#app').dataset.senior = Store.db.senior ? '1' : '0'; }

  /* ================= 事件分发 ================= */
  function bind(){
    document.addEventListener('click', function(e){
      /* AI 建议卡片勾选（无 data-act，单独处理） */
      var ak = e.target.closest('[data-aikeep]');
      if(ak && S.aiTarget && S.aiTarget.cards){
        var i3 = parseInt(ak.dataset.aikeep, 10);
        S.aiTarget.cards[i3].keep = !S.aiTarget.cards[i3].keep;
        ak.setAttribute('aria-pressed', String(S.aiTarget.cards[i3].keep));
        ak.textContent = S.aiTarget.cards[i3].keep ? '✓' : '';
        var cb = $('#ai-confirm'); if(cb) cb.textContent = '确认入库（' + S.aiTarget.cards.filter(function(x){ return x.keep; }).length + ' 件）';
        return;
      }
      var b = e.target.closest('[data-act]');
      if(!b) return;
      var d = b.dataset;
      switch(d.act){
        case 'tab': showTab(d.t); break;
        case 'back': closeRoomView(); break;
        case 'open-room': closeSheet(); openRoomView(d.room); break;
        case 'scene-switch': Store.db.activeScene = d.s; Store.persist(); closeSheet(); renderHome(); toast('已切换到「' + Store.scene().name + '」'); break;
        case 'scene-add':
          openModal('添加住址', '<div><span class="f-label">住址名称 *</span><input class="f-input" name="name" required placeholder="如：父母家"></div><div><span class="f-label">图标 emoji</span><input class="f-input" name="emoji" placeholder="🏡"></div>', function(v){
            Store.db.scenes.push({ id: uid('s'), name: v.name, emoji: v.emoji || '🏠', rooms: [] });
            Store.persist(); renderHome(); toast('住址已添加 ✓');
          });
          break;
        case 'q': doSearch(d.q); break;
        case 'voice-search': voiceSearch(); break;
        case 'senior':
          Store.db.senior = !Store.db.senior; Store.persist(); applySenior();
          $$('[data-act="senior"]').forEach(function(x){ x.setAttribute('aria-pressed', String(Store.db.senior)); });
          renderHome(); renderSet(); toast(Store.db.senior ? '已开启长辈模式' : '已关闭长辈模式');
          break;
        case 'geofence-check': {
          var hook = null, hookRoom = null;
          Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ if(c.kind === 'checklist' && !hook){ hook = c; hookRoom = r.id; } }); });
          if(hook){ closeSheet(); openRoomView(hookRoom, { c: hook.id }); }
          else toast('请先在某个房间创建「打卡」类型收纳点');
          break;
        }
        case 'geofence-dismiss': $('#geobanner').hidden = true; break;
        case 'geo-home': geoHome(); break;
        case 'geo-arm': geoArm(); break;
        case 'room-add': openRoomModal(null); break;
        case 'room-edit': {
          var r2 = Store.findRoom(S.room); if(r2) openRoomModal(r2);
          break;
        }
        case 'room-del': {
          var r3 = Store.findRoom(S.room); if(!r3) break;
          if(!confirm('确定删除房间「' + r3.name + '」及其下所有收纳点和物品？此操作不可撤销（建议先导出备份）。')) break;
          var sc3 = Store.scene(); sc3.rooms = sc3.rooms.filter(function(x){ return x.id !== r3.id; });
          Store.db.zones.forEach(function(z){ z.containerKeys = z.containerKeys.filter(function(k){ return k.split('.')[0] !== r3.id; }); });
          Store.persist(); closeRoomView(); toast('房间已删除');
          break;
        }
        case 'room-pano-upload': S.panoTarget = S.room; $('#file-pano').click(); break;
        case 'room-pano-reset': {
          var r4 = Store.findRoom(S.room); if(!r4) break;
          delete r4.panoId; Pano.invalidate(r4.id); Store.persist(); openRoomView(r4.id); toast('已恢复默认示意图');
          break;
        }
        case 'c-add': openContainerModal(S.room, null); break;
        case 'c-open': closeSheet(); openContainer(d.room, d.c); break;
        case 'c-edit': openContainerModal(d.room, Store.findC(d.room, d.c)); break;
        case 'c-del': {
          var c8 = Store.findC(S.room, S.openC); if(!c8) break;
          if(!confirm('确定删除收纳点「' + c8.name + '」及其全部物品？')) break;
          var r8 = Store.findRoom(S.room);
          r8.containers = r8.containers.filter(function(x){ return x.id !== c8.id; });
          Store.db.zones.forEach(function(z){ z.containerKeys = z.containerKeys.filter(function(k){ return k !== S.room + '.' + c8.id; }); });
          Store.persist(); closeSheet(); openRoomView(S.room); toast('收纳点已删除');
          break;
        }
        case 'item-add': openItemModal(S.room, S.openC, null); break;
        case 'itemx': S.exp = S.exp === d.item ? null : d.item; refreshSheet(); break;
        case 'item-edit': {
          var x9 = findX(d.item); if(x9) openItemModal(x9.room.id, x9.c.id, x9.it);
          break;
        }
        case 'item-move': openMoveModal(d.item); break;
        case 'item-del': {
          var x10 = findX(d.item); if(!x10) break;
          if(!confirm('确定删除「' + x10.it.name + '」？')) break;
          x10.c.items = x10.c.items.filter(function(x){ return x.id !== d.item; });
          Store.persist(); refreshSheet(); toast('已删除');
          break;
        }
        case 'lend': openLendModal(d.item); break;
        case 'return': {
          var x11 = findX(d.item); if(!x11) break;
          Store.db.returned[d.item] = true;
          Store.db.ledger.unshift({ id: uid('l'), text: x11.it.name + ' → ' + x11.it.lent.to, date: Store.today().toISOString().slice(0,10), returned: true });
          Store.persist(); renderRemind(); toast('已确认归还 ✓');
          break;
        }
        case 'remind-add': openRemindModal(d.room, d.c, d.item); break;
        case 'remind-del':
          Store.db.customReminders = Store.db.customReminders.filter(function(r){ return r.id !== d.r; });
          Store.persist(); renderRemind(); toast('提醒已删除');
          break;
        case 'owner-cycle': {
          var x12 = findX(d.item); if(!x12) break;
          var order = ['private','family','shared'];
          var i2 = order.indexOf(x12.it.owner);
          x12.it.owner = order[(i2 + 1) % 3];
          Store.persist(); refreshSheet(); toast('权属：' + Store.OWNLBL[x12.it.owner][0]);
          break;
        }
        case 'discard': {
          var x13 = findX(d.item); if(!x13) break;
          x13.it.status = x13.it.status === 'discarded' ? null : 'discarded';
          Store.persist(); refreshSheet(); toast(x13.it.status ? '已标记丢弃（可在导出清单中查看）' : '已恢复');
          break;
        }
        case 'nfc-tag': nfcTag(d.item); break;
        case 'qty': {
          var x14 = findX(d.item); if(!x14 || typeof x14.it.qty !== 'number') break;
          x14.it.qty = Math.max(0, Math.min(999, x14.it.qty + parseInt(d.d, 10)));
          Store.persist(); refreshSheet();
          break;
        }
        case 'toggle-done': {
          var cur = !!Store.db.checklistDone[d.item];
          Store.db.checklistDone[d.item] = !cur; Store.persist(); refreshSheet();
          break;
        }
        case 'out-ok': {
          var c15 = Store.findC(S.room, S.openC); if(!c15) break;
          c15.items.forEach(function(x){ Store.db.checklistDone[x.id] = true; });
          Store.persist(); refreshSheet(); toast('出门清单已确认 ✓');
          break;
        }
        case 'out-home': {
          var c16 = Store.findC(S.room, S.openC); if(!c16) break;
          c16.items.forEach(function(x){ Store.db.checklistDone[x.id] = false; });
          Store.persist(); refreshSheet(); toast('已复位：物品全部归位');
          break;
        }
        case 'zone-open': openZone(d.zone); break;
        case 'zone-add':
          openModal('添加逻辑分区', '<div><span class="f-label">分区名称 *</span><input class="f-input" name="name" required placeholder="如：出差装备区"></div><div><span class="f-label">图标 emoji</span><input class="f-input" name="emoji" placeholder="🏷️"></div><div class="f-hint">创建后，在收纳点的「编辑」里勾选所属分区。</div>', function(v){
            Store.db.zones.push({ id: uid('z'), name: v.name, emoji: v.emoji || '🏷️', containerKeys: [] });
            Store.persist(); renderHome(); closeSheet(); toast('分区已创建 ✓');
          });
          break;
        case 'zone-del':
          Store.db.zones = Store.db.zones.filter(function(z){ return z.id !== d.zone; });
          Store.persist(); closeSheet(); renderHome(); toast('分区已删除（物品不受影响）');
          break;
        case 'event-open': openEvent(d.ev); break;
        case 'event-add':
          openModal('添加日程（自动联想备物）',
            '<div><span class="f-label">日程标题 *</span><input class="f-input" name="title" required placeholder="如：周六露营 / 出差上海"></div>' +
            '<div class="f-row"><div><span class="f-label">日期</span><input class="f-input" name="date" type="date" value="' + new Date(Date.now() + 864e5).toISOString().slice(0,10) + '"></div>' +
            '<div><span class="f-label">图标</span><input class="f-input" name="emoji" placeholder="⛺"></div></div>' +
            '<div class="f-hint">标题中包含关键词（露营/出差/体检/旅行/上班/健身…）会自动按标签联想物品清单。</div>',
            function(v){
              Store.db.events.unshift({ id: uid('e'), emoji: v.emoji || '📅', title: v.title, date: v.date });
              Store.persist(); renderHome(); toast('日程已添加 ✓');
            });
          break;
        case 'event-del':
          Store.db.events = Store.db.events.filter(function(x){ return x.id !== d.ev; });
          Store.persist(); closeSheet(); renderHome(); toast('日程已删除');
          break;
        case 'fly': {
          closeSheet();
          openRoomView(d.room, { c: d.c, item: d.item || null });
          break;
        }
        case 'zone-add-pack': break;
        case 'pack-open': openPack(); break;
        case 'pack-one': {
          var c17 = Store.findC(S.room || '', d.c) || (function(){ var f = null; Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ if(c.id === d.c) f = c; }); }); return f; })();
          if(!c17) break;
          var nb = nextBoxName(), n = 0;
          c17.items.forEach(function(it){ it.status = 'packed'; it.box = nb; n++; });
          Store.persist(); openPack(); toast('已打包 ' + n + ' 件至「' + nb + '」· 搜索箱号可整箱找到');
          break;
        }
        case 'box-view': boxView(d.box); break;
        case 'unpack': {
          var box = d.box, m = 0;
          Store.scene('home').rooms.forEach(function(r){ r.containers.forEach(function(c){ c.items.forEach(function(it){ if(it.status === 'packed' && it.box === box){ it.status = null; it.box = null; m++; } }); }); });
          Store.persist(); openPack(); toast('已开箱 ' + m + ' 件，恢复原位 ✓');
          break;
        }
        case 'share-open': openShare(); break;
        case 'member-add':
          openModal('邀请成员', '<div><span class="f-label">成员昵称 *</span><input class="f-input" name="name" required placeholder="如：爸爸"></div><div class="f-hint">正式版通过邀请码加入同一住址；当前单机版先登记成员与权限。</div>', function(v){
            Store.db.members.push({ id: uid('m'), name: v.name, role: '成员' });
            Store.persist(); openShare(); toast('成员已添加 · 邀请码：GUICHU-' + Math.random().toString(36).slice(2,6).toUpperCase());
          });
          break;
        case 'member-del':
          Store.db.members = Store.db.members.filter(function(m){ return m.id !== d.m; });
          Store.persist(); openShare(); toast('成员已移除');
          break;
        case 'restock': toast('已加入购物清单 🧺（可在备忘中查看）'); break;
        case 'exp-backup': exportBackup(); break;
        case 'exp-json': exportList('json'); break;
        case 'exp-csv': exportList('csv'); break;
        case 'imp-json': $('#file-import').click(); break;
        case 'wipe':
          if(!confirm('确定清空全部数据并恢复示例数据？建议先导出备份。')) break;
          Store.wipe(); applySenior(); closeSheet(); showTab('home'); toast('已重置为示例数据');
          break;
        case 'notify-toggle': notifyToggle(); break;
        case 'notify-test': notifyCheck(true); toast('测试通知已发送（如未弹出请检查系统勿扰设置）'); break;
        case 'lock-set': lockSetModal(); break;
        case 'lock-off': lockVerifyThen('关闭应用锁', function(){ Store.db.lock = null; Store.persist(); renderSet(); toast('应用锁已关闭'); }); break;
        case 'lock-now': closeSheet(); showLock(); break;
        case 'ai-config': aiConfigModal(); break;
        case 'ai-capture': closeSheet(); aiCaptureModal(d.room, d.c); break;
        case 'ai-confirm': aiConfirm(); break;
        case 'cont-toggle': Store.db.contEntry = Store.db.contEntry === false; Store.persist(); renderSet(); toast(Store.db.contEntry ? '连续录入已开启' : '连续录入已关闭'); break;
        case 'box-print': printBoxLabel(d.box); break;
        case 'close-sheet': closeSheet(); break;
      }
    });
    document.addEventListener('click', function(e){
      if(e.target === $('#dim')) closeSheet();
      if(e.target === $('#modal')) closeModal();
    });
    document.addEventListener('submit', function(e){
      if(e.target && e.target.id === 'searchform'){
        e.preventDefault();
        var q = $('#q').value; if(q.trim()) doSearch(q);
      }
      if(e.target && e.target.id === 'm-form'){
        e.preventDefault();
        if(!S.modalSubmit) return;
        var fd = new FormData(e.target);
        var vals = {};
        fd.forEach(function(v, k){ if(k !== 'zone' && k !== 'photo') vals[k] = typeof v === 'string' ? v.trim() : v; });
        vals.cons = !!fd.get('cons');
        vals.cont = !!fd.get('cont');
        vals.zones = $$('[name=zone]:checked', e.target).map(function(x){ return x.value; });
        vals.qty = vals.qty ? parseInt(vals.qty, 10) : null;
        vals.expiry = vals.expiry ? parseInt(vals.expiry, 10) : null;
        vals.yaw = vals.yaw ? parseInt(vals.yaw, 10) : 180;
        vals.row = vals.row ? parseFloat(vals.row) : 0.58;
        vals.hue = vals.hue ? parseInt(vals.hue, 10) : 215;
        vals.imp = vals.imp || 'normal';
        vals.owner = vals.owner || 'private';
        vals.kind = vals.kind || 'default';
        vals.repeat = vals.repeat || 'none';
        if(S.formPhoto) vals.photo = S.formPhoto;
        var res = S.modalSubmit(vals, e.target);
        if(res && typeof res.then === 'function'){
          res.then(function(keep){ if(keep !== true) closeModal(); })
             .catch(function(err){ toast(err && err.message ? err.message : '操作失败'); });
        } else if(res !== true) closeModal();
      }
    });
    /* 表单内照片选择 → 压缩预览；移动弹窗的房间联动；AI 卡片编辑 */
    $('#m-form').addEventListener('change', function(e){
      var t = e.target;
      if(t.name === 'mroom'){
        var nr2 = Store.findRoom(t.value);
        var sel = $('#m-form [name=mcont]');
        if(nr2 && sel) sel.innerHTML = nr2.containers.map(function(c){ return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
        return;
      }
      if(t.dataset && t.dataset.photo !== undefined && t.files && t.files[0]){
        Store.fileToDataURL(t.files[0], 640, function(url){
          if(!url){ toast('照片读取失败'); return; }
          S.formPhoto = url;
          var hidden = $('#m-form [name=photo]'); if(hidden) hidden.value = url;
          var old = $('#m-form .f-preview'); if(old) old.remove();
          var div = t.closest('div');
          var img = document.createElement('img');
          img.className = 'f-preview'; img.src = url; img.alt = '';
          div.insertBefore(img, t);
        });
      }
    });
    /* 全景上传 */
    $('#file-pano').addEventListener('change', function(e){
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if(!f || !S.panoTarget) return;
      var rid = S.panoTarget; S.panoTarget = null;
      var r = Store.findRoom(rid); if(!r) return;
      toast('正在压缩全景图…');
      Store.fileToDataURL(f, 1600, function(url){
        if(!url){ toast('图片读取失败'); return; }
        var pid = Store.putImg(url);
        if(pid) r.panoId = pid;
        Store.persist(); Pano.open(rid);
        toast('全景图已更新 ✓ 编辑收纳点可校准热区方位');
      });
    });
    /* 备份导入 */
    $('#file-import').addEventListener('change', function(e){
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if(f) importBackupFile(f);
    });
    /* AI 卡片名称/类别编辑 */
    $('#sheet').addEventListener('change', function(e){
      var t = e.target;
      if(!S.aiTarget || !S.aiTarget.cards) return;
      if(t.dataset && t.dataset.ainame !== undefined){ S.aiTarget.cards[parseInt(t.dataset.ainame, 10)].name = t.value; }
      if(t.dataset && t.dataset.aicat !== undefined){ S.aiTarget.cards[parseInt(t.dataset.aicat, 10)].cat = t.value; }
    });
    /* 应用锁键盘 */
    $('#lockscreen').addEventListener('click', function(e){
      var k = e.target.closest('[data-k]');
      if(!k) return;
      var inp = $('#lock-input');
      if(k.dataset.k === 'del') inp.value = inp.value.slice(0, -1);
      else if(k.dataset.k === 'ok') tryUnlock();
      else if(/^\d$/.test(k.dataset.k) && inp.value.length < 6){ inp.value += k.dataset.k; if(inp.value.length >= 6) tryUnlock(); }
    });
    $('#lock-input').addEventListener('keydown', function(e){ if(e.key === 'Enter') tryUnlock(); });
    /* 热区方位滑杆实时数值 */
    document.addEventListener('input', function(e){
      if(e.target && e.target.name === 'yaw'){
        var v = $('#yaw-val'); if(v) v.textContent = e.target.value + '°';
      }
    });
  }

  /* ================= 启动 ================= */
  function boot(){
    Store.load();
    Pano.init();
    applySenior();
    bind();
    showTab('home');
    /* IndexedDB 中的照片/全景预加载完成后重绘当前页 */
    Store.preloadImages(function(){ showTab(S.tab); });
    /* PWA：Service Worker（file:// 下不可用，静默跳过） */
    if('serviceWorker' in navigator && location.protocol.indexOf('http') === 0){
      navigator.serviceWorker.register('sw.js').catch(function(){});
    }
    notifyInit();
    /* 应用锁：设置了 PIN 则先解锁 */
    if(Store.db.lock) showLock(); else S.unlocked = true;
  }
  boot();

  return { toast: toast, openContainer: openContainer, doSearch: doSearch };
})();
