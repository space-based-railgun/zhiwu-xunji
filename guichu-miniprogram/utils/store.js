/* 知物寻迹 · 数据层（微信小程序版）
   结构数据存 wx 本地存储；照片存用户文件目录（saveFile 持久化）。
   纯 JS 数据模型与网页版保持一致，便于后续同步。 */
"use strict";

var IMP = {
  daily: { label: '高频', cls: 'c-blue' },
  vital: { label: '重要', cls: 'c-red' },
  normal: { label: '普通', cls: 'c-gray' },
  dormant: { label: '冬眠', cls: 'c-purple' }
};
var IMPRANK = { daily: 0, vital: 1, normal: 2, dormant: 3 };
var KINDLABEL = { checklist: '打卡视图', stock: '库存视图', archive: '档案视图', kids: '趣味视图' };
var OWNLBL = { private: ['私有', 'c-gray'], family: ['家庭共享', 'c-blue'], shared: ['公共', 'c-green'] };
  /* AI 识别默认配置：glm-4v-flash 免费模型；不内置 Key（防发布后被提取盗刷），新用户在设置里粘贴自己的免费 Key */
  var AI_DEFAULT = {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    key: '',
    model: 'glm-4v-flash'
  };
var EVENTKEY = [
  { keys: ['露营', '野营', '郊游'], tags: ['露营'] },
  { keys: ['出差', '飞行', '航班'], tags: ['出行', '充电'] },
  { keys: ['旅行', '旅游'], tags: ['出行', '证件', '充电'] },
  { keys: ['体检', '看病', '医院', '复诊'], tags: ['健康', '证件'] },
  { keys: ['上班', '通勤'], tags: ['卡片', '出门'] },
  { keys: ['健身', '运动', '球'], tags: ['运动'] },
  { keys: ['面试'], tags: ['证件', '学习'] }
];
var SYN = {
  '充电': ['充电宝', '充电线', '充电头'],
  '药': ['感冒灵', '创可贴', '体温计', '降压药', '藿香正气水', '家庭药箱'],
  '证件': ['护照', '身份证', '医保卡', '房产证', '保险保单', '学位证书', '病历本'],
  '露营': ['帐篷', '气罐', '头灯', '防潮垫'],
  '钥匙': ['钥匙', '备用钥匙'],
  '卡': ['门禁卡', '工牌', '身份证', '医保卡'],
  '冬': ['厚被子', '换季羽绒服', '暖水袋'],
  '伞': ['雨伞']
};

