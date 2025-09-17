#!name=广告拦截合集-重写
#!desc=(R)针对部分APP和小程序广告进行拦截，某些APP要清除缓存或者重新安装拦截广告才会生效！
#!author=奶思
#!homepage=https://github.com/fmz200/wool_scripts
#!icon=https://raw.githubusercontent.com/fmz200/wool_scripts/main/icons/gif/naisi-01.gif
#!raw-url=https://github.com/fmz200/wool_scripts/raw/main/QuantumultX/rewrite/chongxie.txt
#!tg-group=https://t.me/lanjieguanggao
#!category=奶思的模块
#!tag = 去广告, 奶思
#!system = iOS, iPadOS
#!system_version = 
#!loon_version = 
#!date=2025-05-23 22:00:00
#!support=支持约511款APP/小程序
#!remark=下方的所有规则都标注了对应的hostname，可能存在错误或者遗漏，欢迎反馈。对于无法/可选MITM的hostname都特别做了“如开启可自行添加主机名”提示，如果提示后面没有标注主机名则包含所有主机名，否则只包含提示语后面的主机名。
#############################################
# "reject"        策略返回 HTTP 状态码 404,不附带任何额外内容
# "reject-200"    策略返回 HTTP 状态码 200,不附带任何额外内容
# "reject-img"    策略返回 HTTP 状态码 200,同时附带 1px gif
# "reject-dict"   策略返回 HTTP 状态码 200,同时附带一个空的 JSON 对象
# "reject-array"  策略返回 HTTP 状态码 200,同时附带一个空的 JSON 数组
#############################################
# 常见问题：
# 1️⃣：我知道规则，不知道主机名怎么办？
# ✅：几乎所有的主机名都是从规则中提取出来的，先有的规则再有的主机名
# 举个栗子：12306的一条规则URL👉🏻^https?:\/\/ad\.12306\.cn\/ad\/ser\/getAdList
# 只需要去掉反斜杠：^https?://ad.12306.cn/ad/ser/getAdList
# 不用再说了吧，ad.12306.cn就是想要的主机名
# 2️⃣：有些常用的软件为什么没有去广告配置？
# ✅：如果要利用重写去广告，就需要对请求或响应信息进行解密(MITM)，现在一些软件已经禁止了MITM，所以就无法去广告。
#############################################


# >>>>>>>>>>>>>>> ✅ # ✅ <<<<<<<<<<<<<<
# > 闲鱼 匹配请求头需要在同一个URL之前匹配到
# 拦截广告下发
^http:\/\/amdc\.m\.taobao\.com\/amdc\/mobileDispatch %E9%97%B2%E9%B1%BC* url-and-header reject

# > 爱思助手
# hostname = list-app-m.i4.cn
^https?:\/\/list-app-m\.i4\.cn\/(adclickcb|getHotSearchList|getopfstadinfo)\.xhtml url reject
  
# > 安吉星
# hostname = www.onstar.com.cn, api.shanghaionstar.com
# 开屏广告
^https?:\/\/www\.onstar\.com\.cn\/mssos\/sos\/social\/v1\/community\/article\/page url reject-dict
^https?:\/\/api\.shanghaionstar\.com\/sos\/contentinfo\/v1\/public\/landingpage url reject-dict

# > 币安
# hostname = www.binance.info, www.yingwangtech.net, www.binance.com
# 开屏广告
^https?:\/\/www\.(binance|yingwangtech)\.(com|info|net)\/bapi\/composite\/v1\/public\/market\/holiday-atmosphere url reject-dict

# > 菜鸟裹裹
# hostname = cn-acs.m.cainiao.com, amdc.m.taobao.com
# 其他
^https?:\/\/amdc\.m\.taobao\.com\/amdc\/mobileDispatch$ url script-response-header https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/header.js
# 首页 好物推荐,商品推广,底部标签页,快递详情页,问卷调查,主页图标
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.adkeyword\.get\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.cncommunity\.my\.station\.query\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.guoguo\.nbnetflow\.ads\.(batch\.show\.v2|index)\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.guoguo\.nbnetflow\.ads\.m?show\.cn url script-response-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cainiao/cainiao.js
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.nbopen\.miniapp\.recommend\.cpc\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.nbmensa\.research\.researchservice\.(acquire|event|close)\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.nbpresentation\.(homepage\.merge|tabbar\.marketing)\.get\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.cainiao\.nbpresentation\.(pickup\.empty\.page|protocol\.homepage)\.get\.cn url script-response-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cainiao/cainiao.js
# 消息中心
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.nbfriend\.message\.conversation\.list\.cn url script-response-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cainiao/cainiao.js
# 发现页 数字角标 裹裹券
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.com\.cainiao\.cnactivitycenter url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.com\.cainiao\.cncreditmarket\.hit\.getactivityhit\.cn url reject-dict
^https?:\/\/cn-acs\.m\.cainiao\.com\/gw\/mtop\.com\.cainiao\.longquan\.place\.getpageresourcecontent\.cn url reject-dict

# > 财联社
# hostname = api3.cls.cn
^https?:\/\/api3\.cls\.cn\/v1\/boot\/ad url reject

# > 大师兄
# hostname = sdk.alibaba.com.ailbaba.me, adservice.sigmob.cn
^https?:\/\/sdk\.alibaba\.com\.ailbaba\.me\/xgapp\.php\/v\d\/version url reject-200
^https?:\/\/sdk\.alibaba\.com\.ailbaba\.me\/xgapp\.php\/v\d\/advert\?position=[^2]+ url reject-200
^https?:\/\/sdk\.alibaba\.com\.ailbaba\.me\/xgapp\.php\/v\d\/top_notice\? url reject-200
^https?:\/\/sdk\.alibaba\.com\.ailbaba\.me\/(dsx|xgapp)\.php\/v\d\/(top_notice\?|version|advert\?position=[^2]+) url reject-200
^https?:\/\/adservice\.sigmob\.cn\/extconfig url response-body false response-body true

# > 达达骑士版
# hostname = delivery-api.imdada.cn
# 开屏广告，弹窗广告，首页置顶轮播广告 感谢【T大G】分享
^https?:\/\/delivery-api\.imdada\.cn\/v2_0\/dada\/promote\/imax\?privacyParam url reject-dict
^https?:\/\/delivery-api\.imdada\.cn\/v1_0\/transporter\/screen\/ads_list url reject-dict
^https?:\/\/delivery-api\.imdada\.cn\/v1_0\/transporter\/ad url reject-dict

# > 斗鱼直播
# hostname = daoyu.sdo.com, rtbapi.douyucdn.cn, staticlive.douyucdn.cn, capi.douyucdn.cn, douyucdn.cn
^https?:\/\/daoyu\.sdo\.com\/api\/userCommon\/getAppStartAd url reject
^https?:\/\/rtbapi\.douyucdn\.cn\/japi\/sign\/app\/getinfo url reject-dict
^https?:\/\/staticlive\.douyucdn\.cn\/upload\/signs\/ url reject
^https?:\/\/staticlive\.douyucdn\.cn\/.+\/getStartSend url reject
^https?:\/\/staticlive\.douyucdn\.cn\/.+?\/getStartSend url reject-img
^https?:\/\/capi\.douyucdn\.cn\/lapi\/sign\/app(api)?\/getinfo\?client_sys=ios url reject
^https?:\/\/capi\.douyucdn\.cn\/api\/ios_app\/check_update url reject-img
^https?:\/\/capi\.douyucdn\.cn\/api\/v1\/getStartSend?client_sys=ios url reject-img
^https?:\/\/douyucdn\.cn\/.+\/appapi\/getinfo url reject
^https?:\/\/douyucdn\.cn\/.+?\/appapi\/getinfo url reject-img

