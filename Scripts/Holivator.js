/**
 * Holivator 自动登录签到脚本
 * 支持 BoxJS 配置账号密码
 *
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const BASE_URL = "https://holivator.de";

const username = $persistentStore.read("holi_username");
const password = $persistentStore.read("holi_password");

if (!username || !password) {
  $notification.post(
    "Holivator 签到",
    "⚠️ 未配置账号密码",
    "请在 BoxJS 中填写 Holivator 账号密码"
  );
  $done();
}

// 第一步：登录
$httpClient.post({
  url: BASE_URL + "/api/v1/auth/login",
  headers: {
    "content-type": "application/json",
    "accept": "application/json",
    "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
    "origin": BASE_URL,
    "referer": BASE_URL + "/login"
  },
  body: JSON.stringify({ username: username, password: password })
}, function(error, response, data) {
  if (error) {
    $notification.post("Holivator 签到", "❌ 登录失败", error);
    $done();
    return;
  }

  var accessToken = "";
  var csrfToken = "";
  var cfClearance = $persistentStore.read("holi_cf_clearance") || "";

  // 从 set-cookie 提取 token
  var cookies = response.headers["Set-Cookie"] || response.headers["set-cookie"] || "";
  var cookieStr = Array.isArray(cookies) ? cookies.join("; ") : cookies;

  var tokenMatch = cookieStr.match(/access_token=([^;,\s]+)/);
  var csrfMatch = cookieStr.match(/csrf_token=([^;,\s]+)/);

  if (tokenMatch) accessToken = tokenMatch[1];
  if (csrfMatch) csrfToken = csrfMatch[1];

  // 也尝试从 body 提取
  if (!accessToken) {
    try {
      var body = JSON.parse(data);
      accessToken = (body.data && (body.data.token || body.data.access_token)) || body.token || body.access_token || "";
    } catch(e) {}
  }

  if (!accessToken) {
    $notification.post("Holivator 签到", "❌ 登录失败", "未获取到 token，请检查账号密码");
    $done();
    return;
  }

  // 保存 token
  $persistentStore.write(accessToken, "holi_access_token");
  if (csrfToken) $persistentStore.write(csrfToken, "holi_csrf_token");

  // 第二步：签到
  $httpClient.post({
    url: BASE_URL + "/api/v1/user/checkin",
    headers: {
      "accept": "*/*",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh-Hans;q=0.9",
      "authorization": "Bearer " + accessToken,
      "content-length": "0",
      "cookie": "access_token=" + accessToken + "; cf_clearance=" + cfClearance + "; csrf_token=" + csrfToken,
      "origin": BASE_URL,
      "referer": BASE_URL + "/portal",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
      "x-csrf-token": csrfToken
    },
    body: ""
  }, function(error2, response2, data2) {
    if (error2) {
      $notification.post("Holivator 签到", "❌ 签到请求失败", error2);
      $done();
      return;
    }

    try {
      var result = JSON.parse(data2);
      if (response2.status === 200 || response2.status === 201) {
        var points = (result.data && result.data.points) || result.points || "";
        $notification.post(
          "Holivator 签到",
          "✅ 签到成功！",
          points ? ("获得 " + points + " 积分") : "签到完成"
        );
      } else if (response2.status === 400 || response2.status === 403) {
        $notification.post("Holivator 签到", "📅 今日已签到", "无需重复签到");
      } else {
        $notification.post("Holivator 签到", "⚠️ 签到异常", "状态码: " + response2.status + "\n" + data2);
      }
    } catch(e) {
      $notification.post("Holivator 签到", "⚠️ 响应解析失败", data2);
    }

    $done();
  });
});