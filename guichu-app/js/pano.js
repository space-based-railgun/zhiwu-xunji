/* 归处 · 空间记忆管家 —— 全景引擎：默认房间示意图生成 + 环视拖拽 + 热区 + 镜头飞转 */
"use strict";

var Pano = (function(){
  var STRIPW = 2400, STRIPH = 600, FLOOR = 470;
  var thumbs = {};            /* 房间默认示意图缓存（仅内存，不入库） */
  var stripwrap, panoimg, hotEl;
  var st = { room:null, offX:0, lon:0, lat:-10, fov:75, hots:[], flyRaf:0, dragged:false };
  var mode = 'strip';   /* strip=条带（默认示意图） / gl=WebGL 球面（真实全景照片） */

  /* ---------- WebGL 球面渲染：把 equirectangular 全景贴到虚拟球体内侧 ---------- */
  var glc = null, gl = null, glProg = null, glTex = null, glOK = false, glReady = false;
  function initGL(){
    if(glOK) return glOK;
    try{
      if(!glc) glc = document.getElementById('glcanvas');
      gl = glc.getContext('webgl') || glc.getContext('experimental-webgl');
      if(!gl) return false;
      var vs = 'attribute vec2 a;varying vec2 v;void main(){v=a;gl_Position=vec4(a,0.,1.);}';
      var fs = 'precision mediump float;varying vec2 v;uniform sampler2D tex;uniform float lon;uniform float lat;uniform float fov;uniform float aspect;' +
        'void main(){float tf=tan(fov/2.);vec3 d=normalize(vec3(v.x*tf*aspect,v.y*tf,-1.));' +
        'float L=radians(lon),P=radians(lat);' +
        'vec3 f=vec3(sin(L)*cos(P),sin(P),-cos(L)*cos(P));' +
        'vec3 r=vec3(cos(L),0.,sin(L));' +
        'vec3 u=vec3(-sin(L)*sin(P),cos(P),cos(L)*sin(P));' +
        'vec3 w=normalize(d.x*r+d.y*u-d.z*f);' +
        'float lo=atan(w.x,-w.z)/6.2831853;float vv=asin(clamp(w.y,-1.,1.))/3.14159265;' +
        'gl_FragColor=texture2D(tex,vec2(fract(lo),clamp(0.5-vv,0.,1.)));}';
      function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
      var p = gl.createProgram();
      gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if(!gl.getProgramParameter(p, gl.LINK_STATUS)) return false;
      gl.useProgram(p);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(p, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      glTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(p, 'tex'), 0);
      glProg = p;
      glOK = true;
    }catch(e){ glOK = false; }
    return glOK;
  }
  function sphereTexture(dataURL){
    var img = new Image();
    img.onload = function(){
      if(!gl) return;
      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      glReady = true;
      paint();
    };
    img.src = dataURL;
  }
  function drawGL(){
    var W = stripwrap.clientWidth, H = stripwrap.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if(glc.width !== Math.round(W * dpr)){ glc.width = Math.round(W * dpr); glc.height = Math.round(H * dpr); }
    gl.viewport(0, 0, glc.width, glc.height);
    gl.uniform1f(gl.getUniformLocation(glProg, 'lon'), st.lon);
    gl.uniform1f(gl.getUniformLocation(glProg, 'lat'), st.lat);
    gl.uniform1f(gl.getUniformLocation(glProg, 'fov'), st.fov * Math.PI / 180);
    gl.uniform1f(gl.getUniformLocation(glProg, 'aspect'), W / H);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function wrap180(d){ d = ((d % 360) + 360) % 360; return d > 180 ? d - 360 : d; }
  function projectHotspotsGL(){
    var W = stripwrap.clientWidth, H = stripwrap.clientHeight;
    var tfY = Math.tan(st.fov * Math.PI / 360);
    var tfX = tfY * (W / H);
    st.hots.forEach(function(hs){
      var dLon = wrap180(hs.yaw - st.lon);
      var dLat = (0.5 - hs.row) * 180 - st.lat;
      var vis = Math.abs(dLon) < 80 && Math.abs(dLat) < 80;
      hs.el.hidden = !vis;
      if(vis){
        hs.el.style.left = (W / 2 + Math.tan(dLon * Math.PI / 180) / tfX * (W / 2)) + 'px';
        hs.el.style.top = (H / 2 - Math.tan(dLat * Math.PI / 180) / tfY * (H / 2)) + 'px';
      }
    });
  }

  function ypx(yaw){ return yaw / 360 * STRIPW; }
  function seeded(s){ var h = 2166136261; for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return function(){ h = Math.imul(h ^ h>>>15, 2246822519); h = Math.imul(h ^ h>>>13, 3266489917); return ((h ^= h>>>16) >>> 0) / 4294967296; }; }

  /* ---------- 默认房间示意图（程序化绘制，不占存储） ---------- */
  function shadowAt(x, cx, w){ x.fillStyle = 'rgba(0,0,0,.13)'; x.beginPath(); x.ellipse(cx, FLOOR+8, w, 10, 0, 0, 7); x.fill(); }
  function boxBody(x, cx, w, h, fill){
    x.fillStyle = fill; x.fillRect(cx - w/2, FLOOR - h, w, h);
    x.strokeStyle = 'rgba(0,0,0,.30)'; x.lineWidth = 2; x.strokeRect(cx - w/2, FLOOR - h, w, h);
  }
  function drawDoor(x, cx, hue){
    shadowAt(x, cx, 40);
    x.fillStyle = '#6b5847'; x.fillRect(cx - 47, FLOOR - 238, 94, 242);
    x.fillStyle = 'hsl(' + hue + ',13%,46%)'; x.fillRect(cx - 40, FLOOR - 231, 80, 231);
    x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 2; x.strokeRect(cx - 40, FLOOR - 231, 80, 231);
    x.beginPath(); x.arc(cx + 28, FLOOR - 118, 4, 0, 7); x.fillStyle = '#e8e2d4'; x.fill();
  }
  function drawShape(x, ct, hue){
    var cx = ypx(ct.yaw);
    var bodyC = 'hsl(' + hue + ',15%,55%)', bodyD = 'hsl(' + hue + ',17%,43%)';
    var rnd = seeded(ct.id);
    var jarCols = ['#c96f4a','#7d9b76','#d9b25f','#7a86b8','#b8b0a4','#a5697d'];
    switch(ct.kind){
      case 'stock':
        shadowAt(x, cx, 90); boxBody(x, cx, 170, 150, bodyD);
        x.strokeStyle = 'rgba(0,0,0,.35)';
        x.beginPath(); x.moveTo(cx-85, FLOOR-100); x.lineTo(cx+85, FLOOR-100); x.stroke();
        x.beginPath(); x.moveTo(cx-85, FLOOR-50); x.lineTo(cx+85, FLOOR-50); x.stroke();
        [[FLOOR-100,4],[FLOOR-50,3],[FLOOR,3]].forEach(function(lv){
          var bx = cx - 72;
          for(var n=0; n<lv[1]; n++){
            var jw = 14 + rnd()*12, jh = 16 + rnd()*12;
            x.fillStyle = jarCols[Math.floor(rnd()*jarCols.length)];
            x.fillRect(bx, lv[0]-jh, jw, jh); bx += jw + 8 + rnd()*10;
          }
        });
        break;
      case 'archive':
        shadowAt(x, cx, 70);
        x.fillStyle = '#8f9bb0'; x.fillRect(cx-65, FLOOR-100, 130, 100);
        x.strokeStyle = 'rgba(0,0,0,.30)'; x.strokeRect(cx-65, FLOOR-100, 130, 100);
        x.fillStyle = '#f2eee2'; x.fillRect(cx-30, FLOOR-72, 60, 34);
        x.fillStyle = '#3c4353';
        x.beginPath(); x.arc(cx, FLOOR-112, 5, 0, 7); x.fill(); x.fillRect(cx-7, FLOOR-112, 14, 10);
        break;
      case 'checklist':
        x.fillStyle = '#8a6b4f'; x.fillRect(cx-92, 236, 184, 7);
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;
        [-60,0,60].forEach(function(off, ix){
          var hx = cx + off;
          x.beginPath(); x.arc(hx, 250, 5, 0, 7); x.stroke();
          if(ix === 1){ x.fillStyle = '#b0765a'; x.fillRect(hx-21, 272, 42, 56); }
          else if(ix === 0){ x.beginPath(); x.moveTo(hx,256); x.lineTo(hx,320); x.stroke(); x.beginPath(); x.arc(hx,330,13,3.4,6.0); x.lineTo(hx,330); x.fillStyle = '#5b7fa6'; x.fill(); }
          else { x.beginPath(); x.moveTo(hx,256); x.lineTo(hx,308); x.stroke(); x.strokeStyle = '#c9b48a'; x.lineWidth = 8; x.beginPath(); x.moveTo(hx-11,326); x.lineTo(hx+11,326); x.stroke(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; }
        });
        break;
      default:
        shadowAt(x, cx, 82); boxBody(x, cx, 150, 115, bodyC);
        x.strokeStyle = 'rgba(0,0,0,.30)';
        for(var i=1; i<3; i++){ x.beginPath(); x.moveTo(cx-75, FLOOR-115+i*38); x.lineTo(cx+75, FLOOR-115+i*38); x.stroke(); }
        x.fillStyle = 'rgba(255,255,255,.75)';
        for(var j=0; j<3; j++){ x.fillRect(cx-16, FLOOR-115+j*38+14, 32, 5); }
    }
  }
  function drawRoom(room){
    var hue = room.hue || 210;
    var c = document.createElement('canvas'); c.width = STRIPW; c.height = STRIPH;
    var x = c.getContext('2d');
    x.fillStyle = 'hsl(' + hue + ',16%,90%)'; x.fillRect(0, 0, STRIPW, 95);
    x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(0, 88, STRIPW, 10);
    var gr = x.createLinearGradient(0, 95, 0, FLOOR);
    gr.addColorStop(0, 'hsl(' + hue + ',24%,84%)'); gr.addColorStop(1, 'hsl(' + hue + ',22%,72%)');
    x.fillStyle = gr; x.fillRect(0, 95, STRIPW, FLOOR - 95);
    x.fillStyle = 'hsl(28,20%,46%)'; x.fillRect(0, FLOOR, STRIPW, STRIPH - FLOOR);
    x.strokeStyle = 'rgba(0,0,0,.14)'; x.lineWidth = 2;
    for(var i=0; i<30; i++){ x.beginPath(); x.moveTo(i*85, FLOOR); x.lineTo(i*85+34, STRIPH); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(0, FLOOR-5, STRIPW, 8);
    x.fillStyle = 'hsla(' + hue + ',34%,52%,.4)'; x.beginPath(); x.ellipse(STRIPW/2, FLOOR+62, 150, 26, 0, 0, 7); x.fill();
    var wx = STRIPW * 0.3;
    x.fillStyle = '#f4f1e8'; x.fillRect(wx-122, 142, 244, 186);
    var sky = x.createLinearGradient(0, 148, 0, 322); sky.addColorStop(0, '#b7d4ec'); sky.addColorStop(1, '#e2eef8');
    x.fillStyle = sky; x.fillRect(wx-108, 156, 216, 158);
    x.fillStyle = '#f4f1e8'; x.fillRect(wx-4, 156, 8, 158); x.fillRect(wx-108, 228, 216, 8);
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 3; x.strokeRect(wx-108, 156, 216, 158);
    var cx0 = STRIPW * 0.62;
    x.beginPath(); x.arc(cx0, 205, 27, 0, 7); x.fillStyle = '#f4f1e8'; x.fill();
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.stroke();
    x.beginPath(); x.moveTo(cx0, 205); x.lineTo(cx0, 188); x.moveTo(cx0, 205); x.lineTo(cx0+13, 209); x.stroke();
    var plx = STRIPW * 0.82;
    x.strokeStyle = '#5f8a5c'; x.lineWidth = 5;
    for(var k=0; k<5; k++){ x.beginPath(); x.moveTo(plx, FLOOR-24); x.quadraticCurveTo(plx+(k-2)*16, FLOOR-70-k*4, plx+(k-2)*26, FLOOR-92-k*6); x.stroke(); }
    x.fillStyle = '#b06a45'; x.beginPath(); x.moveTo(plx-24, FLOOR-30); x.lineTo(plx+24, FLOOR-30); x.lineTo(plx+17, FLOOR+6); x.lineTo(plx-17, FLOOR+6); x.closePath(); x.fill();
    room.containers.forEach(function(ct){ drawShape(x, ct, hue); });
    var vg = x.createLinearGradient(0, 0, 0, STRIPH);
    vg.addColorStop(0, 'rgba(255,255,255,.06)'); vg.addColorStop(1, 'rgba(0,0,0,.12)');
    x.fillStyle = vg; x.fillRect(0, 0, STRIPW, STRIPH);
    return c.toDataURL('image/jpeg', 0.72);
  }
  function roomImage(room){
    var src = Store.imgSrc(room.panoId);
    if(src) return src;
    if(!thumbs[room.id]) thumbs[room.id] = drawRoom(room);
    return thumbs[room.id];
  }
  function invalidate(roomId){ delete thumbs[roomId]; }

  /* ---------- 环视引擎 ---------- */
  function stripWd(){ return Math.round(STRIPW * (stripwrap.clientHeight / STRIPH)); }
  function wrapW(v){ var wd = stripWd(); return ((v % wd) + wd) % wd; }

  function open(roomId, opts){
    var r = Store.findRoom(roomId); if(!r) return;
    st.room = roomId; st.exp = null;
    /* 真实全景照片 → WebGL 球面；默认示意图 → 条带 */
    var panoSrc = Store.imgSrc(r.panoId);
    if(panoSrc && initGL()){
      mode = 'gl'; glReady = false;
      glc.hidden = false; panoimg.style.display = 'none';
      sphereTexture(panoSrc);
    } else {
      mode = 'strip';
      glc.hidden = true; panoimg.style.display = '';
      panoimg.style.backgroundImage = 'url(' + roomImage(r) + ')';
    }
    document.getElementById('pano-name').textContent = r.name;
    var chips = '';
    Store.rooms().forEach(function(rr){
      chips += '<button type="button" class="qchip cursor" data-act="open-room" data-room="' + rr.id + '"' + (rr.id === roomId ? ' active' : '') + '>' + Store.esc(rr.name) + '</button>';
    });
    document.getElementById('roomchips').innerHTML = chips;
    var cch = '';
    r.containers.forEach(function(c){
      cch += '<button type="button" class="qchip cursor" data-act="c-open" data-room="' + r.id + '" data-c="' + c.id + '">' + (c.emoji || '📦') + ' ' + Store.esc(c.name) + '</button>';
    });
    document.getElementById('cchips').innerHTML = cch;
    buildHotspots(r);
    var target = opts && opts.c ? Store.findC(roomId, opts.c) : null;
    var yaw = target ? target.yaw : (r.containers[0] ? r.containers[0].yaw : 180);
    st.offX = wrapW(ypx(yaw) - stripwrap.clientWidth / 2);
    paint();
    if(opts && opts.c && target) flyTo(target.yaw, function(){ if(Pano.onHighlight) Pano.onHighlight(opts); });
  }
  function close(){ cancelAnimationFrame(st.flyRaf); st.room = null; }
  function buildHotspots(r){
    st.hots = [];
    var h = '';
    r.containers.forEach(function(c){
      var n = c.items.filter(function(it){ return it.status !== 'discarded'; }).length;
      var label = c.name + ' · ' + n + '件';
      if(c.kind === 'checklist'){
        var un = c.items.filter(function(it){ return !(Store.db.checklistDone[it.id]); }).length;
        label = c.name + (un ? ' · 待确认' + un : ' · 已确认');
      }
      h += '<button type="button" class="hot cursor" data-act="c-open" data-room="' + r.id + '" data-c="' + c.id + '" data-px="' + ypx(c.yaw) + '" data-yaw="' + c.yaw + '" data-row="' + (c.row || .6) + '" aria-label="' + Store.esc(c.name) + '"><span class="hot-dot">' + (c.emoji || '📦') + '</span><span class="hot-label">' + Store.esc(label) + '</span></button>';
    });
    /* 相邻房间切换由下方房间标签完成，避免门热区堆叠 */
    hotEl.innerHTML = h;
    st.hots = Array.prototype.map.call(hotEl.querySelectorAll('.hot'), function(el){
      return { el:el, px:parseFloat(el.dataset.px), yaw:parseFloat(el.dataset.yaw), row:parseFloat(el.dataset.row) };
    });
  }
  function paint(){
    if(!st.room) return;
    if(mode === 'gl'){ if(glReady) drawGL(); projectHotspotsGL(); return; }
    var off = st.offX, wd = stripWd(), vw = stripwrap.clientWidth, sh = stripwrap.clientHeight;
    panoimg.style.backgroundPositionX = (-off) + 'px';
    st.hots.forEach(function(hs){
      var sx = ((hs.px - off) % wd + wd) % wd;
      var vis = sx <= vw + 70;
      hs.el.hidden = !vis;
      if(vis){ hs.el.style.left = sx + 'px'; hs.el.style.top = (hs.row * sh) + 'px'; }
    });
  }
  function flyTo(yaw, cb){
    if(mode === 'gl'){
      var fromLon = st.lon, dLon2 = wrap180(yaw - fromLon);
      var t02 = performance.now(), dur2 = 800, done2 = false;
      cancelAnimationFrame(st.flyRaf);
      function fin2(){ if(done2) return; done2 = true; st.lon = ((yaw % 360) + 360) % 360; paint(); if(cb) cb(); }
      function stp2(now){
        if(done2) return;
        var k = Math.min(1, (now - t02) / dur2);
        var e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k+2, 3) / 2;
        st.lon = ((fromLon + dLon2 * e) % 360 + 360) % 360;
        paint();
        if(k < 1) st.flyRaf = requestAnimationFrame(stp2); else fin2();
      }
      st.flyRaf = requestAnimationFrame(stp2);
      setTimeout(fin2, 1000);
      return;
    }
    var wd = stripWd();
    var target = wrapW(ypx(yaw) - stripwrap.clientWidth / 2);
    var from = st.offX;
    var dist = ((target - from) % wd + wd) % wd;
    if(dist > wd / 2) dist -= wd;
    var t0 = performance.now(), dur = 850, done = false;
    cancelAnimationFrame(st.flyRaf);
    function finish(){
      if(done) return; done = true;
      cancelAnimationFrame(st.flyRaf);
      st.offX = target; paint();
      if(cb) cb();
    }
    function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3) / 2; }
    function step(now){
      if(done) return;
      var k = Math.min(1, (now - t0) / dur);
      st.offX = wrapW(from + dist * ease(k));
      paint();
      if(k < 1) st.flyRaf = requestAnimationFrame(step); else finish();
    }
    st.flyRaf = requestAnimationFrame(step);
    setTimeout(finish, 1000);   /* 后台标签页 rAF 停摆时的兜底 */
  }
  function pulseAt(yaw){
    var wd = stripWd(), px = ypx(yaw);
    st.hots.forEach(function(hs){
      if(Math.abs(((hs.px - px + wd/2) % wd + wd) % wd - wd/2) < 4){
        var dot = hs.el.querySelector('.hot-dot');
        if(dot){ dot.classList.remove('pulse'); void dot.offsetWidth; dot.classList.add('pulse'); }
      }
    });
  }
  function initDrag(){
    var down = false, lastX = 0, lastY = 0, moved = 0;
    stripwrap.addEventListener('pointerdown', function(e){
      down = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
      try{ stripwrap.setPointerCapture(e.pointerId); }catch(err){}
    });
    stripwrap.addEventListener('pointermove', function(e){
      if(!down) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if(moved > 6) st.dragged = true;
      if(mode === 'gl'){
        st.lon = ((st.lon - dx * st.fov / Math.max(240, stripwrap.clientWidth)) % 360 + 360) % 360;
        st.lat = Math.max(-45, Math.min(45, st.lat + dy * st.fov / Math.max(240, stripwrap.clientHeight)));
        paint();
      } else if(dx){
        st.offX = wrapW(st.offX - dx); paint();
      }
    });
    function up(){ down = false; }
    stripwrap.addEventListener('pointerup', up);
    stripwrap.addEventListener('pointercancel', up);
    stripwrap.addEventListener('wheel', function(e){
      if(mode !== 'gl') return;
      e.preventDefault();
      st.fov = Math.max(40, Math.min(100, st.fov + (e.deltaY > 0 ? 4 : -4)));
      paint();
    }, { passive: false });
    stripwrap.addEventListener('click', function(e){
      if(st.dragged){ e.stopPropagation(); e.preventDefault(); st.dragged = false; }
    }, true);
  }

  function init(){
    stripwrap = document.getElementById('stripwrap');
    panoimg = document.getElementById('panoimg');
    hotEl = document.getElementById('hotspots');
    glc = document.getElementById('glcanvas');
    initDrag();
  }

  return {
    open:open, close:close, flyTo:flyTo, paint:paint, pulseAt:pulseAt,
    roomImage:roomImage, invalidate:invalidate, init:init,
    get state(){ return st; }
  };
})();