# > 叮咚买菜
# hostname = maicai.api.ddxq.mobi, gw.api.ddxq.mobi, user.api.ddxq.mobi
# 开屏广告
^https?:\/\/maicai\.api\.ddxq\.mobi\/advert\/ url reject
# 首页弹窗
^https?:\/\/maicai\.api\.ddxq\.mobi\/homeApi\/getHomeAdPop url reject
# VIP开通弹窗
^https?:\/\/maicai\.api\.ddxq\.mobi\/vip\/getVipAd url reject-dict
# 首页悬浮窗
^https?:\/\/maicai\.api\.ddxq\.mobi\/homeApi\/newDetails url response-body suspension response-body random_body
# 首页推荐流优化,AI栏去除,右下角浮标
^https?:\/\/maicai\.api\.ddxq\.mobi\/homeApi\/(?>bottomNavi|homeFlowDetail) url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/ddxq.js
# 右下角AI
^https?:\/\/maicai\.api\.ddxq\.mobi\/tool\/getConfig url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/ddxq.js
# 我的页VIP栏净化
^https?:\/\/gw\.api\.ddxq\.mobi\/vip-app-service\/vip\/my\/page\/advertising url reject
# 我的页弹窗(暂未启用)
^https:\/\/maicai\.api\.ddxq\.mobi\/homeApi\/queryMyPagePopup url reject-dict
# 我的页-猜你喜欢
^https?:\/\/maicai\.api\.ddxq\.mobi\/homeApi\/userLike url reject-dict
# 我的页净化
^https?:\/\/user\.api\.ddxq\.mobi\/userportal-service\/api\/v\d\/user\/queryMyPage url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/ddxq.js
# 购物车顶部VIP横条
^https?:\/\/maicai\.api\.ddxq\.mobi\/cart\/vipGuide url reject-dict
# 购物车-猜你喜欢
^https?:\/\/maicai\.api\.ddxq\.mobi\/order\/getRecommend url reject-dict

# > 钉钉
# hostname = gw.alicdn.com, img.alicdn.com
# 误杀少 解决阿里系的开屏 目前测试咸鱼/钉钉 感谢【zzzzzz】分享
^https?:\/\/(gw|img)\.alicdn\.com\/imgextra\/.+\/[\w!]+\d+-\d+-.+-\b([8-9]\d{2,}|[1-9]\d{3,})\b-\b([5-9]\d{2,}|[1-9]\d{3,})\b url reject-dict


# > 得物
# hostname = app.dewu.com, cdn.poizon.com
# 开屏广告 【Runestoner】分享
^https?:\/\/app\.dewu\.com\/api\/v1\/app\/advertisement url reject
^https?:\/\/cdn\.poizon\.com\/node-common\/.*.jpg url reject-200

# > 饿了么
# hostname = elemecdn.com, fuss10.elemecdn.com, cube.elemecdn.com, www1.elecfans.com, nr-op.elemecdn.com
# 开屏广告
^https?:\/\/elemecdn\.com\/.+\/sitemap url reject
^https?:\/\/fuss10\.elemecdn\.com\/.+\/w\/640\/h\/\d{3,4} url reject
^https?:\/\/fuss10\.elemecdn\.com\/.+\/w\/750\/h\/\d{3,4} url reject
^https?:\/\/fuss10\.elemecdn\.com\/.+?\.mp4 url reject-img
^https?:\/\/cube\.elemecdn\.com\/[\w\/]+\.jpeg\?x-oss-process=image\/resize,m_fill,w_1\d{3},h_2\d{3}\/format,webp\/ url reject
^https?:\/\/cube\.elemecdn\.com\/[\w\/]+\.jpeg\?x-oss-process=image\/resize,m_fill,w_6\d{2},h_8\d{2}\/format,webp\/ url reject
^https?:\/\/cube\.elemecdn\.com\/[\w\/]+\.jpeg\?x-oss-process=image\/resize,m_fill,w_\d{3},h_\d{4}\/format,webp\/ url reject
^https?:\/\/cube\.elemecdn\.com\/\w\/\w{2}\/\w+mp4\.mp4\? url reject
^https?:\/\/www1\.elecfans\.com\/www\/delivery\/ url reject
^https?:\/\/(nr-op|cube)\.elemecdn\.com\/.+\.jpeg\?x-oss-process=image\/resize,m_fill,w_\d{4,},h_\d{4,}\/($|format,webp\/$) url reject

# > EMS微信小程序
# hostname = ec.ems.com.cn, ump.ems.com.cn
^https?:\/\/ec\.ems\.com\.cn\/mailAd$ url reject
^https?:\/\/ec\.ems\.com\.cn\/ecr-exp-web\/advert url reject
^https?:\/\/ec\.ems\.com\.cn\/ecr-qry-web\/redis\/pageInfoByChannel url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/wechatApplet.js
^https?:\/\/ump\.ems\.com\.cn\/mailAd$ url reject
^https?:\/\/ump\.ems\.com\.cn\/new-generation-extend\/redis\/pageInfoByChannel url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/wechatApplet.js

# > 富途牛牛
# hostname = api*.futunn.com
# 我的横幅广告
^https?:\/\/api\.futunn\.com\/v2\/optimus\/my-homepage-config url reject-dict
# 账户和交易横幅广告
^https?:\/\/api\.futunn\.com\/v2\/config\/promote-config url reject-dict
^https?:\/\/api\d\.futunn\.com\/ad\/ url reject
^https?:\/\/api\.futunn\.com\/v\d\/ad\/ url reject
# 首页右下角角标
^https?:\/\/api\.futunn\.com\/treasure-chest\/box-data url reject

# > 工商银行
# hostname = v.icbc.com.cn
# 如开启可自行添加主机名
^https?:\/\/v\.icbc\.com\.cn\/userfiles\/Resources\/WAP\/advertisement\/ url reject-200

# > 工银E生活
# hostname = pv.elife.icbc.com.cn
^https?:\/\/pv\.elife\.icbc\.com\.cn\/OFSTPV\/utm\.gif url reject-200

# > 工银e生活小程序
# hostname = elife.icbc.com.cn
# 如开启可自行添加主机名
^https?:\/\/elife\.icbc\.com\.cn\/OFSTNEWBASE\/floorinfo\/getMantlePages\.do url reject-200

# > 国泰君安
# hostname = dl.app.gtja.com, dl*.app.gtja.com
^https?:\/\/dl\.app\.gtja\.com\/dzswem\/kvController url reject-200
#^https?:\/\/dl[0-9]{1}\.app\.gtja\.com\/dzswem\/kvController url reject-200


# > 虎牙直播
# hostname = cdn.wup.huya.com, business.msstatic.com, cdnfile1.msstatic.com, live-ads.huya.com
^https?:\/\/cdn\.wup\.huya\.com\/launch\/queryHttpDns$ url reject
^https?:\/\/business\.msstatic\.com\/advertiser\/material url reject
^https?:\/\/cdnfile1\.msstatic\.com\/cdnfile\/appad\/ url reject-img
^https?://live-ads\.huya\.com/live/getAllEntrance.*$ url reject-dict

# > 航旅纵横
# hostname = home.umetrip.com, discardrp.umetrip.com, startup.umetrip.com
^http?:\/\/(discardrp|startup)\.umetrip\.com\/gateway\/api\/umetrip\/native url reject
^http?:\/\/(114\.115\.217\.129)|(home\.umetrip\.com)\/gateway\/api\/umetrip\/native$ url script-response-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/umetrip/umetrip_ads.js

