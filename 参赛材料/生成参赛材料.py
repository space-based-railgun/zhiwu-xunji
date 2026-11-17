# -*- coding: utf-8 -*-
"""知物寻迹 · 参赛材料生成器：交互流程图.pdf / 操作说明.pdf / 封面图.png"""
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

HERE = os.path.dirname(os.path.abspath(__file__))
BRAND = HexColor('#2e6bf0')
BRAND_DARK = HexColor('#1e4fd8')
INK = HexColor('#191d24')
GRAY = HexColor('#616a79')
NODE_FILL = HexColor('#EFF6FF')
BAND_BG = HexColor('#F7F9FC')
ARROW = HexColor('#5a6b85')

for name, path, idx in [('MSYH', 'C:/Windows/Fonts/msyh.ttc', 0), ('MSYH-B', 'C:/Windows/Fonts/msyhbd.ttc', 0)]:
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont(name, path, subfontIndex=idx))
    else:
        pdfmetrics.registerFont(TTFont(name, 'C:/Windows/Fonts/simhei.ttf'))
F, FB = 'MSYH', 'MSYH-B'

# ---------------- 1. 交互流程图（A4 横版） ----------------
def flowchart():
    W, H = landscape(A4)
    c = rl_canvas.Canvas(os.path.join(HERE, '交互流程图.pdf'), pagesize=(W, H))
    c.setTitle('知物寻迹 · 交互流程图'); c.setAuthor('知物寻迹')

    c.setFont(FB, 16); c.setFillColor(INK)
    c.drawString(40, H - 34, '知物寻迹 · 核心交互流程')
    c.setFont(F, 9); c.setFillColor(GRAY)
    c.drawRightString(W - 40, H - 34, '微信小程序 · 移动端 · 数据仅存本机')

    bands = [
        ('① 建家与录入 —— 拍照即可建档，无全景也能用', 536, [
            ['首次启动', '新手引导 · 任务卡'],
            ['创建房间', '客厅 / 卧室 / 储物间'],
            ['AI 拍房间照', '建议收纳点 · 勾选创建'],
            ['AI 拍柜内照', '识别物品 · 勾选入库'],
        ], [False, False, True, True]),
        ('② 查找与定位 —— 3 秒查到东西在哪', 436, [
            ['打开首页', '空间与提醒一目了然'],
            ['搜索', '名称 / 拼音 / 口语说法'],
            ['结果直达收纳点', '全景圆点定位'],
            ['拿到实物', '3 秒查到位'],
        ], [False, False, False, False]),
        ('③ 时间层提醒 —— 到期、外借，主动不遗忘', 336, [
            ['登记效期 / 外借', '药品 · 食品 · 借出'],
            ['到期 · 应还提醒', '打开即见 · 醒目排序'],
            ['一键处理', '顺延 7 天 / 确认归还'],
            ['状态闭环', '不再错过、不再遗忘'],
        ], [False, False, False, False]),
    ]
    NW, NH, GAP = 150, 52, 40
    XS = [76, 266, 456, 646]
    cys = []
    for bi, (label, bg_top, nodes, ais) in enumerate(bands):
        bg_y0 = bg_top - 84
        c.setFillColor(BAND_BG)
        c.roundRect(56, bg_y0, 740, 84, 10, fill=1, stroke=0)
        c.setFont(FB, 10.5); c.setFillColor(BRAND)
        c.drawString(68, bg_top - 16, label)
        ny = bg_top - 30 - NH
        cy = ny + NH / 2
        cys.append(cy)
        for ni, lines in enumerate(nodes):
            x0 = XS[ni]
            c.setFillColor(NODE_FILL); c.setStrokeColor(BRAND); c.setLineWidth(1.1)
            c.roundRect(x0, ny, NW, NH, 7, fill=1, stroke=1)
            if ais[ni]:
                c.setFillColor(BRAND)
                c.roundRect(x0 + NW - 30, ny + NH - 15, 24, 12, 6, fill=1, stroke=0)
                c.setFillColor(HexColor('#ffffff')); c.setFont(FB, 7)
                c.drawCentredString(x0 + NW - 18, ny + NH - 12.5, 'AI')
            c.setFillColor(INK)
            c.setFont(FB, 9.5)
            c.drawCentredString(x0 + NW / 2, ny + NH / 2 + 4, lines[0])
            c.setFont(F, 8); c.setFillColor(GRAY)
            c.drawCentredString(x0 + NW / 2, ny + NH / 2 - 9, lines[1])
            if ni < 3:
                c.setStrokeColor(ARROW); c.setLineWidth(1.1)
                c.line(x0 + NW + 2, cy, x0 + NW + GAP - 6, cy)
                c.setFillColor(ARROW)
                p = c.beginPath()
                ax = x0 + NW + GAP - 6
                p.moveTo(ax, cy - 3.5); p.lineTo(ax + 6, cy); p.lineTo(ax, cy + 3.5); p.close()
                c.drawPath(p, fill=1, stroke=0)
        # 换行连接（本带末节点 → 下一带首节点）在全部带渲染后统一绘制
    # 换行连线画在带与带的间隙里
    for bi in range(2):
        cy_from = cys[bi]; cy_to = cys[bi + 1]
        gap_y = [452, 352][bi] - 8  # 带底部之下 8pt 的间隙
        x_out = 796 + 12; x_in = 48
        c.setStrokeColor(ARROW); c.setLineWidth(1.1)
        c.line(XS[3] + NW, cy_from, x_out, cy_from)
        c.line(x_out, cy_from, x_out, gap_y)
        c.line(x_out, gap_y, x_in, gap_y)
        c.line(x_in, gap_y, x_in, cy_to)
        c.line(x_in, cy_to, XS[0] - 6, cy_to)
        c.setFillColor(ARROW)
        p = c.beginPath()
        ax = XS[0] - 6
        p.moveTo(ax, cy_to - 3.5); p.lineTo(ax + 6, cy_to); p.lineTo(ax, cy_to + 3.5); p.close()
        c.drawPath(p, fill=1, stroke=0)

    c.setFont(F, 8.5); c.setFillColor(GRAY)
    c.drawString(56, 132, '图例：箭头 = 主操作路径；[AI] = 智谱 glm-4v-flash 免费模型识别；手动添加路径同样完整支持。')
    c.drawString(56, 114, '设计要点：录入后自动返回列表（所见即所得）；名称必填防呆；保存失败必有明确提示；数据全程仅存本机。')
    c.drawString(56, 96, '适配设备：移动端（微信小程序，iOS / Android）。')
    c.showPage(); c.save()
    print('OK 交互流程图.pdf')

