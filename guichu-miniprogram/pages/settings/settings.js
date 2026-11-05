var store = require('../../utils/store.js');

Page({
  data: { senior: false, contEntry: false, aiSet: false, lockSet: false, itemN: 0, members: [], curUser: { emoji: '👤', name: '未登录' } },
  onLoad: function(){ this.setData(require('../../utils/nav.js').info()); },
  onShow: function(){
    var db = store.db;
    this.setData({
      senior: db.senior, contEntry: db.contEntry, aiSet: !!(db.ai && db.ai.key), lockSet: !!db.lock, itemN: store.allItems().length,
      curUser: store.currentMember() || { emoji: '👤', name: '未登录' },
      members: db.members.map(function(m){ return { id: m.id, name: m.name, role: m.role, emoji: m.emoji || '🙂', pin: !!m.pin, avatar: m.wxAvatar || '' }; })
    });
  },
  onSenior: function(){
    store.db.senior = !store.db.senior; store.save();
    this.setData({ senior: store.db.senior });
  },
  onCont: function(){
    store.db.contEntry = !store.db.contEntry; store.save();
    this.setData({ contEntry: store.db.contEntry });
  },
  onLockSet: function(){ wx.navigateTo({ url: '/pages/form/form?type=lockset' }); },
  onLockOff: function(){
    var that = this;
    wx.showModal({
      title: '关闭应用锁', editable: true, placeholderText: '输入当前 PIN',
      success: function(res){
        if (!res.confirm) return;
        var salt = store.db.lock.salt || '';
        var h = djb2(res.content || '', salt);
        if (h !== store.db.lock.hash){ wx.showToast({ title: 'PIN 不正确', icon: 'none' }); return; }
        store.db.lock = null; store.save(); that.onShow(); wx.showToast({ title: '已关闭', icon: 'none' });
      }
    });
  },
  onLockNow: function(){ wx.reLaunch({ url: '/pages/lock/lock' }); },
  onAI: function(){ wx.navigateTo({ url: '/pages/form/form?type=ai' }); },
  onGuide: function(){ wx.navigateTo({ url: '/pages/guide/guide' }); },
  onSwitch: function(){ wx.navigateTo({ url: '/pages/switch/switch' }); },
  onMemberAdd: function(){ wx.navigateTo({ url: '/pages/form/form?type=member' }); },
  onMemberEdit: function(e){ wx.navigateTo({ url: '/pages/form/form?type=member&edit=' + e.currentTarget.dataset.id }); },
  onCopyMail: function(){
    wx.setClipboardData({ data: '3437199533@qq.com', success: function(){ wx.showToast({ title: '邮箱已复制', icon: 'none' }); } });
  },
  onExport: function(){
    var that = this;
    store.buildBackup(function(text){
      wx.setClipboardData({ data: text, success: function(){
        wx.showModal({
          title: '备份已生成', content: '完整备份（含照片 base64）已复制到剪贴板，可粘贴给文件传输助手存档。是否直接转发为文件？',
          success: function(r){
            if (!r.confirm) return;
            var fsm = wx.getFileSystemManager();
            var p = wx.env.USER_DATA_PATH + '/guichu-backup.json';
            try{ fsm.writeFileSync(p, text, 'utf8'); wx.shareFileMessage({ filePath: p, fail: function(){} }); }catch(e){}
          }
        });
      }});
    });
  },
  onImport: function(){
    var that = this;
    wx.chooseMessageFile({
      count: 1, type: 'file',
      success: function(res){
        var f = res.tempFiles[0]; if (!f) return;
        wx.getFileSystemManager().readFile({
          filePath: f.path, encoding: 'utf8',
          success: function(r){
            try{
              store.importBackup(r.data);
              that.onShow(); wx.showToast({ title: '备份导入成功 ✓', icon: 'none' });
            }catch(e){ wx.showToast({ title: '导入失败：' + (e.message || '格式不符'), icon: 'none' }); }
          }
        });
      }
    });
  },
  onWipe: function(){
    var that = this;
    wx.showModal({
      title: '清空全部数据', content: '所有物品、房间、成员设置将被清除，且不可恢复。建议先导出备份。确定继续？', confirmColor: '#cd3d3d',
      success: function(res){
        if (!res.confirm) return;
        store.wipe(); that.onShow(); wx.showToast({ title: '已重置', icon: 'none' });
      }
    });
  }
});
function djb2(pin, salt){
  var input = salt + '|' + pin, h = 5381;
  for (var i = 0; i < input.length; i++){ h = ((h << 5) + h + input.charCodeAt(i)) | 0; }
  return 'djb2:' + (h >>> 0).toString(16);
}