# > 盒马
# hostname = acs.m.taobao.com, acs-m.freshippo.com
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.hippotown\.tabbar\.info url reject
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.sg\.querysinglescene url reject-dict
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.render\.querysinglepage url reject-200
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.fc\.recommend\.feedscommondservice url reject-dict
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.crm\.platform\.ma\.recommend url reject-dict
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.mimir\.recommend\.after\.purchase\.activity url reject-dict
^https?:\/\/acs(\.|-)m\.(taobao|freshippo)\.com\/gw\/mtop\.wdk\.render\.query(?>indexpage|mypage|tabfeedstream) url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/freshippo.js

# > 建行生活
# hostname = yunbusiness.ccb.com, g.alicdn.com, waimai-guide.ele.me
# 全面广告净化
^https?:\/\/yunbusiness\.ccb\.com\/(?>basic_service|clp_service)\/txCtrl\?txcode=A3341(?>SB16|C147|MB22|A009|A120|AB03|AB04|A068|A095|AB08) url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/ccblife.js
# 内置饿了么
^https?:\/\/g\.alicdn\.com\/.*o2o-ad url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/alicdn.js
^https?:\/\/waimai-guide\.ele\.me\/\w+\/mtop\.alsc\.eleme\.\w+\.trigger\.respond url reject-dict
^https?:\/\/waimai-guide\.ele\.me\/\w+\/mtop\.alsc\.wamai\.store\.detail\.miniapp\.popup url reject
^https?:\/\/waimai-guide\.ele\.me\/\w+\/mtop\.venus\.shopcouponpopupservice\.getshopcouponspopup url reject
^https?:\/\/waimai-guide\.ele\.me\/\w+\/mtop\.venus\.shopresourceservice\.getshopresource url response-body posterList response-body random_body

# > 快手联盟,优量汇,穿山甲「广告联盟」
# hostname = api-access.pangolin-sdk-toutiao.com, mi.gdt.qq.com, open.e.kuaishou.com
^https:\/\/(api-access\.pangolin-sdk-toutiao\.com\/api\/ad\/union\/sdk\/get_ads|open\.e\.kuaishou\.com\/rest\/e\/v3\/open\/univ$|mi\.gdt\.qq\.com\/gdt_mview\.fcg\?) url script-response-body https://raw.githubusercontent.com/app2smile/rules/master/js/adsense.js

# > 拦截100
# hostname = tagit.hyhuo.com
^https?:\/\/tagit\.hyhuo\.com\/recover\/list url reject

# > 美团 & 美团外卖
# hostname = img.meituan.net, s3plus.meituan.net, flowplus.meituan.net
^https?:\/\/wmapi\.meituan\.com\/api\/v7\/(loadInfo|openscreen|startpicture)\? url reject-dict
^https?:\/\/(s3plus|flowplus)\.meituan\.net\/v\d\/\w+\/linglong\/\w+\.(gif|jpg|mp4) url reject-dict
^https?:\/\/img\.meituan\.net\/bizad\/bizad_brandCpt_\d+\.jpg url reject-dict
^https?:\/\/s3plus\.meituan\.net\/ocean-blk-index\/index\/blk_conf_73\.json url reject-dict
^https?:\/\/s3plus\.meituan\.net\/v1\/mss_\w+\/(brandcpt-vedio|waimai-alita)\/\w+\.zip$ url reject-dict
# 美团订单详情页更多推荐
^https?:\/\/apimobile\.meituan\.com\/group\/v1\/recommend\/unity\/recommends url reject-dict

# > 美团众包
# hostname = peisongapi.meituan.com
^https?:\/\/peisongapi\.meituan\.com\/client\/getInitiateImage url reject-200

# > 农业银行
# hostname = midc.cdn-static.abchina.com.cn, enjoy.cdn-static.abchina.com
# ^https?:\/\/midc\.cdn-static\.abchina\.com\.cn\/distributecenterimg\/file\/download\/(?!bbc2|f015|1655|0992|4678|a194|d8e2|c513|e51c|0ee1|166e|05ca|c882|d5b8|22ed|a0dc|a55a|6f89|3bf9|3c71|52ec|5b62|ve7a|001c|923d|accf|4a10|0bd7|be7a|5b62|5dd6|1f24|006c|775d|bd02|b983|5251|806b|d119|db14|43c9|41d3|8570|2c10|85ea|1435|814e|f422|aec7|738c|d7c8|0538|02b4|fd20|7647|f6ef|07c5|885b|e4cb|685b|30aa|c23b|9603|f27f|eaf8|8011|a5eb|409d|724c|3f2a|e07f|6744|60a6|158c|8ce3) url reject-dict
^https?:\/\/midc\.cdn-static\.abchina\.com\.cn\/distributecenterimg\/file\/download\/(ed64|74b5) url reject
^https?:\/\/enjoy\.cdn-static\.abchina\.com\/yx-engine-web\/file\/download\/(?!7dc2|fe96|cea3|06a8|1b11|d57b|6918|61db|2d58|aa23|) url reject-200
^https?:\/\/firefly\.abchina\.com\.cn\/firefly-collection\/Collect url reject-200

# > 前程无忧 51Job
# hostname = img01.51jobcdn.com, appapi.51job*.com, cupid.51job*.com
# 去广告 (需卸载App重装) img01.51jobcdn.com
^https:\/\/img01\.51jobcdn\.com\/im\/mkt/(?:tg/((19|20)\d{2})banner/(?!jcgz2/)|\d{4}/bd/\d{4}/).*\.jpg url reject
# 屏蔽更新
^https?:\/\/appapi\.51job(app)?\.com\/api\/util\/get_version url reject-dict
^https?:\/\/cupid\.51job(app)?\.com\/open\/noauth\/index\/last-version url reject-dict
# 开屏及营销广告
^https?:\/\/appapi\.51job(app)?\.com\/api\/market\/(?>adtrace|get_launch|get_prompt) url reject
# 顶部弹窗
^https?:\/\/cupid\.51job(app)?\.com\/open\/guide\/home-page-top url reject
# 首页右上角浮窗及右边浮标
^https?:\/\/cupid\.51job(app)?\.com\/open\/user-task\/user\/task\/init url reject
# 底栏中央活动标
^https?:\/\/cupid\.51job(app)?\.com\/open\/index\/notice-infos url reject-dict
# 弹窗广告
^https?:\/\/cupid\.51job(app)?\.com\/launch-hub\/open\/noauth\/popUp url reject
# 推荐流信息广告
^https?:\/\/cupid\.51job(app)?\.com\/open\/index\/recommend-infos url reject
^https?:\/\/cupid\.51job(app)?\.com\/open\/noauth\/recommend\/job-tab-dynamic url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/51job.js
# 我的页净化
^https?:\/\/cupid\.51job(app)?\.com\/open\/my-page\/ url script-response-body https://raw.githubusercontent.com/zirawell/R-Store/main/Res/Scripts/AntiAd/51job.js

# > 瑞幸咖啡
# hostname = capi.lkcoffee.com, ecapi.lkcoffee.com, m.lkcoffee.com, img0*.luckincoffeecdn.com
^https?:\/\/capi\.lkcoffee\.com\/resource\/m\/sys\/app\/adposNew url response-body \{.+\} response-body {"status":"SUCCESS"}
^https?:\/\/(ec|c)api\.lkcoffee\.com\/resource\/m\/eorder\/product\/popAppTagProductList url response-body \{.+\} response-body {"status":"SUCCESS"}
^https?:\/\/m\.lkcoffee\.com\/ecapi\/resource\/m\/member\/exchange\/page url response-body \{.+\} response-body {"status":"SUCCESS"}
^https?:\/\/m\.lkcoffee\.com\/capi\/resource\/m\/growUp\/main url response-body "popTitle":".+?" response-body "popTitle":""
^https?:\/\/img0[1-9]{1}\.luckincoffeecdn\.com\/group\d/M00/[A-Z0-9]{2}/[A-Z0-9]{2}/[a-zA-Z0-9]{29}\.(jpg|jpeg)_\.webp url reject-200

