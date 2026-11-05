/* 归处 · 空间记忆管家 —— 数据层：种子数据 / 本地持久化 / 模型工具 */
"use strict";

var Store = (function(){

  var KEY = 'guichu-db-v1';
  var IMP = {
    daily:  { label:'高频', cls:'c-blue' },
    vital:  { label:'重要', cls:'c-red' },
    normal: { label:'普通', cls:'c-gray' },
    dormant:{ label:'冬眠', cls:'c-purple' }
  };
  var IMPRANK = { daily:0, vital:1, normal:2, dormant:3 };
  var KINDLABEL = { checklist:'打卡视图', stock:'库存视图', archive:'档案视图', kids:'趣味视图' };
  var OWNLBL = { private:['私有','c-gray'], family:['家庭共享','c-blue'], shared:['公共','c-green'] };
  /* AI 识别默认配置：glm-4v-flash 免费模型；不内置 Key（防公开后被盗用），用户在设置中粘贴自己的免费 Key */
  var AI_DEFAULT = {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    key: '',
    model: 'glm-4v-flash'
  };
  /* 语义标签联想：日程/备忘关键词 → 物品标签（离线规则引擎） */
  var EVENTKEY = [
    { keys:['露营','野营','郊游'], tags:['露营'] },
    { keys:['出差','飞行','航班'], tags:['出行','充电'] },
    { keys:['旅行','旅游'],        tags:['出行','证件','充电'] },
    { keys:['体检','看病','医院','复诊'], tags:['健康','证件'] },
    { keys:['上班','通勤'],        tags:['卡片','出门'] },
    { keys:['健身','运动','球'],   tags:['运动'] },
    { keys:['面试'],               tags:['证件','学习'] }
  ];
  var SYN = {
    '充电':['充电宝','充电线','充电头'],
    '药':  ['感冒灵','创可贴','体温计','降压药','藿香正气水','家庭药箱'],
    '证件':['护照','身份证','医保卡','房产证','保险保单','学位证书','病历本'],
    '露营':['帐篷','气罐','头灯','防潮垫'],
    '钥匙':['钥匙','备用钥匙'],
    '卡':  ['门禁卡','工牌','身份证','医保卡'],
    '冬':  ['厚被子','换季羽绒服','暖水袋'],
    '伞':  ['雨伞']
  };

  /* ---------- 拼音引擎（内置常用字读音表，覆盖日常物品词汇；零依赖离线） ---------- */
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
    Object.keys(PYS).forEach(function(r){ PYS[r].split('').forEach(function(ch){ if(!L[ch]) L[ch] = r; }); });
    return L;
  })();
  function pyOf(s){
    var full = '', ini = '';
    s = String(s || '');
    for(var i = 0; i < s.length; i++){
      var ch = s[i];
      if(/[a-z0-9]/i.test(ch)){ full += ch.toLowerCase(); ini += ch.toLowerCase(); continue; }
      var r = PYLOOKUP[ch];
      if(r){ full += r; ini += r[0]; }
      else { full += '?'; ini += '?'; }
    }
    return { full: full, ini: ini };
  }
  function lev(a, b){
    if(a === b) return 0;
    var m = a.length, n = b.length;
    if(!m || !n) return Math.max(m, n);
    var prev = [], cur = [];
    for(var j = 0; j <= n; j++) prev[j] = j;
    for(var i = 1; i <= m; i++){
      cur[0] = i;
      for(j = 1; j <= n; j++){
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }

  function uid(p){ return (p||'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function today(){ var d = new Date(); d.setHours(0,0,0,0); return d; }
  function fmtDate(days){ var d = new Date(today().getTime() + days*864e5); return (d.getMonth()+1) + '月' + d.getDate() + '日'; }

  /* ---------- 种子数据 ---------- */
  function seed(){
    var now = Date.now();
    function d(days){ return new Date(now + days*864e5).toISOString().slice(0,10); }
    return {
      version: 1,
      activeScene: 'home',
      senior: false,
      lastCat: null,
      homeLoc: null,
      geofenceArmed: false,
      lock: null,
      ai: JSON.parse(JSON.stringify(AI_DEFAULT)),
      contEntry: true,
      checklistDone: {},
      returned: {},
      members: [
        { id: uid('m'), name:'我', role:'管理员' },
        { id: uid('m'), name:'妈妈', role:'成员' },
        { id: uid('m'), name:'室友小王', role:'成员' }
      ],
      ledger: [
        { id: uid('l'), text:'游戏手柄 → 妈妈', date: d(-6), returned:true },
        { id: uid('l'), text:'螺丝刀套装 → 邻居张叔', date: d(-20), returned:true }
      ],
      zones: [
        { id:'z-med',    name:'家庭医疗区', emoji:'💊', containerKeys:['living.c-med','bedroom.c-stand'] },
        { id:'z-camp',   name:'露营装备区', emoji:'⛺', containerKeys:['study.c-camp'] },
        { id:'z-season', name:'换季冬眠区', emoji:'🧥', containerKeys:['bedroom.c-ward','bedroom.c-bedbox'] },
        { id:'z-cert',   name:'重要证件区', emoji:'🔒', containerKeys:['study.c-desk','study.c-archive'] }
      ],
      customReminders: [
        { id: uid('r'), title:'家庭药箱季度盘点', date: d(16), repeat:'quarter', room:'living', c:'c-med' },
        { id: uid('r'), title:'取出厚被子晾晒', date: d(16), repeat:'none', room:'bedroom', c:'c-ward' }
      ],
      events: [
        { id: uid('e'), emoji:'⛺', title:'郊野露营', date: d(1) },
        { id: uid('e'), emoji:'✈️', title:'出差上海', date: d(3) },
        { id: uid('e'), emoji:'🏥', title:'体检', date: d(0) }
      ],
      scenes: [
        { id:'home', name:'我的家', emoji:'🏠', rooms:[
          { id:'entry', name:'玄关', hue:28, containers:[
            { id:'c-shoe', name:'鞋柜', kind:'default', yaw:55, row:.68, emoji:'👟', items:[
              { id:'i-access', name:'门禁卡', imp:'daily', tags:['卡片','出门'], note:'门禁 + 公交卡二合一', owner:'private' },
              { id:'i-brush', name:'鞋刷', imp:'normal', tags:['清洁'] },
              { id:'i-shoes', name:'换季运动鞋', imp:'dormant', tags:['鞋类'], note:'入秋后再拿出来' }]},
            { id:'c-hook', name:'出门挂钩区', kind:'checklist', yaw:185, row:.42, emoji:'🔑', items:[
              { id:'i-key', name:'钥匙', imp:'daily', tags:['出门'] },
              { id:'i-badge', name:'工牌', imp:'daily', tags:['卡片','出门'] },
              { id:'i-umbrella', name:'雨伞', imp:'daily', tags:['出门'] }]},
            { id:'c-stock1', name:'囤货收纳箱', kind:'stock', yaw:305, row:.68, emoji:'📦', items:[
              { id:'i-tissue', name:'抽纸', imp:'normal', cons:true, qty:8, unit:'包' },
              { id:'i-wash', name:'洗手液', imp:'normal', cons:true, qty:2, unit:'瓶' }]}
          ]},
          { id:'living', name:'客厅', hue:170, containers:[
            { id:'c-tv', name:'电视柜', kind:'default', yaw:40, row:.60, emoji:'📺', items:[
              { id:'i-remote', name:'遥控器', imp:'daily', tags:['影音'], owner:'family' },
              { id:'i-pad', name:'游戏手柄', imp:'normal', tags:['影音'] },
              { id:'i-cablebox', name:'数据线盒', imp:'normal', tags:['电子'] }]},
            { id:'c-med', name:'家庭药箱', kind:'stock', yaw:150, row:.56, emoji:'💊', items:[
              { id:'i-cold', name:'感冒灵', imp:'normal', cons:true, qty:1, unit:'盒', expiry:20, note:'一次一袋，温水冲服', owner:'family' },
              { id:'i-bandaid', name:'创可贴', imp:'normal', cons:true, qty:12, unit:'片' },
              { id:'i-thermo', name:'体温计', imp:'vital', tags:['健康'] },
              { id:'i-huoxiang', name:'藿香正气水', imp:'normal', cons:true, qty:3, unit:'盒', expiry:60 }]},
            { id:'c-charge', name:'充电抽屉', kind:'default', yaw:255, row:.68, emoji:'🔋', items:[
              { id:'i-powerbank', name:'充电宝', imp:'daily', tags:['电子','充电'], lent:{ to:'同事小王', due:d(6) }, owner:'family' },
              { id:'i-cable', name:'充电线', imp:'daily', tags:['电子','充电'] },
              { id:'i-plug', name:'充电头', imp:'normal', tags:['电子','充电'] }]}
          ]},
          { id:'study', name:'书房', hue:215, containers:[
            { id:'c-desk', name:'书桌·左抽屉', kind:'default', yaw:65, row:.68, emoji:'🗂️', items:[
              { id:'i-passport', name:'护照', imp:'vital', tags:['证件','出行'] },
              { id:'i-idcard', name:'身份证', imp:'vital', tags:['证件'] },
              { id:'i-medicard', name:'医保卡', imp:'vital', tags:['证件','健康'] },
              { id:'i-sparekey', name:'备用钥匙', imp:'vital', tags:['钥匙'] },
              { id:'i-record', name:'病历本', imp:'vital', tags:['证件','健康'] }]},
            { id:'c-archive', name:'档案盒', kind:'archive', yaw:165, row:.66, emoji:'🗄️', items:[
              { id:'i-house', name:'房产证', imp:'vital', secret:true },
              { id:'i-ins', name:'保险保单', imp:'vital', secret:true },
              { id:'i-degree', name:'学位证书', imp:'vital', secret:true }]},
            { id:'c-camp', name:'露营装备箱', kind:'default', yaw:275, row:.68, emoji:'⛺', items:[
              { id:'i-tent', name:'帐篷', imp:'dormant', tags:['露营'] },
              { id:'i-gas', name:'气罐', imp:'dormant', tags:['露营'], note:'远离高温' },
              { id:'i-lamp', name:'头灯', imp:'normal', tags:['露营'] },
              { id:'i-mat', name:'防潮垫', imp:'dormant', tags:['露营'] }]},
            { id:'c-book', name:'书架·第二层', kind:'default', yaw:335, row:.56, emoji:'📚', items:[
              { id:'i-kaoyan', name:'考研资料', imp:'normal', tags:['学习'] },
              { id:'i-journal', name:'手账本', imp:'normal', tags:['学习'] }]}
          ]},
          { id:'bedroom', name:'主卧', hue:345, containers:[
            { id:'c-stand', name:'床头柜', kind:'stock', yaw:90, row:.68, emoji:'💊', items:[
              { id:'i-bpyao', name:'降压药', imp:'vital', cons:true, qty:1, unit:'盒', expiry:3, note:'每日1次 · 不可断服' },
              { id:'i-eye', name:'眼药水', imp:'normal', cons:true, qty:1, unit:'瓶', expiry:210 },
              { id:'i-balm', name:'润唇膏', imp:'normal', tags:['洗护'] }]},
            { id:'c-ward', name:'衣柜·顶层', kind:'default', yaw:200, row:.48, emoji:'🧥', items:[
              { id:'i-quilt', name:'厚被子', imp:'dormant', tags:['换季'], note:'冬眠中 · 到期取出晾晒' },
              { id:'i-down', name:'换季羽绒服', imp:'dormant', tags:['换季'] }]},
            { id:'c-bedbox', name:'床底储物箱', kind:'default', yaw:315, row:.68, emoji:'🧳', items:[
              { id:'i-case', name:'行李箱', imp:'dormant', tags:['出行'], owner:'private' },
              { id:'i-bag', name:'暖水袋', imp:'dormant', tags:['换季'] }]}
          ]},
          { id:'kids', name:'儿童房', hue:48, containers:[
            { id:'c-toy', name:'玩具收纳箱', kind:'kids', yaw:70, row:.68, emoji:'🧸', items:[
              { id:'i-blocks', name:'积木桶', imp:'daily', tags:['玩具'], emoji:'🧱' },
              { id:'i-car', name:'玩具车', imp:'daily', tags:['玩具'], emoji:'🚗' },
              { id:'i-puzzle', name:'拼图', imp:'normal', tags:['玩具'], emoji:'🧩' }]},
            { id:'c-pbook', name:'绘本架', kind:'kids', yaw:190, row:.56, emoji:'📖', items:[
              { id:'i-pbooks', name:'绘本一摞', imp:'normal', tags:['学习'], emoji:'📚' },
              { id:'i-crayon', name:'蜡笔盒', imp:'normal', cons:true, qty:1, unit:'盒', emoji:'🖍️' }]}
          ]},
          { id:'kitchen', name:'厨房', hue:130, containers:[
            { id:'c-cond', name:'调料架', kind:'stock', yaw:55, row:.48, emoji:'🧂', items:[
              { id:'i-sauce', name:'生抽', imp:'normal', cons:true, qty:1, unit:'瓶', expiry:90 },
              { id:'i-sugar', name:'白糖', imp:'normal', cons:true, qty:5, unit:'袋' },
              { id:'i-oyster', name:'蚝油', imp:'normal', cons:true, qty:1, unit:'瓶', expiry:30 }]},
            { id:'c-rice', name:'米面柜', kind:'stock', yaw:165, row:.56, emoji:'🌾', items:[
              { id:'i-rice', name:'大米', imp:'normal', cons:true, qty:2, unit:'kg' },
              { id:'i-noodle', name:'挂面', imp:'normal', cons:true, qty:3, unit:'包' }]},
            { id:'c-fridge', name:'冰箱·门格', kind:'stock', yaw:285, row:.52, emoji:'🧊', items:[
              { id:'i-yogurt', name:'酸奶', imp:'normal', cons:true, qty:2, unit:'排', expiry:1 },
              { id:'i-egg', name:'鸡蛋', imp:'normal', cons:true, qty:6, unit:'枚' }]}
          ]}
        ]},
        { id:'office', name:'办公室', emoji:'💼', rooms:[
          { id:'office-desk', name:'办公室·工位', hue:262, containers:[
            { id:'c-drawer-o', name:'工位抽屉', kind:'default', yaw:80, row:.68, emoji:'🗄️', items:[
              { id:'i-kb', name:'备用键盘', imp:'normal', tags:['办公'], owner:'shared' },
              { id:'i-ocable', name:'办公充电线', imp:'daily', tags:['电子','充电'] },
              { id:'i-obadge', name:'门禁卡(办公)', imp:'daily', tags:['卡片'], owner:'private' }]},
            { id:'c-snack', name:'零食柜', kind:'stock', yaw:200, row:.56, emoji:'🍪', items:[
              { id:'i-coffee', name:'挂耳咖啡', imp:'normal', cons:true, qty:6, unit:'袋' },
              { id:'i-biscuit', name:'苏打饼干', imp:'normal', cons:true, qty:2, unit:'盒' }]}
          ]}
        ]},
        { id:'parents', name:'父母家', emoji:'🏡', rooms:[] }
      ]
    };
  }

  /* ---------- IndexedDB 图片仓 ----------
     结构数据存 localStorage（小而快），照片/全景存 IndexedDB（容量以百 MB 计）。
     imgCache 是全量内存镜像：上传时同步写入，启动时预加载，渲染层永远同步取值。 */
  var imgCache = {};
  var IDB = (function(){
    var conn = null;
    function open(){
      return new Promise(function(res){
        if(conn) return res(conn);
        try{
          var req = indexedDB.open('guichu-images', 1);
          req.onupgradeneeded = function(e){ try{ e.target.result.createObjectStore('imgs'); }catch(err){} };
          req.onsuccess = function(e){ conn = e.target.result; res(conn); };
          req.onerror = function(){ res(null); };
        }catch(e){ res(null); }
      });
    }
    function put(id, data){
      return open().then(function(db2){
        if(!db2) return false;
        return new Promise(function(res){
          var tx = db2.transaction('imgs', 'readwrite');
          tx.objectStore('imgs').put(data, id);
          tx.oncomplete = function(){ res(true); };
          tx.onerror = function(){ res(false); };
        });
      });
    }
    function get(id){
      return open().then(function(db2){
        if(!db2) return null;
        return new Promise(function(res){
          var rq = db2.transaction('imgs', 'readonly').objectStore('imgs').get(id);
          rq.onsuccess = function(){ res(rq.result || null); };
          rq.onerror = function(){ res(null); };
        });
      });
    }
    function del(id){
      return open().then(function(db2){
        if(!db2) return false;
        return new Promise(function(res){
          var tx = db2.transaction('imgs', 'readwrite');
          tx.objectStore('imgs').delete(id);
          tx.oncomplete = function(){ res(true); };
          tx.onerror = function(){ res(false); };
        });
      });
    }
    function keys(){
      return open().then(function(db2){
        if(!db2) return [];
        return new Promise(function(res){
          var rq = db2.transaction('imgs', 'readonly').objectStore('imgs').getAllKeys();
          rq.onsuccess = function(){ res(rq.result || []); };
          rq.onerror = function(){ res([]); };
        });
      });
    }
    function clear(){
      return open().then(function(db2){
        if(!db2) return false;
        return new Promise(function(res){
          var tx = db2.transaction('imgs', 'readwrite');
          tx.objectStore('imgs').clear();
          tx.oncomplete = function(){ res(true); };
          tx.onerror = function(){ res(false); };
        });
      });
    }
    return { put:put, get:get, del:del, keys:keys, clear:clear };
  })();

  /* 写入一张图（同步生成 id 并进缓存，IndexedDB 异步落盘），返回图片 id */
  function putImg(data){
    if(typeof data !== 'string' || data.indexOf('data:image') !== 0) return null;
    var id = uid('img');
    imgCache[id] = data;
    IDB.put(id, data);
    return id;
  }
  function imgSrc(id){ return (id && imgCache[id]) || ''; }
  function imageRefs(){
    var ids = [];
    db.scenes.forEach(function(s){ s.rooms.forEach(function(r){
      if(r.panoId) ids.push(r.panoId);
      r.containers.forEach(function(c){
        if(c.photoId) ids.push(c.photoId);
        c.items.forEach(function(it){ if(it.photoId) ids.push(it.photoId); });
      });
    });});
    return ids;
  }
  /* 启动预加载：把本库引用的全部图片拉进内存缓存 */
  function preloadImages(cb){
    var ids = imageRefs();
    if(!ids.length) return cb && cb();
    var pending = ids.length;
    var done = function(){ pending--; if(pending <= 0 && cb) cb(); };
    ids.forEach(function(id){
      if(imgCache[id]) return done();
      IDB.get(id).then(function(v){ if(v) imgCache[id] = v; done(); });
    });
  }
  /* 回收孤儿图片：删除所有不再被数据引用的图片 */
  function gcImages(){
    var refs = imageRefs();
    IDB.keys().then(function(keys){
      keys.forEach(function(k){ if(refs.indexOf(k) < 0) IDB.del(k); });
    });
  }
  /* 旧版数据迁移：把内联在结构数据里的 dataURL 挪进 IndexedDB，并统一改名到 *Id 字段 */
  function migrateInline(){
    var moved = false;
    function conv(o, k){
      if(!o) return;
      var v = o[k];
      if(typeof v === 'string' && v.indexOf('data:image') === 0){
        var id = putImg(v);
        if(id){ o[k + 'Id'] = id; delete o[k]; moved = true; }
      } else if(typeof v === 'string' && /^img-/.test(v)){
        /* 修复早期迁移版本写回旧字段名的情况 */
        o[k + 'Id'] = v; delete o[k]; moved = true;
      }
    }
    db.scenes.forEach(function(s){ s.rooms.forEach(function(r){
      conv(r, 'pano');
      r.containers.forEach(function(c){
        conv(c, 'photo');
        c.items.forEach(function(it){ conv(it, 'photo'); });
      });
    });});
    return moved;
  }

  /* ---------- 持久化 ---------- */
  var db = null;
  var saveTimer = 0;

  function load(){
    try{
      var raw = localStorage.getItem(KEY);
      if(raw){ db = JSON.parse(raw); if(db && db.version === 1){
        if(db.contEntry === undefined) db.contEntry = true;
        if(db.ai === undefined) db.ai = JSON.parse(JSON.stringify(AI_DEFAULT));
        migrateInline(); return db;
      } }
    }catch(e){}
    db = seed();
    persist();
    return db;
  }
  function persist(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){
      try{ localStorage.setItem(KEY, JSON.stringify(db)); }
      catch(e){ if(window.App && App.toast) App.toast('⚠️ 本地存储空间不足：请减少照片或导出备份后清理', 'warn'); }
      gcImages();
    }, 150);
  }
  function persistNow(){
    clearTimeout(saveTimer);
    try{ localStorage.setItem(KEY, JSON.stringify(db)); }
    catch(e){ if(window.App && App.toast) App.toast('⚠️ 本地存储空间不足：请减少照片或导出备份后清理', 'warn'); }
  }
  function wipe(){
    try{ localStorage.removeItem(KEY); }catch(e){}
    imgCache = {};
    IDB.clear();
    db = seed();
    persist();
  }

  /* ---------- 模型查询 ---------- */
  function scene(id){ id = id || db.activeScene; for(var i=0;i<db.scenes.length;i++) if(db.scenes[i].id===id) return db.scenes[i]; return db.scenes[0]; }
  function rooms(){ return scene().rooms; }
  function findRoom(id){ var rs = rooms(); for(var i=0;i<rs.length;i++) if(rs[i].id===id) return rs[i]; return null; }
  function findRoomGlobal(id){
    for(var s=0;s<db.scenes.length;s++){ var rs = db.scenes[s].rooms;
      for(var i=0;i<rs.length;i++) if(rs[i].id===id) return { room:rs[i], sc:db.scenes[s] };
    } return null;
  }
  function findC(roomId, cid){ var r = findRoom(roomId); if(!r) return null; for(var i=0;i<r.containers.length;i++) if(r.containers[i].id===cid) return r.containers[i]; return null; }
  function findItem(iid){
    for(var s=0;s<db.scenes.length;s++){ var rs = db.scenes[s].rooms;
      for(var i=0;i<rs.length;i++){ var cs = rs[i].containers;
        for(var j=0;j<cs.length;j++){ var its = cs[j].items;
          for(var k=0;k<its.length;k++) if(its[k].id===iid) return { it:its[k], room:rs[i], c:cs[j], sc:db.scenes[s] };
        } } }
    return null;
  }
  function allItems(){
    var out = [];
    rooms().forEach(function(r){ r.containers.forEach(function(c){
      c.items.forEach(function(it){ out.push({ it:it, room:r, c:c }); });
    });});
    return out;
  }
  function isLow(it){ return !!(it.cons && typeof it.qty === 'number' && it.qty <= 2); }
  function dueList(){
    return allItems().filter(function(x){ return x.it.expiry && x.it.expiry <= 90 && x.it.status !== 'discarded'; })
      .sort(function(a,b){ return a.it.expiry - b.it.expiry; });
  }
  function lentList(){
    return allItems().filter(function(x){ return x.it.lent && !db.returned[x.it.id]; });
  }
  function restockList(){
    return allItems().filter(function(x){ return isLow(x.it) && x.it.status !== 'discarded'; });
  }
  /* 自定义提醒：计算下一次到期剩余天数（支持 none/quarter/year） */
  function reminderDue(r){
    var base = new Date(r.date + 'T00:00:00'); var t = today();
    var days = Math.round((base - t) / 864e5);
    if(days >= 0) return days;
    if(r.repeat === 'none') return null;
    var step = r.repeat === 'quarter' ? 91 : 365;
    while(days < 0) days += step;
    return days;
  }
  function customDueList(){
    var out = [];
    db.customReminders.forEach(function(r){
      var dd = reminderDue(r);
      if(dd != null && dd <= 30) out.push({ r:r, due:dd });
    });
    out.sort(function(a,b){ return a.due - b.due; });
    return out;
  }
  /* 日程 → 标签联想备物清单（离线规则） */
  function eventChecklist(ev){
    var title = ev.title || '';
    var tags = [];
    EVENTKEY.forEach(function(rule){
      rule.keys.forEach(function(k){ if(title.indexOf(k) >= 0) rule.tags.forEach(function(t){ if(tags.indexOf(t) < 0) tags.push(t); }); });
    });
    var rows = [];
    allItems().forEach(function(x){
      if(x.it.status === 'discarded' || x.it.status === 'packed') return;
      var hit = (x.it.tags || []).some(function(t){ return tags.indexOf(t) >= 0; });
      if(hit) rows.push(x);
    });
    return rows.slice(0, 8);
  }
  function remindCount(){
    return dueList().length + lentList().length + customDueList().length + restockList().length;
  }

  /* ---------- 工具 ---------- */
  function fileToDataURL(file, maxW, cb){
    var fr = new FileReader();
    fr.onload = function(){
      var img = new Image();
      img.onload = function(){
        var w = img.width, h = img.height;
        var scale = Math.min(1, maxW / w);
        var cv = document.createElement('canvas');
        cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        cb(cv.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = function(){ cb(null); };
      img.src = fr.result;
    };
    fr.onerror = function(){ cb(null); };
    fr.readAsDataURL(file);
  }
  function downloadText(name, text, mime){
    try{
      var b = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
      return true;
    }catch(e){ return false; }
  }
  function buildExport(kind){
    var rows = [];
    db.scenes.forEach(function(s){ s.rooms.forEach(function(r){ r.containers.forEach(function(c){
      c.items.forEach(function(it){
        var st = it.status === 'packed' ? ('打包中·' + (it.box || '')) : (it.status === 'discarded' ? '已丢弃' : (it.lent && !db.returned[it.id] ? '外借·' + it.lent.to : '正常'));
        if(kind === 'csv'){
          rows.push([it.name, s.name, r.name, c.name, (IMP[it.imp]||IMP.normal).label, st,
            it.qty != null ? String(it.qty) : '', it.unit || '', it.expiry != null ? String(it.expiry) : '',
            (it.tags || []).join('/'), it.note || ''].map(function(v){ return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','));
        } else {
          rows.push({ scene:s.name, room:r.name, container:c.name, name:it.name,
            importance:(IMP[it.imp]||IMP.normal).label, status:st, qty:it.qty, unit:it.unit,
            expiryInDays:it.expiry, tags:it.tags || [], note:it.note || '', owner:it.owner || '' });
        }
      });
    });});});
    if(kind === 'csv') return '\ufeff名称,场景,房间,容器,重要级,状态,数量,单位,效期(天),标签,备注\n' + rows.join('\n');
    return JSON.stringify({ app:'归处·空间记忆管家', exportedAt:new Date().toISOString(), items:rows }, null, 1);
  }
  function buildBackup(){
    var obj = JSON.parse(JSON.stringify(db));
    var imgs = {};
    imageRefs().forEach(function(id){ if(imgCache[id]) imgs[id] = imgCache[id]; });
    obj.images = imgs;
    return JSON.stringify(obj);
  }
  function importBackup(text){
    var obj = JSON.parse(text);
    if(!obj || obj.version !== 1 || !Array.isArray(obj.scenes)) throw new Error('格式不符');
    var imgs = obj.images || {};
    Object.keys(imgs).forEach(function(id){ imgCache[id] = imgs[id]; IDB.put(id, imgs[id]); });
    delete obj.images;
    db = obj;
    migrateInline();
    persistNow();
    gcImages();
    return true;
  }

  return {
    IMP:IMP, IMPRANK:IMPRANK, KINDLABEL:KINDLABEL, OWNLBL:OWNLBL, SYN:SYN,
    get db(){ return db; },
    load:load, persist:persist, persistNow:persistNow, wipe:wipe,
    uid:uid, esc:esc, today:today, fmtDate:fmtDate,
    scene:scene, rooms:rooms, findRoom:findRoom, findRoomGlobal:findRoomGlobal,
    findC:findC, findItem:findItem, allItems:allItems,
    isLow:isLow, dueList:dueList, lentList:lentList, restockList:restockList,
    reminderDue:reminderDue, customDueList:customDueList, eventChecklist:eventChecklist,
    remindCount:remindCount,
    fileToDataURL:fileToDataURL, downloadText:downloadText,
    buildExport:buildExport, buildBackup:buildBackup, importBackup:importBackup,
    putImg:putImg, imgSrc:imgSrc, preloadImages:preloadImages, gcImages:gcImages, migrateInline:migrateInline,
    pyOf:pyOf, lev:lev
  };
})();
