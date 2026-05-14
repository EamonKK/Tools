/**
 * Holivator 每日签到脚本
 *
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-cookie = type=http-request,pattern=^https:\/\/holivator\.de\/api\/v1\/user\/checkin\/status,script-path=holivator_cookie.js,script-update-interval=0
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const ACCESS_TOKEN = $persistentStore.read("holi_access_token");
const CSRF_TOKEN = $persistentStore.read("holi_csrf_token");
const CF_CLEARANCE = $persistentStore.read("holi_cf_clearance");

if (!ACCESS_TOKEN || !CSRF_TOKEN || !CF_CLEARANCE) {
  $notification.post(
    "Holivator 签到",
    "⚠️ Cookie 未配置",
    "请先打开 holivator.de 页面自动获取 Cookie"
  );
  $done();
}

const BASE_URL = "https://holivator.de";

$httpClient.post({
  url: BASE_URL + "/api/v1/user/checkin",
  headers: {
    "accept": "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "zh-CN,zh-Hans;q=0.9",
    "authorization": "Bearer " + ACCESS_TOKEN,
    "content-length": "0",
    "cookie": `access_token=${ACCESS_TOKEN}; cf_clearance=${CF_CLEARANCE}; csrf_token=${CSRF_TOKEN}`,
    "origin": BASE_URL,
    "referer": BASE_URL + "/portal",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
    "x-csrf-token": CSRF_TOKEN
  },
  body: ""
}, function(error, response, data) {
  if (error) {
    $notification.post("Holivator 签到", "❌ 请求失败", error);
    $done();
    return;
  }

  try {
    const result = JSON.parse(data);
    if (response.status === 200 || response.status === 201) {
      const points = result.data?.points || result.points || "";
      $notification.post(
        "Holivator 签到",
        "✅ 签到成功！",
        points ? `获得 ${points} 积分` : "签到完成"
      );
    } else if (response.status === 400 || response.status === 403) {
      $notification.post("Holivator 签到", "📅 今日已签到", "无需重复签到");
    } else if (response.status === 401) {
      $notification.post("Holivator 签到", "🔑 Cookie 已过期", "请重新打开 holivator.de 自动更新");
    } else {
      $notification.post("Holivator 签到", "⚠️ 签到异常", `状态码: ${response.status}\n${data}`);
    }
  } catch (e) {
    $notification.post("Holivator 签到", "⚠️ 响应解析失败", data);
  }

  $done();
});