# > 什么值得买
# hostname = homepage-api.smzdm.com, haojia-api.smzdm.com, app-api.smzdm.com, user-api.smzdm.com, article-api.smzdm.com, qianbao.smzdm.com
^https:\/\/haojia-api\.smzdm\.com\/ranking_list\/articles\? url script-response-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/smzdm/smzdm_ads.js
^https?:\/\/user-api\.smzdm\.com\/vip\/creator_user_center url script-response-body https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/smzdm/smzdm_ads.js
# 感谢【怎么肥事】分享
^https?:\/\/app-api\.smzdm\.com\/util\/loading url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/app-api\.smzdm\.com\/util\/update url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/user-api\.smzdm\.com\/vip url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/user-api\.smzdm\.com\/vip\/bottom_card_list url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/haojia-api\.smzdm\.com\/home\/list url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/homepage-api\.smzdm\.com\/v3\/home url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/article-api\.smzdm\.com\/publish\/get_bubble url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js
^https?:\/\/qianbao\.smzdm\.com\/v\d\/app\/home url script-response-body https://raw.githubusercontent.com/ZenmoFeiShi/Qx/main/Smzdm.js

# > 顺丰快递
# hostname = ccsp-egmas.sf-express.com, ucmp.sf-express.com
# APP净化 感谢【怎么肥事】分享
^https?:\/\/ucmp\.sf-express\.com\/proxy\/esgcempcore\/memberGoods\/pointMallService\/goodsList url reject-dict
^https?:\/\/ccsp-egmas\.sf-express\.com\/cx-app-video\/video\/app\/video\/labelClusterList url reject-dict
^https?:\/\/ccsp-egmas\.sf-express\.com\/cx-app-base\/base\/app\/ad\/queryInfoFlow url reject-dict
^https?:\/\/ccsp-egmas\.sf-express\.com\/cx-app-base\/base\/app\/bms\/queryRecommend url reject-dict

# > 顺丰快递小程序
# hostname = mcs-mimp-web.sf-express.com, ucmp.sf-express.com
^https?:\/\/mcs-mimp-web\.sf-express\.com\/mcs-mimp\/integralPlanet\/getCxAdvertiseList url reject-dict
^https?:\/\/ucmp-static\.sf-express\.com\/proxy\/wxbase\/wxTicket\/wxLiveStreamInfo\?pageNo url reject-dict
^https?:\/\/ucmp\.sf-express\.com\/proxy\/esgcempcore\/memberGoods\/pointMallService\/goodsList url reject-dict
^https?:\/\/ucmp\.sf-express\.com\/proxy\/operation-platform\/info-flow-adver\/query url reject-dict
^https?:\/\/ucmp\.sf-express\.com\/proxy\/esgcempcore\/memberManage\/memberEquity\/queryRecommendEquity url reject-dict
^https?:\/\/ucmp\.sf-express\.com\/proxy\/esgcempcore\/memberActLengthy\/fullGiveActivityService\/fullGiveInfo url reject-dict

# > 顺丰优选
# hostname = mapi.sfbest.com
^https?:\/\/mapi\.sfbest\.com\/brokerservice-server\/cms\/getPositionById.* url reject

# Talkatone
# hostname = alt-r.my.com, imgx.jampp.com
^https?:\/\/alt-r\.my\.com\/mobile url reject-dict
^https?:\/\/imgx\.jampp\.com\/imgsrv\/tn url reject-img

# > 同花顺
# hostname = adm.10jqka.com.cn, iphone.ac.qq.com, stat.10jqka.com.cn
^https?:\/\/adm\.10jqka\.com\.cn\/interface\/ad\/recommend url reject-200
^https?:\/\/iphone\.ac\.qq\.com\/.*\/Support\/(getSystemConf|bootScreen) url reject
# 同花顺至尊版 感谢【梭哈 All in】分享
^https?:\/\/stat\.10jqka\.com\.cn\/q\?ld=mobile&id=ad url reject-dict

# > 蜗牛睡眠
# hostname = snailsleep.net
^https?:\/\/snailsleep\.net\/snail\/v\d\/adTask\/ url reject
^https?:\/\/snailsleep\.net\/snail\/v\d\/screen\/qn\/get\? url reject

# > 雪球
# hostname = api.xueqiu.com, open.xueqiu.com, stock.xueqiu.com, 39.103.79.14, 39.106.97.84, 47.95.49.75, 101.201.62.20, 101.201.62.26, 101.201.175.228, 124.250.48.3, 182.92.145.50, 182.92.251.113
# 感谢【可莉】分享
^https:\/\/api\.xueqiu\.com\/snowpard\/launch_strategy\/query\.json\?channel=1&height=932 url reject-dict
^https:\/\/open\.xueqiu\.com\/mpaas\/config\/content\?.+home_visitor_relation_config url reject-dict
^https:\/\/api\.xueqiu\.com\/snowpard\/launch_strategy\/query\.json\?channel=1&location=0&model=6&page=4 url reject-dict
^https:\/\/api\.xueqiu\.com\/snowpard\/launch_strategy\/query\.json\?channel=1&location=0&model=1&page=(4|6) url reject-dict
^https:\/\/api\.xueqiu\.com\/ucprofile\/api\/user\/batchGetUserBasicInfo\.json url reject-dict
^https:\/\/api\.xueqiu\.com\/lightsnow\/launch\/plan\/bee\/query\.json\?channel=1&ip_label=&label_json=.+new_customer=1 url reject-dict
^https:\/\/api\.xueqiu\.com\/lightsnow\/optional\/banner\/query\.json url reject-dict
^https:\/\/open\.xueqiu\.com\/mpaas\/config\/content\?.+cube_detail_bottom_operation_trade_button url reject-dict
^https:\/\/api\.xueqiu\.com\/recommend-proxy\/card\/zj_card\.json\?feed_id=207 url reject-dict
^https:\/\/api\.xueqiu\.com\/recommend-proxy\/card\/portfolio_tab_symbol\.json url reject-dict
^https:\/\/stock\.xueqiu\.com\/v5\/stock\/group\/recommend\/default\/list\.json url reject-dict
^https:\/\/api\.xueqiu\.com\/livestream\/structure\/live\/hotCard\.json url reject-dict

# > 向日葵
# hostname = client-api-v2.oray.com
# ^https?:\/\/client-api-v2\.oray\.com\/materials url reject-200
# 开屏广告
^https?:\/\/client-api-v2\.oray\.com\/materials\/SLCC_IOS_STARTUP url reject-dict
# 首页文字广告
^https?:\/\/client-api-v2\.oray\.com\/materials\/SLCC_IOS_DEVICE url reject-dict
# 发现页广告
^https?:\/\/client-api-v2\.oray\.com\/materials\/SUNLOGIN_CLIENT_IOS_PROMOTION url reject-dict

