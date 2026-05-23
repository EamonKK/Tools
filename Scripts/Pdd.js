/**
 * 拼多多去广告 - Surge Script
 * 原Loon jq规则转换版
 * 对应 [Body Rewrite] http-response-jq 逻辑
 */

const url = $request.url;
let body;

try {
  body = JSON.parse($response.body);
} catch (e) {
  $done({});
}

// ─── 首页 hub ─────────────────────────────────────────────
if (/api\/alexa\/homepage\/hub\?/.test(url)) {
  const r = body.result;
  if (r) {
    // 删除首页短视频横幅
    if (r.dy_module) delete r.dy_module.irregular_banner_dy;
    // 删除icon入口集合（会场入口等）
    delete r.icon_set;
    // 删除热搜词
    delete r.search_bar_hot_query;
    // 底栏只保留 首页/消息/个人中心
    const keepTabs = ["index.html", "chat_list.html", "personal.html"];
    if (Array.isArray(r.bottom_tabs)) {
      r.bottom_tabs = r.bottom_tabs.filter(t => keepTabs.some(k => (t.link || "").includes(k)));
    }
    if (Array.isArray(r.buffer_bottom_tabs)) {
      r.buffer_bottom_tabs = r.buffer_bottom_tabs.filter(t => keepTabs.some(k => (t.link || "").includes(k)));
    }
    // 清除顶部导航图片资源（减少视觉噪音）
    if (Array.isArray(r.all_top_opts)) {
      r.all_top_opts = r.all_top_opts.map(item => {
        const clean = Object.assign({}, item);
        delete clean.selected_image;
        delete clean.image;
        delete clean.height;
        delete clean.width;
        return clean;
      });
    }
  }
}

// ─── 搜索结果 ─────────────────────────────────────────────
if (/\/search\?/.test(url)) {
  delete body.expansion;
}

// ─── 个人中心 hub ─────────────────────────────────────────
if (/api\/philo\/personal\/hub\?/.test(url)) {
  delete body.monthly_card_entrance;
  delete body.personal_center_style_v2_vo;
  if (body.icon_set) {
    delete body.icon_set.icons;
    delete body.icon_set.top_personal_icons;
  }
}

// ─── 直播/商品详情 oak render ─────────────────────────────
if (/api\/oak\/integration\/render\?/.test(url)) {
  delete body.bottom_section_list;
  if (body.ui) {
    delete body.ui.bottom_section;
    if (body.ui.live_section) delete body.ui.live_section.float_info;
  }
}

// ─── 订单详情 order_detail_group ─────────────────────────
if (/api\/caterham\/v3\/query\/order_detail_group\?/.test(url)) {
  if (body.data) delete body.data.goods_list;
}

// ─── 订单页 /order/ ───────────────────────────────────────
if (/\/order\//.test(url)) {
  delete body.marketing_banner_vo;
  if (body.shipping) delete body.shipping.banner_above_recommend;
}

// ─── 订单列表 order_list_v4 ───────────────────────────────
if (/api\/aristotle\/order_list_v4\?/.test(url)) {
  if (Array.isArray(body.orders)) {
    body.orders = body.orders.map(order => {
      if (Array.isArray(order.order_buttons)) {
        order.order_buttons = order.order_buttons.map(btn => {
          const b = Object.assign({}, btn);
          delete b.order_growth_tip;
          return b;
        });
      }
      return order;
    });
  }
}

$done({ body: JSON.stringify(body) });