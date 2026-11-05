/* 归处 · 云函数 guichu-api
   部署后提供四类能力：
   1. getOpenid —— 微信账号绑定（openid 即云端账号主键）
   2. aiProxy   —— AI 识别服务端代理：Key 存云函数环境变量，客户端不再持有（防提取盗刷）
   3. syncPush  —— 数据上云（整包覆盖，openid 为主键）
   4. syncPull  —— 数据回拉（多设备/家人共享的基础） */
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function callLLM(messages, model){
  const key = process.env.AI_KEY;
  if (!key) return Promise.reject(new Error('云函数未配置 AI_KEY 环境变量'));
  const body = JSON.stringify({ model: model || 'glm-4v-flash', messages: messages });
  return new Promise(function(resolve, reject){
    const req = https.request({
      hostname: 'open.bigmodel.cn',
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'Content-Length': Buffer.byteLength(body) }
    }, function(res){
      let d = '';
      res.on('data', function(c){ d += c; });
      res.on('end', function(){ try{ resolve(JSON.parse(d)); }catch(e){ reject(new Error('LLM 返回解析失败')); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.main = async function(event){
  const { OPENID } = cloud.getWXContext();
  try{
    if (event.action === 'getOpenid'){
      return { ok: true, openid: OPENID };
    }
    if (event.action === 'aiProxy'){
      const data = await callLLM(event.messages, event.model);
      return { ok: true, data: data };
    }
    if (event.action === 'syncPush'){
      await db.collection('guichu_data').doc(OPENID).set({ data: { payload: event.payload, updatedAt: Date.now() } });
      return { ok: true, updatedAt: Date.now() };
    }
    if (event.action === 'syncPull'){
      const r = await db.collection('guichu_data').doc(OPENID).get().catch(function(){ return null; });
      return { ok: true, payload: (r && r.data) ? r.data.payload : null };
    }
    return { ok: false, error: '未知 action: ' + event.action };
  }catch(e){
    return { ok: false, error: e.message };
  }
};
