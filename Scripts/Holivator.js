/**
 * Holivator 每日签到脚本
 * 
 * ========== 首次使用：先运行 holivator_setup.js 存入 Cookie ==========
 * 
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const ACCESS_TOKEN = $persistentStore.read("holi_access_token");
const CSRF_TOKEN = $persistentStore.read("holi_csrf_token");
const CF_CLEARANCE = $persistentStore.read("holi_cf_clearance");

if (!ACCESS_TOKEN || !CSRF_TOKEN || !CF_CLEARANCE) {
  $notification.post("Holivator 签到", "⚠️ 未配置 Cookie", "请先运行 holivator_setup.js");
  $done();
}

const BASE_URL = "https://holivator.de";

const headers = {
  "accept": "*/*",
  "sec-fetch-site": "same-origin",
  "origin": BASE_URL,
  "x-csrf-token": CSRF_TOKEN,
  "content-length": "0",
  "sec-fetch-mode": "cors",
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
  "referer": BASE_URL + "/portal",
  "sec-fetch-dest": "empty",
  "authorization": "Bearer " + ACCESS_TOKEN,
  "accept-language": "zh-CN,zh-Hans;q=0.9",
  "cookie": `access_token=${ACCESS_TOKEN}; cf_clearance=${CF_CLEARANCE}; csrf_token=${CSRF_TOKEN}`
};

$httpClient.post({
  url: BASE_URL + "/api/v1/user/checkin",
  headers: headers,
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
    } else if (response.status === 400) {
      $notification.post("Holivator 签到", "📅 今日已签到", "无需重复签到");
    } else if (response.status === 401) {
      $notification.post("Holivator 签到", "🔑 Cookie 已过期", "请重新运行 setup 脚本更新 Cookie");
    } else {
      $notification.post(
        "Holivator 签到",
        "⚠️ 签到异常",
        `状态码: ${response.status}`
      );
    }
  } catch (e) {
    $notification.post("Holivator 签到", "⚠️ 响应解析失败", data);
  }

  $done();
});