# ---------------- 2. 操作说明（A4 竖版） ----------------
def manual():
    path = os.path.join(HERE, '操作说明.pdf')
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=46, rightMargin=46, topMargin=52, bottomMargin=52,
                            title='知物寻迹 · 操作说明', author='知物寻迹')
    h1 = ParagraphStyle('h1', fontName=FB, fontSize=17, leading=24, textColor=INK, spaceAfter=4)
    sub = ParagraphStyle('sub', fontName=F, fontSize=9.5, leading=14, textColor=GRAY, spaceAfter=10)
    h2 = ParagraphStyle('h2', fontName=FB, fontSize=12.5, leading=18, textColor=BRAND_DARK, spaceBefore=14, spaceAfter=6)
    body = ParagraphStyle('body', fontName=F, fontSize=10.5, leading=17, textColor=INK, wordWrap='CJK')
    step = ParagraphStyle('step', fontName=F, fontSize=10.5, leading=17, textColor=INK, wordWrap='CJK', leftIndent=18, spaceAfter=5)

    story = []
    story.append(Paragraph('知物寻迹 · 操作说明', h1))
    story.append(Paragraph('微信小程序 · 适配移动端（iOS / Android）· 数据仅存本机', sub))

    story.append(Paragraph('一、产品简介', h2))
    story.append(Paragraph('知物寻迹帮助家庭把物品位置「记在手机里」：按住址 → 房间 → 收纳点 → 物品四级建立空间档案，'
                           '支持拍照建档、拼音搜索、到期提醒与外借记录。目标只有一句话——找不到东西的时候，3 秒查到它在哪。', body))

    story.append(Paragraph('二、快速上手（四步）', h2))
    story.append(Paragraph('1. 创建房间：首页「＋ 房间」，填名称即可（如客厅、卧室）。', step))
    story.append(Paragraph('2. 建收纳点：进入房间点「🤖 拍照认收纳点」，拍一张房间照片，AI 建议里面的柜子/抽屉，勾选后批量创建；也可手动添加。', step))
    story.append(Paragraph('3. 录入物品：进入收纳点点「🤖 拍照认物品」，拍一张柜内照片，AI 列出看到的物品，勾选确认后一键入库；同样支持手动录入。', step))
    story.append(Paragraph('4. 日常查找：首页搜索框输入名称、拼音（如 yaoshi）或口语说法（如「充电的东西」），点结果直达物品所在收纳点。', step))

    story.append(Paragraph('三、常用功能', h2))
    story.append(Paragraph('① 提醒中心：药品/食品到期、外借归还、库存补货统一管理，可一键「顺延 7 天」「确认归还」。', step))
    story.append(Paragraph('② 全景定位：房间页「四面拍摄拼全景」站在房间中央每转 90° 拍一张自动拼图；「调整圆点位置」把收纳点摆到图上对应位置。', step))
    story.append(Paragraph('③ 成员账户：右上角头像切换「谁在用」，可设 4 位 PIN；录入的物品自动记录录入人。', step))
    story.append(Paragraph('④ 搬家打包：首页「搬家打包」整柜装箱，搬完逐箱开箱，位置历史自动记录。', step))

    story.append(Paragraph('四、AI 拍照功能配置（免费，约 30 秒）', h2))
    story.append(Paragraph('1. 手机浏览器打开 open.bigmodel.cn，注册登录（免费）；', step))
    story.append(Paragraph('2. 左侧「API 密钥」→ 创建并复制；', step))
    story.append(Paragraph('3. 小程序「设置 → AI 识别配置」粘贴保存。模型 glm-4v-flash 免费，识别不收费。', step))
    story.append(Paragraph('注：真机测试时若 AI 连不上，点小程序右上角「···」→ 开发调试 → 打开调试即可；正式版已配置合法域名，无此问题。', body))

    story.append(Paragraph('五、数据与备份', h2))
    story.append(Paragraph('所有数据仅存手机本地，不上传服务器。应用每次保存自动生成滚动备份防损坏；建议每月到「设置 → 导出完整备份」把备份文件发给微信「文件传输助手」存档（含照片）。', body))

    def footer(cv, doc):
        cv.saveState(); cv.setFont(F, 8); cv.setFillColor(GRAY)
        cv.drawCentredString(A4[0] / 2, 30, '知物寻迹 · 操作说明 · 移动端（微信小程序）')
        cv.restoreState()
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print('OK 操作说明.pdf')