/* ---------- 拼音引擎（常用字读音表） ---------- */
var PYS = {
  a:'阿啊', ai:'爱矮隘', an:'按安岸暗鞍', ang:'昂肮', ao:'熬奥澳傲袄',
  ba:'八把爸吧罢霸坝', bai:'白百摆败拜柏', ban:'板办半班般搬伴拌', bang:'帮绑棒镑膀傍', bao:'包饱宝保报爆薄抱暴雹胞褒',
  bei:'杯北背被倍备悲卑辈贝', ben:'本奔笨', beng:'绷蹦', bi:'笔比币必闭避臂鼻彼碧蔽弊', bian:'边便变遍辩鞭编扁', biao:'表标', bie:'别憋', bin:'宾滨', bing:'冰兵并病柄饼', bo:'波拨伯玻菠勃脖博驳', bu:'不布步部补捕哺簿',
  ca:'擦', cai:'菜才财采踩彩猜', can:'餐残灿蚕惨', cang:'仓藏苍舱', cao:'草槽操糙', ce:'测册侧策', ceng:'层曾蹭', cha:'茶查差叉察茬', chai:'拆柴', chan:'产缠馋蝉', chang:'长场常厂唱肠尝偿敞', chao:'超朝炒抄巢潮', che:'车撤扯彻', chen:'沉陈尘晨衬称趁', cheng:'成城程称撑诚乘呈惩', chi:'吃尺齿翅持池迟痴耻赤炽', chong:'充冲虫崇宠', chou:'抽仇绸愁丑臭畴稠', chu:'出处厨橱础触除储楚畜雏', chuan:'船穿串传喘', chuang:'床窗创闯', chui:'吹锤垂炊', chun:'春纯唇蠢', ci:'瓷磁慈此次刺辞疵', cong:'从聪葱丛', cu:'粗醋促簇', cui:'催脆翠崔', cun:'村存寸', cuo:'错搓措挫',
  da:'大打达答搭', dai:'带袋戴待呆贷怠', dan:'单蛋但淡弹担耽胆', dang:'当档党挡荡', dao:'到道刀倒岛导稻悼盗', de:'得德的地', deng:'灯登等凳瞪', di:'低滴底地第弟递迪敌笛抵蒂缔', dian:'点电店垫殿碘颠巅掂', diao:'钓调掉雕刁吊', die:'跌爹碟蝶叠', ding:'丁钉顶定订盯叮', diu:'丢', dong:'冬东动栋冻洞懂董', dou:'斗豆逗兜陡都', du:'肚度渡独读毒堵赌杜镀', duan:'段断缎短锻端', dui:'堆对队兑', dun:'吨墩盾顿钝炖', duo:'多朵躲舵剁惰',
  e:'饿额鹅恶鄂', en:'恩', er:'而儿耳二贰尔',
  fa:'发罚阀法伐乏', fan:'反饭犯范翻帆烦繁返', fang:'方放房防仿纺妨芳坊', fei:'飞肥肺费废沸菲匪吠', fen:'分粉份奋愤粪纷芬坟', feng:'风封丰缝凤奉枫疯峰锋蜂逢', fo:'佛', fou:'否', fu:'父负夫肤敷扶服浮符幅福府腐付复妇附赴副傅赋缚俯斧',
  gai:'该改盖概钙', gan:'干甘杆感赶敢赣肝柑竿', gang:'钢缸岗刚港杠纲', gao:'高糕告稿膏羔', ge:'哥歌格隔各革阁葛割胳鸽', gei:'给', gen:'根跟', geng:'更耕梗', gong:'工公功攻共供龚弓宫恭', gou:'狗够沟构购钩勾', gu:'古估姑骨鼓故顾固辜谷菇雇', gua:'瓜刮挂呱褂', guai:'怪乖拐', guan:'关官管馆罐贯惯冠观', guang:'光广逛', gui:'归龟规鬼柜贵桂跪硅闺', gun:'滚棍', guo:'锅国果过裹郭',
  ha:'哈', hai:'还海孩害骸', han:'汉含寒喊汗韩焊翰涵', hang:'行航杭夯', hao:'好号毫豪耗浩', he:'喝合河何盒贺荷核赫鹤', hei:'黑嘿', hen:'很狠恨', heng:'横衡恒哼', hong:'红洪轰哄虹烘宏鸿', hou:'后候猴厚吼喉', hu:'湖糊户护互壶狐胡忽呼蝴乎虎唬沪', hua:'花滑话画化划华哗猾', huai:'怀坏淮徊', huan:'还环换缓幻唤患欢桓', huang:'黄荒慌晃谎煌凰', hui:'灰回会慧绘汇挥辉毁悔恢徽', hun:'婚混魂浑荤', huo:'火活货或惑获霍豁伙',
  ji:'几机鸡积基级极即急集记计既济继寄技季剂迹饥肌吉籍脊辑', jia:'家加价假架驾佳夹嘉甲钾', jian:'件间见建健剑剪简检减碱舰鉴键箭肩艰监兼煎捡拣茧践', jiang:'江将讲酱降姜浆僵疆匠桨奖', jiao:'交教角脚胶轿较叫焦骄椒搅缴郊酵觉', jie:'接街结姐界解介届节截竭洁捷劫诫', jin:'金进近斤尽仅紧锦晋浸禁津筋襟', jing:'经京精静境镜景警竞净敬晶惊睛茎荆', jiong:'窘', jiu:'就九旧酒救久舅揪', ju:'句局举据剧具巨聚拒距锯拘菊橘惧咀', juan:'卷圈绢倦眷捐', jue:'决绝觉掘爵嚼倔', jun:'军均菌俊骏竣',
  ka:'卡咖', kai:'开凯慨', kan:'看砍堪坎刊', kang:'抗炕康慷糠', kao:'考靠烤拷', ke:'可课刻克客科壳咳棵颗柯', ken:'肯恳垦', keng:'坑', kou:'口扣寇', ku:'苦库裤哭酷枯窟', kua:'垮跨夸', kuai:'快块筷', kuan:'宽款', kuang:'筐狂矿框况旷', kui:'亏盔葵愧馈窥', kun:'捆困昆坤', kuo:'阔扩括廓',
  la:'拉辣蜡腊喇', lai:'来莱赖', lan:'蓝篮栏懒烂滥拦兰澜', lang:'狼朗浪廊榔郎', lao:'老劳牢捞涝佬', le:'乐了勒肋', lei:'雷累泪类垒蕾擂', leng:'冷愣棱', li:'里理李力立利离梨犁礼丽历厉励例隶栗璃厘莉痢', lian:'连联脸练炼链廉帘莲怜', liang:'两亮量凉粮良粱辆晾', liao:'料聊疗辽僚缭', lie:'列烈裂猎劣', lin:'林邻淋临磷鳞赁霖琳', ling:'铃零灵领岭令龄凌玲陵', liu:'六刘流留榴瘤柳溜', long:'龙笼隆聋垄咙', lou:'楼漏陋篓', lu:'路露鹿录陆卢炉鲁卤虏庐芦', lv:'绿驴旅律铝滤缕履氯', luan:'乱卵', lue:'略掠', lun:'轮伦沦论抡', luo:'罗萝锣箩骡落洛络骆裸',
  ma:'妈马码麻吗骂抹', mai:'买卖迈麦脉', man:'慢满漫馒瞒蔓曼', mang:'忙盲茫莽芒', mao:'猫毛帽贸茅锚茂貌矛', me:'么', mei:'没每妹煤霉美玫枚梅眉媒魅', men:'门们闷', meng:'梦蒙猛盟萌孟', mi:'米迷眯蜜密秘觅弥', mian:'面棉眠免勉缅绵', miao:'苗秒庙描瞄藐', mie:'灭蔑', min:'民敏闽悯', ming:'名明鸣命铭茗', mo:'摸模膜磨末莫沫墨默摩魔寞', mou:'某谋', mu:'木目母亩幕墓慕暮牧穆募',
  na:'拿哪那娜呐', nai:'奶耐乃', nan:'南男难', nao:'脑闹挠', ne:'呢', nei:'内', nen:'嫩', neng:'能', ni:'你泥逆腻匿妮', nian:'年念黏捻碾', niang:'娘酿', niao:'鸟尿', nie:'捏镍聂', nin:'您', ning:'宁拧柠凝', niu:'牛扭纽钮', nong:'农浓弄', nu:'奴努怒', nv:'女', nuan:'暖', nuo:'挪诺糯',
  ou:'欧偶殴呕鸥藕',
  pa:'怕爬啪趴扒琶帕', pai:'拍排牌派徘湃', pan:'盘判攀盼畔叛磐', pang:'旁胖庞磅螃', pao:'跑炮泡抛袍刨', pei:'陪培佩配赔胚沛', pen:'盆喷', peng:'碰棚朋鹏捧烹蓬篷澎', pi:'皮批匹屁脾疲僻譬劈琵痞', pian:'片偏骗篇翩', piao:'票飘漂瓢', pie:'撇瞥', pin:'品拼贫频', ping:'平瓶评苹凭屏萍', po:'破婆坡迫魄泼粕', pu:'铺普扑朴菩谱瀑仆葡',
  qi:'七期气器汽骑棋旗其奇启妻砌岂企乞齐歧脐崎', qia:'恰掐洽', qian:'前钱千签迁浅遣欠歉钳谦乾纤', qiang:'枪墙强抢腔', qiao:'桥敲悄俏翘壳瞧', qie:'切且怯窃', qin:'亲琴勤芹侵寝秦擒禽', qing:'清请青轻氢倾情晴擎顷', qiong:'穷琼', qiu:'求球秋囚', qu:'去区曲取趣娶屈驱渠躯', quan:'全圈权劝券犬泉拳痊', que:'却缺雀确鹊', qun:'群裙',
  ran:'然染燃', rang:'让嚷瓤', rao:'绕扰饶', re:'热惹', ren:'人认任仁刃韧饪', reng:'扔仍', ri:'日', rong:'容绒融荣茸冗蓉', rou:'肉柔揉', ru:'如乳入儒褥辱', ruan:'软阮', rui:'锐瑞蕊', run:'润闰', ruo:'弱若',
  sa:'撒洒萨', sai:'塞腮', san:'三伞散叁', sang:'桑丧嗓', sao:'扫嫂臊', se:'色涩瑟', sen:'森', seng:'僧', sha:'沙纱杀傻煞刹杉', shai:'筛晒', shan:'山闪扇善衫珊煽', shang:'上商伤裳赏晌尚', shao:'少烧勺绍梢', she:'蛇社设舍射摄涉', shei:'谁', shen:'深身神沈审申肾甚渗慎伸', sheng:'生声升绳圣胜剩牲', shi:'十是时使师事市示诗湿狮失石识实食史驶始士世势试视匙适拾柿', shou:'手收受首瘦售守兽授', shu:'书数树熟属术输鼠束舒疏蔬暑署蜀薯曙竖述', shua:'刷耍', shuai:'甩率衰摔', shuan:'栓拴涮', shuang:'双霜爽', shui:'水谁睡税', shun:'顺瞬舜', shuo:'说硕烁朔',
  si:'四丝似死司私斯撕寺饲肆嘶', song:'送松颂诵宋', su:'素速宿塑诉酥俗苏肃', suan:'算酸蒜', sui:'随岁碎穗虽', sun:'孙损笋', suo:'所锁索缩琐',
  ta:'他她它塔踏塌', tai:'台太抬态泰汰', tan:'谈毯坛贪摊瘫炭叹探坦', tang:'汤糖堂躺趟烫塘', tao:'套掏涛逃桃淘陶讨萄', te:'特', teng:'疼藤腾', ti:'体提踢梯题替剃屉惕', tian:'天田甜填添舔', tiao:'条跳挑调', tie:'铁贴帖', ting:'听停厅庭挺亭艇', tong:'同通铜统桶筒痛童捅', tou:'头投透偷', tu:'图突途徒土吐兔涂屠凸', tuan:'团', tui:'推退腿褪蜕颓', tun:'吞屯臀', tuo:'脱拖托驼椭妥拓鸵',
  wa:'挖娃瓦袜蛙', wai:'外歪', wan:'完晚碗万湾丸玩挽腕婉', wang:'王往网忘望旺汪亡', wei:'为位未围微委维伟尾喂胃卫慰违帷惟', wen:'文温闻稳问蚊吻', weng:'翁嗡', wo:'我握窝涡卧蜗', wu:'五物无屋误午吴雾武舞污勿务悟伍乌钨毋',
  xi:'西希息席习洗系细戏喜吸稀溪锡袭隙膝夕析悉惜曦', xia:'下夏吓峡侠狭虾匣霞', xian:'先现线限县显险鲜献弦贤咸嫌掀纤仙羡', xiang:'想向象项相箱香乡响享详祥翔橡厢镶', xiao:'小笑消校削销晓孝效肖萧硝宵霄', xie:'写些鞋谢协斜泄械屑歇蝎携谐', xin:'新心信辛锌薪芯欣', xing:'行形性星姓幸醒兴刑杏腥猩', xiong:'兄凶胸雄熊', xiu:'修休秀绣锈袖朽嗅', xu:'需须许续绪序叙絮蓄徐虚吁', xuan:'选旋悬宣玄渲璇', xue:'学雪血靴穴削', xun:'训讯寻巡询逊迅熏循',
  ya:'压呀押雅牙芽鸭哑亚轧崖讶', yan:'眼烟沿盐言颜研严验演燕厌掩衍焰雁宴蜒', yang:'样阳洋扬羊养氧仰杨央殃秧痒烊', yao:'要药摇遥咬耀腰邀姚钥肴', ye:'也夜业叶页液爷野冶', yi:'一以已义易衣医意亦翼异仪宜艺忆疑移遗姨椅倚乙溢逸抑疫谊亿屹', yin:'因银引音印阴隐饮姻茵', ying:'应英影迎映营硬赢盈颖鹰婴樱', yo:'哟', yong:'用永勇涌佣庸踊泳', you:'有又右由油游友忧邮优犹幽诱悠幼釉佑', yu:'于与雨语玉鱼余预域育欲遇愈誉渔愉逾渝宇羽郁御裕芋俞喻', yuan:'元员园原远院源圆愿援缘袁渊怨苑', yue:'月越约阅悦跃乐粤', yun:'云运允晕韵孕匀',
  za:'杂砸扎', zai:'在再栽载灾宰', zan:'咱暂攒', zang:'脏葬', zao:'早造遭糟枣澡灶躁燥凿', ze:'则择责泽', zei:'贼', zen:'怎', zeng:'增曾赠', zha:'扎渣炸诈闸榨眨', zhai:'宅窄摘债寨', zhan:'展站战占粘盏斩崭瞻沾', zhang:'张章涨掌帐账障丈仗樟彰', zhao:'找照罩招兆', zhe:'这着折哲浙辙', zhen:'真针阵镇振珍诊枕侦斟贞', zheng:'正整政证争征郑挣睁蒸', zhi:'只之知支纸指直止志制治质至致值职植殖智枝汁芝址滞脂肢执侄', zhong:'中种重众钟忠终肿仲衷', zhou:'周州洲粥轴肘皱骤昼', zhu:'主住注猪竹烛煮逐著柱驻朱珠株蛛诸祝筑贮', zhua:'抓', zhuan:'转专赚砖撰', zhuang:'装壮状撞桩妆', zhui:'追坠锥赘', zhun:'准', zhuo:'桌捉浊琢啄灼茁',
  zi:'子自字资紫姿滋籽吱', zong:'总纵宗粽踪棕', zou:'走邹奏揍', zu:'组族祖足租阻卒', zuan:'钻', zui:'最嘴醉罪', zun:'尊遵', zuo:'作做坐座左昨佐琢'
};
var PYLOOKUP = (function(){
  var L = {};
  Object.keys(PYS).forEach(function(r){ PYS[r].split('').forEach(function(ch){ if (!L[ch]) L[ch] = r; }); });
  return L;
})();
function pyOf(s){
  var full = '', ini = '';
  s = String(s || '');
  for (var i = 0; i < s.length; i++){
    var ch = s[i];
    if (/[a-z0-9]/i.test(ch)){ full += ch.toLowerCase(); ini += ch.toLowerCase(); continue; }
    var r = PYLOOKUP[ch];
    if (r){ full += r; ini += r[0]; } else { full += '?'; ini += '?'; }
  }
  return { full: full, ini: ini };
}
function lev(a, b){
  if (a === b) return 0;
  var m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  var prev = [], cur = [];
  for (var j = 0; j <= n; j++) prev[j] = j;
  for (var i = 1; i <= m; i++){
    cur[0] = i;
    for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    var t = prev; prev = cur; cur = t;
  }
  return prev[n];
}