# > 闲鱼
# hostname = acs.m.goofish.com, g-acs.m.goofish.com, dinamicx.alibabausercontent.com
# 拦截广告下发
^http:\/\/amdc\.m\.taobao\.com\/amdc\/mobileDispatch %E9%97%B2%E9%B1%BC* url-and-header reject
# 我的页面横幅
^https:\/\/dinamicx\.alibabausercontent\.com\/pub\/fish_home_top_kingkong_new\/ url reject
# 搜索页面净化
^https:\/\/acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idlemtopsearch\.item\.search\.activate\/ url reject-dict
^https:\/\/acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idlemtopsearch\.search\.discover\/ url reject-dict
# 首页顶部标签
^https:\/\/(g-)?acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idle\.home\.whale\.modulet\/ url script-response-body https://github.com/fmz200/wool_scripts/raw/main/Scripts/xianyu/xianyu_ads.js
# 搜索栏填充词
^https:\/\/(g-)?acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idlemtopsearch\.search\.shade\/ url script-response-body https://github.com/fmz200/wool_scripts/raw/main/Scripts/xianyu/xianyu_ads.js
# 首页闲鱼币入口、底部发布球
^https:\/\/(g-)?acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idle\.user\.strategy\.list\/ url script-response-body https://github.com/fmz200/wool_scripts/raw/main/Scripts/xianyu/xianyu_ads.js
# 商品信息流广告
^https:\/\/(g-)?acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idlehome\.home\.nextfresh\/ url script-response-body https://github.com/fmz200/wool_scripts/raw/main/Scripts/xianyu/xianyu_ads.js
# 定位地区页面的信息流广告
^https:\/\/(g-)?acs\.m\.goofish\.com\/gw\/mtop\.taobao\.idle\.local\.home\/ url script-response-body https://github.com/fmz200/wool_scripts/raw/main/Scripts/xianyu/xianyu_ads.js

# > 云闪付
# hostname = wallet.95516.com, tysdk.95516.com, ads.95516.com
# 默认关闭,只使用分流去云闪付广告
#^https?:\/\/wallet\.95516\.com\/s\/wl\/icon\/long url reject
#^https?:\/\/(tysdk|ads)\.95516\.com url reject-dict

# > 央视频
# hostname = cdn.cmgadx.com
^https?:\/\/cdn\.cmgadx\.com\/sdk\/pool\/m8uTS50pt3DC0Xd6\.json url reject-200
^https?:\/\/cdn\.cmgadx\.com\/sdk\/pool\/\w+\.json url reject

# > 中国联通
# hostname = m.client.10010.com, m1.ad.10010.com, res.mall.10010.cn
^https?:\/\/m\.client\.10010\.com\/mobileService\/(activity|customer)\/(accountListData|get_client_adv|get_startadv) url reject-img
^https?:\/\/m\.client\.10010\.com\/mobileService\/customer\/getclientconfig\.htm url reject-dict
^https?:\/\/m\.client\.10010\.com\/uniAdmsInterface\/(getHomePageAd|getWelcomeAd) url reject-img
^https?:\/\/[^(apple|10010)]+\.(com|cn)\/(a|A)d(s|v)?(\/|\.js) url reject-img
^https?:\/\/m1\.ad\.10010\.com\/noticeMag\/images\/imageUpload\/2\d{3} url reject-img
^https?:\/\/res\.mall\.10010\.cn\/mall\/common\/js\/fa\.js?referer= url reject-img

# > 中国电信
# hostname = cloud.189.cn, zt-app.go189.cn
^https?:\/\/cloud\.189\.cn\/include\/splash\/ url reject
^https?:\/\/zt-app\.go189\.cn\/zt-app\/welcome\/.*?Animation url reject-img

# > 中国广电
# hostname = app.10099.com.cn
^https?:\/\/app\.10099\.com\.cn\/contact-web\/api\/version\/getFlashScreenPage url reject-200

# > 字节跳动
# hostname = *.pstatp.com, amemv.com, musical.com, snssdk.com, tiktokv.com, dsp.toutiao.com
#^https?:\/\/.+\.pstatp\.com\/img\/ad url reject-200
^https?:\/\/.+\.(amemv|musical|snssdk|tiktokv)\.com\/(api|motor)\/ad\/ url reject-200
^https?:\/\/.+\.snssdk\.com\/motor\/operation\/activity\/display\/config\/V2\/ url reject-200
^https?:\/\/dsp\.toutiao\.com\/api\/xunfei\/ads\/ url reject-200
^https?:\/\/[\w-]+\.amemv\.com\/aweme\/v\d\/ad\/ url reject
^https?:\/\/[\w-]+\.snssdk\.com\/.+_ad\/ url reject
^https?:\/\/.+\.amemv\.com\/.+app_log url reject-img
^https?:\/\/.+\.amemv\.com\/.+report url reject-img
^https?:\/\/.+\.amemv\.com\/.+stats url reject-img

# > 浙里办
# hostname = portal.zjzwfw.gov.cn
^https?:\/\/portal\.zjzwfw\.gov\.cn\/app_api\/appHome\/selectStartPic url response-body "data":\{.+\} response-body "data":{}