# ---------------- 3. 封面图 480x270 ----------------
def cover():
    W, H = 960, 540
    c = rl_canvas.Canvas(os.path.join(HERE, '_cover_tmp.pdf'), pagesize=(W, H))
    try:
        c.linearGradient(0, H, W, 0, (HexColor('#3d7bff'), HexColor('#1e4fd8')), extend=True)
    except Exception:
        c.setFillColor(BRAND); c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(BRAND_DARK); c.rect(0, 0, W, H * 0.35, fill=1, stroke=0)
    c.setFillColor(Color(1, 1, 1, 0.14))
    c.circle(W - 90, H - 70, 130, fill=1, stroke=0)
    c.setStrokeColor(Color(1, 1, 1, 0.35)); c.setLineWidth(1)
    c.roundRect(36, 36, W - 72, H - 72, 14, fill=0, stroke=1)
    c.setFont(FB, 20); c.setFillColor(Color(1, 1, 1, 0.72))
    c.drawString(72, H - 96, '空间记忆管家 · 微信小程序')
    c.setFont(FB, 92); c.setFillColor(HexColor('#ffffff'))
    c.drawCentredString(W / 2, H / 2 - 18, '知物寻迹')
    c.setFont(F, 25); c.setFillColor(Color(1, 1, 1, 0.92))
    c.drawCentredString(W / 2, H / 2 - 82, '找不到东西的时候，3 秒查到它在哪')
    c.setFont(F, 15); c.setFillColor(Color(1, 1, 1, 0.62))
    c.drawCentredString(W / 2, 66, 'AI 拍照建档 · 拼音搜索 · 到期提醒 · 搬家打包')
    c.showPage(); c.save()
    import pymupdf
    doc = pymupdf.open(os.path.join(HERE, '_cover_tmp.pdf'))
    rect = doc[0].rect
    pix = doc[0].get_pixmap(matrix=pymupdf.Matrix(480 / rect.width, 270 / rect.height))
    pix.save(os.path.join(HERE, '封面图.png'))
    doc.close(); os.remove(os.path.join(HERE, '_cover_tmp.pdf'))
    print('OK 封面图.png (480x270)')

flowchart()
manual()
cover()