var KEY = 'guichu-db-v1';
var db = null;

function uid(p){ return (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
function today(){ var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function fmtDate(days){ var d = new Date(today().getTime() + days * 864e5); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }

function seed(){
  /* 全新安装：空白状态（无任何示例数据），由新手引导页 + 首页新手任务卡带用户建立自己的空间 */
  return {
    version: 1,
    activeScene: 'home',
    senior: false,
    lastCat: null,
    homeLoc: null,
    geofenceArmed: false,
    lock: null,
    ai: JSON.parse(JSON.stringify(AI_DEFAULT)),
    contEntry: false,
    contEntryMigrated: true,
    guide: { seen: false, tasks: {} },
    currentUserId: null,
    checklistDone: {},
    returned: {},
    shopping: {},
    members: [
      { id: uid('m'), name: '我', role: '管理员', emoji: '🙂', pin: null }
    ],
    ledger: [],
    zones: [],
    customReminders: [],
    events: [],
    scenes: [
      { id: 'home', name: '我的家', emoji: '🏠', rooms: [] }
    ]
  };
}

function load(){
  var raw = null;
  try{ raw = wx.getStorageSync(KEY); }catch(e){}
  if (!raw || raw.version !== 1){
    /* 主数据损坏或丢失时，回退到上一次滚动备份 */
    try{ raw = wx.getStorageSync(KEY + '-bak'); }catch(e){}
  }
  if (raw && raw.version === 1){
    db = raw;
      if (db.contEntry === undefined) db.contEntry = false;
      /* 一次性迁移：老版本默认开启的「连续录入」改为关闭（保存后返回列表更直观），需要批量录入可到设置重新打开 */
      if (!db.contEntryMigrated){
        db.contEntryMigrated = true;
        if (db.contEntry) db.contEntry = false;
      }
      if (db.ai === undefined) db.ai = JSON.parse(JSON.stringify(AI_DEFAULT));
      if (db.guide === undefined) db.guide = { seen: false, tasks: {} };
      if (db.currentUserId === undefined) db.currentUserId = null;
      if (!db.shopping) db.shopping = {};
      (db.members || []).forEach(function(m){
        if (m.emoji === undefined) m.emoji = '🙂';
        if (m.pin === undefined) m.pin = null;
      });
    return db;
  }
  db = seed();
  save();
  return db;
}
function save(){
  /* 滚动备份：每次保存前把上一份完整数据存到 -bak，写坏/误删可自动恢复 */
  try{
    var cur = wx.getStorageSync(KEY);
    if (cur && cur.version === 1) wx.setStorageSync(KEY + '-bak', cur);
  }catch(e){}
  try{ wx.setStorageSync(KEY, db); }
  catch(e){ wx.showToast({ title: '本地存储空间不足', icon: 'none' }); }
}
function wipe(){
  try{ wx.removeStorageSync(KEY); }catch(e){}
  db = seed();
  save();
}
/* 新手引导任务打点：room/cont/item/search 由各操作完成时调用 */
function markTask(k){
  if (!db.guide) db.guide = { seen: false, tasks: {} };
  db.guide.tasks[k] = true;
}
/* ---------- 本地成员账户 ---------- */
function memberIndex(id){
  for (var i = 0; i < db.members.length; i++) if (db.members[i].id === id) return i;
  return -1;
}
function currentMember(){
  var i = memberIndex(db.currentUserId);
  return i >= 0 ? db.members[i] : null;
}
function setCurrentUser(id){
  db.currentUserId = memberIndex(id) >= 0 ? id : null;
}
function memberName(id){
  var i = memberIndex(id);
  return i >= 0 ? db.members[i].name : '';
}
/* 未配置 Key 时，各 AI 入口统一弹免费开通引导 */
function aiGuideModal(){
  wx.showModal({
    title: '开启 AI 识别（免费）',
    content: '用的是智谱免费模型 glm-4v-flash，模型不收费，只需一个免费 Key：\n① 手机浏览器打开 open.bigmodel.cn，注册登录（免费）\n② 左侧「API 密钥」→ 创建并复制\n③ 到「设置 → AI 识别配置」粘贴保存（表单里可一键复制网址/读取剪贴板）。',
    confirmText: '去配置',
    cancelText: '稍后',
    success: function(r){ if (r.confirm) wx.navigateTo({ url: '/pages/form/form?type=ai' }); }
  });
}

/* ---------- 模型查询 ---------- */
function scene(id){
  id = id || db.activeScene;
  for (var i = 0; i < db.scenes.length; i++) if (db.scenes[i].id === id) return db.scenes[i];
  return db.scenes[0];
}
function rooms(){ return scene().rooms; }
function findRoom(id){ var rs = rooms(); for (var i = 0; i < rs.length; i++) if (rs[i].id === id) return rs[i]; return null; }
function findC(roomId, cid){ var r = findRoom(roomId); if (!r) return null; for (var i = 0; i < r.containers.length; i++) if (r.containers[i].id === cid) return r.containers[i]; return null; }
function findItem(iid){
  for (var s = 0; s < db.scenes.length; s++){ var rs = db.scenes[s].rooms;
    for (var i = 0; i < rs.length; i++){ var cs = rs[i].containers;
      for (var j = 0; j < cs.length; j++){ var its = cs[j].items;
        for (var k = 0; k < its.length; k++) if (its[k].id === iid) return { it: its[k], room: rs[i], c: cs[j], sc: db.scenes[s] };
      } } }
  return null;
}
function allItems(){
  var out = [];
  rooms().forEach(function(r){ r.containers.forEach(function(c){
    c.items.forEach(function(it){ out.push({ it: it, room: r, c: c }); });
  });});
  return out;
}
function isLow(it){ return !!(it.cons && typeof it.qty === 'number' && it.qty <= 2); }
function dueList(){
  return allItems().filter(function(x){ return x.it.expiry && x.it.expiry <= 90 && x.it.status !== 'discarded'; })
    .sort(function(a, b){ return a.it.expiry - b.it.expiry; });
}
function lentList(){
  return allItems().filter(function(x){ return x.it.lent && !db.returned[x.it.id]; });
}
function restockList(){
  return allItems().filter(function(x){ return isLow(x.it) && x.it.status !== 'discarded'; });
}
function reminderDue(r){
  var base = new Date(r.date + 'T00:00:00'); var t = today();
  var days = Math.round((base - t) / 864e5);
  if (days >= 0) return days;
  if (r.repeat === 'none') return null;
  var step = r.repeat === 'quarter' ? 91 : 365;
  while (days < 0) days += step;
  return days;
}
function customDueList(){
  var out = [];
  db.customReminders.forEach(function(r){
    var dd = reminderDue(r);
    if (dd != null && dd <= 30) out.push({ r: r, due: dd });
  });
  out.sort(function(a, b){ return a.due - b.due; });
  return out;
}
function remindCount(){ return dueList().length + lentList().length + customDueList().length + restockList().length; }
function eventChecklist(ev){
  var title = ev.title || '';
  var tags = [];
  EVENTKEY.forEach(function(rule){
    rule.keys.forEach(function(k){ if (title.indexOf(k) >= 0) rule.tags.forEach(function(t){ if (tags.indexOf(t) < 0) tags.push(t); }); });
  });
  var rows = [];
  allItems().forEach(function(x){
    if (x.it.status === 'discarded' || x.it.status === 'packed') return;
    var hit = (x.it.tags || []).some(function(t){ return tags.indexOf(t) >= 0; });
    if (hit) rows.push(x);
  });
  return rows.slice(0, 8);
}
function itemChips(it){
  var out = [];
  var imp = IMP[it.imp] || IMP.normal;
  out.push({ t: imp.label, cls: imp.cls });
  if (it.cons) out.push({ t: '消耗品', cls: 'c-green' });
  if (it.lent && !db.returned[it.id]) out.push({ t: '外借 · ' + it.lent.to, cls: 'c-orange' });
  if (isLow(it)) out.push({ t: '需补货', cls: 'c-orange' });
  if (it.owner && OWNLBL[it.owner]) out.push({ t: OWNLBL[it.owner][0], cls: OWNLBL[it.owner][1] });
  if (it.status === 'packed') out.push({ t: '📦 ' + (it.box || ''), cls: 'c-purple' });
  if (it.status === 'discarded') out.push({ t: '已丢弃', cls: 'c-gray' });
  return out;
}
/* ---------- 搜索（文本 / 拼音 / 模糊） ---------- */
function search(q){
  q = (q || '').trim();
  var clean = q.replace(/在哪|在哪里|哪里|呢|？|\?/g, '').trim();
  var terms = [], seen = {};
  [q, clean].forEach(function(t){ if (t && !seen[t]){ seen[t] = 1; terms.push(t); } });
  Object.keys(SYN).forEach(function(k){
    if ((q + clean).indexOf(k) >= 0) SYN[k].forEach(function(w){ if (!seen[w]){ seen[w] = 1; terms.push(w); } });
  });
  var zoneHit = null;
  db.zones.forEach(function(z){
    if (!zoneHit && (q + clean).indexOf(z.name.replace('区', '')) >= 0 && clean.length >= 1) zoneHit = z;
  });
  var results = [];
  allItems().forEach(function(x){
    var s = 0, why = '';
    terms.forEach(function(t){
      if (x.it.name.indexOf(t) >= 0){ s += 10; why = why || ('名称匹配「' + t + '」'); }
      (x.it.tags || []).forEach(function(tg){ if (tg.indexOf(t) >= 0){ s += 6; why = why || ('标签「' + tg + '」'); } });
      if (x.c.name.indexOf(t) >= 0){ s += 4; why = why || ('收纳点「' + x.c.name + '」'); }
      if (x.room.name.indexOf(t) >= 0){ s += 2; }
      if (x.it.note && x.it.note.indexOf(t) >= 0){ s += 5; why = why || '备注匹配'; }
      if (x.it.box && x.it.box.indexOf(t) >= 0){ s += 9; why = why || ('打包箱「' + x.it.box + '」'); }
      var tq = t.toLowerCase().replace(/\s+/g, '');
      if (/[a-z]/.test(tq) && tq.length >= 2){
        var namePy = pyOf(x.it.name);
        if (namePy.full.indexOf(tq) >= 0){ s += 7; why = why || '拼音匹配'; }
        else if (namePy.ini.indexOf(tq) >= 0){ s += 6; why = why || '拼音首字母'; }
        else {
          var tagPy = pyOf((x.it.tags || []).join(','));
          if (tagPy.full.indexOf(tq) >= 0){ s += 5; why = why || '标签拼音'; }
          else if (tagPy.ini.indexOf(tq) >= 0){ s += 4; why = why || '标签拼音'; }
        }
      } else if (s === 0 && t.length >= 2 && x.it.name.length >= 2){
        var d2 = lev(t, x.it.name);
        if (d2 <= (t.length >= 4 ? 2 : 1)){ s += 6; why = why || ('近似「' + x.it.name + '」'); }
      }
    });
    if (s > 0) results.push({ x: x, s: s, why: why });
  });
  results.sort(function(a, b){ return b.s - a.s; });
  return { zoneHit: zoneHit, results: results.slice(0, 12) };
}
/* ---------- 照片（压缩后存用户文件目录） ---------- */
function saveImage(tempPath, maxW, cb){
  wx.compressImage({
    src: tempPath,
    compressedWidth: maxW,
    quality: 70,
    success: function(r){
      wx.getFileSystemManager().saveFile({
        tempFilePath: r.tempFilePath,
        success: function(s){ cb(s.savedFilePath); },
        fail: function(){ cb(tempPath); }
      });
    },
    fail: function(){ cb(tempPath); }
  });
}
/* ---------- 导入 / 导出（含照片 base64） ---------- */
function buildBackup(cb){
  var obj = JSON.parse(JSON.stringify(db));
  var refs = [];
  db.scenes.forEach(function(s){ s.rooms.forEach(function(r){
    if (r.panoPath) refs.push(r.panoPath);
    r.containers.forEach(function(c){ c.items.forEach(function(it){ if (it.photoPath) refs.push(it.photoPath); }); });
  });});
  var imgs = {}, pending = refs.length, fsm = wx.getFileSystemManager();
  if (!pending) { obj.images = imgs; return cb(JSON.stringify(obj)); }
  refs.forEach(function(p){
    fsm.readFile({
      filePath: p, encoding: 'base64',
      success: function(r){ imgs[p] = r.data; },
      complete: function(){ if (--pending === 0){ obj.images = imgs; cb(JSON.stringify(obj)); } }
    });
  });
}
function importBackup(text){
  var obj = JSON.parse(text);
  if (!obj || obj.version !== 1 || !Array.isArray(obj.scenes)) throw new Error('格式不符');
  var imgs = obj.images || {};
  var fsm = wx.getFileSystemManager();
  var map = {}, n = 0;
  Object.keys(imgs).forEach(function(oldP){
    var np = wx.env.USER_DATA_PATH + '/guichu-img-' + (n++) + '.jpg';
    try{ fsm.writeFileSync(np, imgs[oldP], 'base64'); map[oldP] = np; }catch(e){}
  });
  delete obj.images;
  var str = JSON.stringify(obj);
  Object.keys(map).forEach(function(oldP){ str = str.split('"' + oldP + '"').join('"' + map[oldP] + '"'); });
  db = JSON.parse(str);
  save();
  return true;
}

/* 本地照片 → base64 数据 URL（AI 接口用：服务器无法访问手机本地文件路径） */
function readDataURL(path, cb){
  wx.getFileSystemManager().readFile({
    filePath: path, encoding: 'base64',
    success: function(r){ cb('data:image/jpeg;base64,' + r.data); },
    fail: function(){ cb(''); }
  });
}

/* ---------- 购物清单 ---------- */
function toggleBasket(id){
  if (!db.shopping) db.shopping = {};
  if (db.shopping[id]) delete db.shopping[id];
  else db.shopping[id] = true;
}
function basketList(){
  return allItems().filter(function(x){ return db.shopping && db.shopping[x.it.id]; });
}
function clearBasket(){ db.shopping = {}; }

module.exports = {
  IMP: IMP, IMPRANK: IMPRANK, KINDLABEL: KINDLABEL, OWNLBL: OWNLBL, SYN: SYN,
  get db(){ return db; },
  load: load, save: save, wipe: wipe, markTask: markTask,
  currentMember: currentMember, setCurrentUser: setCurrentUser, memberName: memberName,
  aiGuideModal: aiGuideModal,
  uid: uid, today: today, fmtDate: fmtDate,
  scene: scene, rooms: rooms, findRoom: findRoom, findC: findC, findItem: findItem,
  allItems: allItems, isLow: isLow, dueList: dueList, lentList: lentList, restockList: restockList,
  reminderDue: reminderDue, customDueList: customDueList, remindCount: remindCount,
  eventChecklist: eventChecklist, itemChips: itemChips, search: search,
  saveImage: saveImage, readDataURL: readDataURL, buildBackup: buildBackup, importBackup: importBackup,
  toggleBasket: toggleBasket, basketList: basketList, clearBasket: clearBasket,
  pyOf: pyOf, lev: lev
};