# 去重后的hostname，将对以下域名进行MITM（MAN-IN-THE-MIDDLE：中间人攻击）
hostname = *.gamersky.com, emisdatacenteraws.hafoo.com, spamblocker-api.zeekstudio.com, marketing.cmschina.com, www.tailgdd.com, mobile-consumer-sapp.chery.cn, testflight.apple.com, order-app-api.lbdj.com, ecloud.tppension.cntaiping.com, cache.bydauto.com.cn, app-v1.ecoliving168.com, patient-api.suh.cn, userpms-api.suh.cn, se-api.djiits.com, a.line.me, ad.line-scdn.net, buy.line.me, cix.line-apps.com, crs-event.line.me, d.line-scdn.net, gw.line.naver.jp, legy.line-apps.com, nelo2-col.linecorp.com, obs.line-scdn.net, scdn.line-apps.com, sch.line.me, static.line-scdn.net, uts-front.line-apps.com, w.line.me, vue3-api.zhixiny.cn, mbank5.jsbchina.cn, mobileapi.xiamenair.com, appapi.caiyicloud.com, res1.hubcloud.com.cn, vapp.tmuyun.com, api2.yaduo.com, api.gongkaoleida.com, magev6.if.qidian.com, syh.zybang.com, www.zybang.com, pzoap.moedot.net, app.api.d3yuiw4.com, app-izz.zhengzhou.gov.cn, creditcard.bankcomm.com, *.byteimg.com.*, www.cntv.cn, *.townmalls.cn, chat-live.soulapp.cn, api.flydigi.com, www.ymm56.com, app.ceair.com, mcsp.cloudpnr.com, saas-ad.cloudpnr.com, g.alicdn.com, api.huachenjie.com, open.e.kuaishou.cn, ad.shunchangzhixing.com, img01.51jobcdn.com, api5.youonbike.com, mgesq.api.mgtv.com, *.hitv.com, qiye.gaoding.com, gw.chuangkit.com, zlsdk.1rtb.net, web2.realtech-inc.com, sdk.1rtb.net, gw.xiaocantech.com, delivery-api.imdada.cn, adservice.sigmob.cn, api.u51.com, gateway.36kr.com, xxyx-client-api.xiaoxiaoyouxuan.com, statistic.live.126.net, zgrb.epicc.com.cn, compus.xiaofubao.com, imgx.jampp.com, ad.life.360.cn, wanciwangdata.oss-cn-beijing.aliyuncs.com, recite.perfectlingo.com, *.cmvideo.cn, b-api.ins.miaopai.com, social.blued.cn, api.petkit.cn, ams-cdn.cdtft.cn, e.weather.com.cn, beehiveapi.58.com, apio.zhengqi100.com, res.hongyibo.com.cn, misc-api-prd-mx.wandafilm.com, e-static.aia.com.cn, api.sogaha.cn, api-miprint.hannto.com, api.indeedpower.com, alt-r.my.com, m.pvp.xoyo.com, *.pipix.com, daijia.kuaidadi.com, as.xiaojukeji.com, preprod.cdzghome.com, api.xbxxhz.com, api.petkit.cn, sfo.mddcloud.com.cn, mob.mddcloud.com.cn, toblog.ctobsnssdk.com, t-dsp.pinduoduo.com, mobads-pre-config.cdn.bcebos.com, sdk1xyajs.data.kuiniuca.com, conf-darwin.xycdn.com, *.ubixioe.com, www.xiaoxiongmeishu.com, gateway.benewtech.cn, ntt-app.benewtech.cn, open.e.kuaishou.cn, api-access.pangolin-sdk-toutiao-b.com, api-access.pangolin-sdk-toutiao.com, api-access.pangolin-sdk-toutiao1.com, dsp-x.jd.com, api-cfg.wtzw.com, p1-lm.adukwai.com, bk.bingo.qq.com, maicai.api.ddxq.mobi, gw.api.ddxq.mobi, user.api.ddxq.mobi, c.zhangle.com, midc.cdn-static.abchina.com.cn, enjoy.cdn-static.abchina.com, ocrifs.ejoy.sinopec.com, apicloud.zol.com, minipro.95504.net, service.haiersmarthomes.com, gugongmini.dpm.org.cn, wechat.tf.cn, chl.tf.cn, mbasecc.bas.cmbchina.com, mbasecc.bcs.cmbchina.com, intellicc.bas.cmbchina.com, bohe.sfo-tx-shanghai-01.saas.sensorsdata.cn, api.boohee.com, bohe.sfo-tx-shanghai-01.saas.sensorsdata.cn, lego.boohee.com, status.boohee.com, cdn.133.cn, acs.youku.com, push.m.youku.com, un-acs.youku.com, gw.alicdn.com, tiku.fenbi.com, napi.ithome.com, vapp.tmuyun.com, www.1314zhilv.com, mobile.flightradar24.com, api.17kjs.com, interface.aomiapp.com, oxadmin.cp.com.cn, home.umetrip.com, discardrp.umetrip.com, startup.umetrip.com, dictvip-business.youdao.com, dict.youdao.com, api-overmind.youdao.com, cdke.youdao.com, live.inst-service.htsc.com, gql.reddit.com, gql-fed.reddit.com, imcs.citicbank.com, mkt-gateway.tuhu.cn, tianqi.2345.com, shcss.suning.com, shcss.suning.com, one-app-h5.faw-vw.com, lens.leoao.com, www.binance.info, www.yingwangtech.net, www.binance.com, api.hengdianfilm.com, ump.sz.creditcard.ecitic.com, tbgapplet.carlsberg.asia, mbmodule-openapi.paas.cmbchina.com, api.zhihu.com, appcloud2.zhihu.com, m-cloud.zhihu.com, www.zhihu.com, zhuanlan.zhihu.com, link.zhihu.com, open-cms-api.quark.cn, vv.video.qq.com, evs.500.com, dq.dxy.cn, m.you.163.com, open-cms-api.uc.cn, *.yuxueyuan.cn, pan-api.bitqiu.com, iapi.bishijie.com, run.api.qyfxgd.cn, gongdu.youshu.cc, api.21ec74.com, ztoread.ziroom.com, iphone.ac.qq.com, api.00bang.cn, app.hbooker.com, api.sfacg.com, api3.cls.cn, gateway-api.dushu365.com, bdsp-x.jd.com, dsp-x.jd.com, app.homeinns.com, pic.edaijia.cn, cdn-evone-ceph.echargenet.com, mlol.qt.qq.com, gg.caixin.com, cn-acs.m.cainiao.com, zjdr666.com, adapi.izuiyou.com, access.mypikpak.com, open.fitdays.cn, ap.dongqiudi.com, 103.91.210.141, js-ad.ayximgs.com, pipi.4kya.com, tft-app.cdtft.cn, t1.market.xiaomi.com, b.appsimg.com, ios.sspai.com, zconfig.alibabausercontent.com, easyreadfs.nosdn.127.net, sp.kaola.com, mapi.dangdang.com, client.qunar.com, slapi.oray.net, api.internetofcity.cn, lcen.xiaote.net, venus.yhd.com, api.shenyin.name, mage*.if.qidian.com, e.dangdang.com, adproxy.autohome.com.cn, explorer.tratao.com, overseas.weico.cc, 118.178.214.118, client.mail.163.com, api.psy-1.com, cdn.*.chelaileapp.cn, *.laichon.com, api-ad-product.huxiu.com, jad-api.jin10.com, appactive.1234567.com.cn, service.busi.inke.cn, dispatcher.camera360.com, 47.110.187.87, ssp.soulapp.cn, api-account.soulapp.cn, api-global.soulapp.me, api-a.soulapp.cn, api-pay.soulapp.cn, gateway-mobile-gray.soulapp.cn, api-chat.soulapp.cn, post.soulapp.cn, api-user.soulapp.cn, ssp.soulapp.cn, beta-api.crunchyroll.com, helper.2bulu.com, tagit.hyhuo.com, top-widgets-api.xiaozujian.com, *mangaapi.manhuaren.*, apis.lifeweek.com.cn, yanxuan.nosdn.127.net, *.peopleapp.com, new-app-api.ylyk.com, *.58cdn.com.cn, creditcardapp.bankcomm.com, lchttpapi.xczim.com, *.chelaile.net.cn, api.xiaoyi.com, api.douban.com, sso.ifanr.com, s3plus.meituan.net, cdb.meituan.com, *.hoopchina.com, goblin.hupu.com, gmp.lakala.com, wallet.lakala.com, hz.yxzq.com, api.winbull8.com, editor.sm.cn, p0.pipi.cn, 182.92.244.70, ad.myfriday.cn, ios-api.lucklyworld.com, www.onstar.com.cn, facade-api.black-unique.com, cstore-en-public-tx.seewo.com, oneapph5.dongfeng-nissan.com.cn, cds.wifi188.com, homefront.qunar.com, sh-gateway.shihuo.cn, cgbank.oss-cn-shenzhen.aliyuncs.com, imeres.baidu.com, api.taptapdada.com, a.sinopecsales.com, api.nj.nbtv.cn, v3.wufazhuce.com, ma-adx.ctrip.com, yun.tuitiger.com, www.pushplus.plus, ad.mcloud.139.com, fastbuyer.zbj.com, xhtz.oss-cn-guangzhou.aliyuncs.com, promote-trx.helipay.com, hfapp-service.qweather.net, api.ulife.group, api.sodalife.xyz, app.chinahxzq.com.cn, hdgateway.zto.com, mobile-api.imlaidian.com, wxs-weixin.sd.zhumanggroup.com, s.jiediankeji.com, smarket.dian.so, file.dian.so, aag.enmonster.com, hd.xiaojukeji.com, freight.xiaojukeji.com, capis*.didapinche.com, ad.xiaotucc.com, mapi.xiaotucc.com, adsoss.zhinengxiyifang.cn, api-marketing.zhinengxiyifang.cn, ads.zhinengxiyifang.cn, app.missevan.com, bd-api.kuwo.cn, h5app.kuwo.cn, bodianimgcdn.kuwo.cn, mgxhtj.kuwo.cn, nmobi.kuwo.cn, searchrecterm.kuwo.cn, audiobookpay.kuwo.cn, musicpay.kuwo.cn, vip1.kuwo.cn, pacdn.m.stock.pingan.com, manga.bilibili.com, bid.adview.cn, zua.zhidiantianxia.cn, app.10086.cn, mrp.mcloud.139.com, *.i18n-pglstatp.com, api.wmpvp.com, m.prod.app.hsbcfts.com.cn, p*.pstatp.com, mapi.txcmapp.com, api-one-wscn.awtmt.com, fintechappdr.cgws.com, m.qianbao.qq.com, j1.pupuapi.com, 54.222.159.138, ad.lofter.com, images.pinduoduo.com, lofter.lf127.net, client.tujia.com, www.gcores.com, app02.vgtime.com, www.vgtime.com, app.meruki.cn, qimg.cdnmama.com, ecapi.lkcoffee.com, capi.lkcoffee.com, m.lkcoffee.com, gsp.gacmotor.com, appdmkj.5idream.net, www.onstar.com.cn, api.shanghaionstar.com, szdmobile.suzhou.gov.cn, ad.shunchangzhixing.com, api.bwton.com, z.onewo.com, plough.babytree.com, mapiweb.babytree.com, go.babytree.com, aimg.babytreeimg.com, *.ly.com, *.17usoft.com, *.17u.cn, mobilehotelapi.elong.com, quic-tcmapi.elong.com, blog.nilbt.com, www.banyuetanapp.com, ecard.shenzhentong.com, ccmsupport-sz.tenpay.com, dl.app.gtja.com, fuwu.nhsa.gov.cn, api?.sparke.cn, cube.elemecdn.com, nr-op.elemecdn.com, info.mina.xiaoaisound.com, home.mi.com, tk.lanjiyin.com.cn, poplayer.template.alibaba.com, acs.m.taobao.com, amdc.m.taobao.com, guide-acs.m.taobao.com, api.alipan.com, member.alipan.com, acs-m.freshippo.com, mcs-mimp-web.sf-express.com, ucmp.sf-express.com, api.ncarzone.com, api.caiyunapp.com, wrapper.cyapi.cn, mres.aibank.com, direct.z-bank.com, mobile.1qianbao.com, middle.yun.139.com, mcmm.caiyun.feixin.10086.cn, cdn-oss.00bang.cn, mapi.sichuanair.com, b2baifanfan.baidu.com, app.badmintoncn.com, app.bilibili.com, api.bilibili.com, api.live.bilibili.com, grpc.biliapi.net, portal.zjzwfw.gov.cn, shopapi.io.mi.com, www.ahzs10000.com, quanguo.mygolbs.com, open.taou.com, h3.open.taou.com, sichuan.95504.net, app.10099.com.cn, sdk.alibaba.com.ailbaba.me, mrobot.pconline.com.cn, api.gameplus.qq.com, cdn.sdb.com.cn, creditcardapp.bankcomm.cn, router-app-api.jdcloud.com, api.yonghuivip.com, cdn.jlbank.com.cn, 3g.csair.com, gha.ghac.cn, webappcfg.paas.cmbchina.com, *.qyfxgd.cn, *.weilai555.com, *.ecoliving168.com, vip7.fzwdyy.cn, wcprd.hilton.com.cn, adx-cn.anythinktech.com, www.didapinche.com, client-api-v2.oray.com, sdk.alibaba.com, bgw.xinyue.qq.com, api.tipsoon.com, imeclient.openspeech.cn, m.360buyimg.com, business-cdn.shouji.sogou.com, ios.sogou.com, android.sogou.com, h5api.sginput.qq.com, m*.amap.com, optimus-ads.amap.com, pv.elife.icbc.com.cn, mangaapi.manhuaren.com, news.ssp.qq.com, ccsp-egmas.sf-express.com, zhidao.baidu.com, api.vistopia.com.cn, xyst.yuanfudao.com, mapi.appvipshop.com, guanyu.longfor.com, mp.weixin.qq.com, *.kingsoft-office-service.com, ptmpcap.caocaokeji.cn, pcauto.com.cn, mps.95508.com, i-lq.snssdk.com.*, img0*.luckincoffeecdn.com, app.zhoudamozi.com, apple.fuliapps.com, gurd.snssdk.com.*, peisongapi.meituan.com, cdn.kuaidi100.com, cdn.cmgadx.com, api.gamer.com.tw, impservice.dictapp.youdao.com, api.gaoqingdianshi.com, cdn.dianshihome.com, *.kakamobi.cn, 47.100.65.202, youtubei.googleapis.com, app.wy.guahao.com, mapi.sfbest.com, *.xiangxiangapps.com, cmsfile.wifi8.com, prom.mobile.gome.com.cn, nnapp.cloudbae.cn, api.21jingji.com, a.qiumibao.com, jdread-api.jd.com, open.qyer.com, app-api.niu.com, us.l.qq.com, qde.qunar.com, res.pizzahut.com.cn, book.img.ireader.com, aes.acfun.cn, api-new.app.acfun.cn, images.cib.com.cn, jiucaigongshe.oss-cn-beijing.aliyuncs.com, mage.if.qidian.com, app.aa-ab.com, zone.guiderank-app.com, richmanrules.ksedt.com, richmanapi.jxedt.com, geetest.htsc.com, 119.29.29.*, api.m.mi.com, awg.enmonster.com, api.haohaozhu.cn, du.hupucdn.com, apps.api.ke.com, api.ycapp.yiche.com, omgup*.xiaojukeji.com, issuecdn.baidupcs.com, gab.122.gov.cn, www.oschina.net, m.ibuscloud.com, app.api.versa-ai.com, ok.166.net, image*.benlailife.com, home.mi.com, djcapp.game.qq.com, static.xyzq.cn, iobs.pingan.com.cn, app3.qdaily.com, api.mcd.cn, api.mgzf.com, open.e.kuaishou.com, osg-static.sgcc.com.cn, osg-service.sgcc.com.cn, app.dewu.com, cdn.poizon.com, supportda.ofo.com, r6.mo.baidu.com, res.mi.baidu.com, mbd.baidu.com, capi.mwee.cn, m.client.10010.com, m1.ad.10010.com, res.mall.10010.cn, app.yinxiang.com, img.meituan.net, baidu.com, *-release.wuta-cam.com, cdnmobibank.bankofbeijing.com.cn, mapi.mafengwo.cn, mada-travel.17u.cn, ebk.17u.cn, api.izuiyou.com, appconf.mail.163.com, api.dangdang.com, cmsapi.wifi8.com, daoyu.sdo.com, gw.aihuishou.com, bp-api.bestv.com.cn, bp-image.bestv.com.cn, portal-portm.meituan.com, mall.meituan.com, cdn-xyk-app.bankofbeijing.com.cn, thor.weidian.com, open3.vistastory.com, i.ys7.com, www.xiaohongshu.com, edith.xiaohongshu.com, ci.xiaohongshu.com, rec.xiaohongshu.com, api.caijingmobile.com, j5.dfcfw.com, capi.douyucdn.cn, icc.one, api.coolapk.com, ios.xiangjiaoapps.com, img.wukongtv.com, service.4gtv.tv, static.api.m.panda.tv, api-mifit*.huami.com, channel.beitaichufang.com, static.95508.com, wap.bank.ecitic.com, file.cibfintech.com, api*.futunn.com, mob.mddcloud.com, i.snssdk.com.*, images.client.vip.xunlei.com, api-shoulei-ssl.xunlei.com, elemecdn.com, l*.51fanli.net, app.zhuanzhuan.com, *.bdstatic.com, rs.creditcard.cmbc.com.cn, ocean.shuqireader.com, api.fengshows.com, sh-gateway.shihuo.cn, api.touker.com, app.variflight.com, sofire.baidu.com, www.cmbc.com.cn, img01.10101111cdn.com, r.inews.qq.com, *.xima*.*, afd.baidu.com, appwk.baidu.com, ios.lantouzi.com, mpcs.suning.com, m.tuniu.com, api.jxedt.com, dns.jd.com, api.m.jd.com, m.jd.com, *.k.sohu.com, www.nfmovies.com, static01.versa-ai.com, gfp.veta.naver.com, mpos-pic.helipay.com, api.yikaobang.com.cn, god.gameyw.netease.com, image.spdbccc.com.cn, fbchina.flipchina.cn, media.qyer.com, webcast-open.douyin.com, ether-pack.pangolin-sdk-toutiao.com, api-access.pangolin-sdk-toutiao?.com, sf*-fe-tos.pglstatp-toutiao.com, restapi.iyunmai.com, static.shihuocdn.cn, weixin110.qq.com, appapi.huazhu.com, hweb-hotel.huazhu.com, hweb-manager.huazhu.com, lban.spdb.com.cn, wap.spdb.com, smart.789.image.mucang.cn, btrace.qq.com, img.dailmo.com, app.95598pay.com, reading-hl.snssdk.com, adproxy.autohome.com, ma.ofo.com, dl*.app.gtja.com, activity2.api.ofo.com, luckman.suning.com, app.xinpianchang.com, static.gameplus.qq.com, portal-xunyou.qingcdn.com, notch.qdaily.com, pan.baidu.com, tiebac.baidu.com, *.tieba.baidu.com, snailsleep.net, *.xmcdn.*, api.laifeng.com, fuss10.elemecdn.com, smkmp.96225.com, static.creditcard.hxb.com.cn, sf3-be-pack.pglstatp-toutiao.com, ossgw.alicdn.com, *.mgtv.com, oral.youdao.com, p.kuaidi100.com, mlife.jf365.boc.cn, heic.alicdn.com, acs.m.goofish.com, g-acs.m.goofish.com, dinamicx.alibabausercontent.com, www.tsytv.com, app2.autoimg.cn, www.iyingdi.cn, m.baidu.com, webboot.zhangyue.com, api4.bybutter.com, security.wechat.com, api.xiachufang.com, 4gimg.map.qq.com, p.du.163.com, support.you.163.com, apiwz.midukanshu.com, tc.qq.com, img.admobile.top, api.pinduoduo.com, cheyouapi.ycapp.yiche.com, api.kkmh.com, ad.ysepay.com, ports3.gtimg.com, i*.hdslb.com, m.yap.yahoo.com, webcdn.m.qq.com, rtbapi.douyucdn.cn, dapis.mting.info, qidian.qpic.cn, games.mobileapi.hupu.com, emdcadvertise.eastmoney.com, mime.baidu.com, api.club.lenovo.cn, img.allahall.com, staticsns.cdn.bcebos.com, api.wfdata.club, dsa-mfp.fengshows.cn, flowplus.meituan.net, ssp.dzh.com.cn, adm.10jqka.com.cn, stat.10jqka.com.cn, api.xueqiu.com, open.xueqiu.com, stock.xueqiu.com, 39.103.79.14, 39.106.97.84, 47.95.49.75, 101.201.62.20, 101.201.62.26, 101.201.175.228, 124.250.48.3, 182.92.145.50, 182.92.251.113, ios.fuliapps.com, pt-starimg.didistatic.com, omgup*.xiaojukeji.com, *.pipiapps.com, adstatic.peopleapp.com, otheve.beacon.qq.com, ptf.flyertrip.com, api.qbb6.com, res.xiaojukeji.com, conf.diditaxi.com.cn, yunbusiness.ccb.com, img.alicdn.com, capis.didapinche.com, ms.jr.jd.com, m.creditcard.ecitic.com, img.gdoil.cn, api.hanju.koudaibaobao.com, api.jr.mi.com, imagev2.tx.xmcdn.com, upload-bbs.mihoyo.com, gw-passenger.01zhuanche.com, img.yun.01zhuanche, ndstatic.cdn.bcebos.com, fc-video.cdn.bcebos.com, rp.hpplay.cn, dyncdn.me, pss.txffp.com, capis*.didapinche.com, dxy.com, staticlive.douyucdn.cn, edit.sinaapp.com, www1.elecfans.com, *.googlevideo.com, pocketuni.net, x.seeyouyima.com, axxd.xmseeyouyima.com, config-service.seeyouyima.com, j-image.missfresh.cn, cms.daydaycook.com, api.cloud.189.cn, mobile.cebbank.com, yghsh.cebbank.com, y.gtimg.cn, dss0.bdstatic.com, tb1.bdstatic.com, tb2.bdstatic.com, ss0.bdstatic.com, gss0.bdstatic.com, newclient.map.baidu.com, ossweb-img.qq.com, mea.meitudata.com, adui.tg.meitu.com, list-app-m.i4.cn, api.daydaycook.com, learn.chaoxing.com, interface.music.163.com, interface?.music.163.com, ipv4.music.163.com, mrobot.pconline.com.cn, res.kfc.com.cn, gw.kaola.com, api.huomao.com, mi.gdt.qq.com, fmapp.chinafamilymart.com.cn, app-gw.csdn.net, gw.csdn.net, app.58.com, cap.caocaokeji.cn, live-ads.huya.com, cdn.wup.huya.com, cdnfile1.msstatic.com, business.msstatic.com, ct.xiaojukeji.com, homepage-api.smzdm.com, haojia-api.smzdm.com, app-api.smzdm.com, user-api.smzdm.com, article-api.smzdm.com, qianbao.smzdm.com, api.smzdm.com, adpai.thepaper.cn, www.baidu.com, *.tv.sohu.com, ih2.ireader.com, common.diditaxi.com.cn, display.wting.info, kano.guahao.cn, i-lq.snssdk.com, cloud.189.cn, ad.12306.cn, dl-cu-hz.lechange.cn, spclient.wg.spotify.com, dsp-impr2.youdao.com, api.rr.tv, *.pglstatp-toutiao.com, mobile.yangkeduo.com, api.yangkeduo.com, xyz.cnki.net, api.bjxkhc.com, d.psbc.com, fm.fenqile.com, client.app.coc.10086.cn, img.ddrk.me, ddrk.me, img.jiemian.com, message.shuqireader.com, ut2.shuqistat.com, dsp.toutiao.com, sq.sljkj.com, img-tailor.11222.cn, feedback.uc.cn, *.shuqireader.com, 101.91.69.26, gateway.shouqiev.com, api.gotokeep.com, kad.gotokeep.com, static1.keepcdn.com, mbank.grcbank.com, -i.vip.iqiyi.com, *.iqiyi.com, api-sams.walmartmobile.cn, api.htp.ad-scope.com.cn, appgw.ddpai.com, init.sms.mob.com, www.flyert.com, hcz-member.pingan.com.cn, jp.rsscc.com, jt.rsscc.com, appapi.51job*.com, cupid.51job*.com, api-ac.liepin.com, api-wanda.liepin.com, manga.bilibili.com, intellicc.bcs.cmbchina.com, api-cslp-emt.amazon.cn, m.airchina.com.cn, apphw.ddpai.com, waimai-guide.ele.me, 39.98.135.211, api.51credit.com, booking.bestwehotel.com, webapi.qmai.cn, miniapp.qmai.cn, web-stable-cdn.ykccn.com, gw3.ykccn.com, ec.ems.com.cn, ump.ems.com.cn, clubmed.bd.clubmedmnp.com, api.xiaoyuzhoufm.com, apis.folidaymall.com
