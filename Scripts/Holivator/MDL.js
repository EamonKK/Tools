/**
 * MDL 签到脚本
 * 兼容 Surge / Loon / Quantumult X
 *
 * Surge / Loon:
 * [Script]
 * gyq签到 = type=cron,cronexp="0 8 * * *",script-path=https://你的链接/gyq_saodu6_checkin.js,timeout=60
 *
 * Quantumult X:
 * [task_local]
 * 0 8 * * * https://你的链接/gyq_saodu6_checkin.js, tag=gyq签到, enabled=true
 */

const $ = new Env("MDL签到");

const BASE_URL = "https://gyq.saodu6.wang:19999";
const USERNAME = $.getdata("gyq_username");
const PASSWORD = $.getdata("gyq_password");

!(async () => {
  if (!USERNAME || !PASSWORD) {
    $.msg("gyq签到", "❌ 未配置账号", "请在 BoxJS 中填写用户名和密码");
    $.done();
    return;
  }

  try {
    // Step 1: 登录
    const loginResp = await request({
      method: "POST",
      url: `${BASE_URL}/api/requests/auth`,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": `${BASE_URL}/?tab=profile`,
      },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });

    console.log("登录响应:", loginResp.body);
    const loginData = safeJson(loginResp.body);
    if (!loginData || loginData.status !== "success") {
      $.msg("gyq签到", "❌ 登录失败", loginData?.message || loginResp.body);
      $.done();
      return;
    }

    // 提取 Cookie
    const cookie = extractCookie(loginResp.headers);
    console.log("Cookie:", cookie);
    if (!cookie) {
      $.msg("gyq签到", "❌ 获取 Cookie 失败", "未找到 session_id");
      $.done();
      return;
    }

    // Step 2: 查询积分/签到状态
    const infoResp = await request({
      method: "GET",
      url: `${BASE_URL}/api/user/points/info`,
      headers: {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": `${BASE_URL}/?tab=profile`,
      },
    });

    console.log("积分信息:", infoResp.body);
    const infoData = safeJson(infoResp.body);
    if (!infoData || infoData.status !== "success") {
      $.msg("gyq签到", "❌ 获取积分信息失败", infoResp.body);
      $.done();
      return;
    }

    const { points, has_checked_in } = infoData.data;
    if (has_checked_in) {
      $.msg("gyq签到", "ℹ️ 今日已签到", `当前积分：${points}`);
      $.done();
      return;
    }

    // Step 3: 执行签到
    const checkinResp = await request({
      method: "POST",
      url: `${BASE_URL}/api/user/points/checkin`,
      headers: {
        "Cookie": cookie,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": `${BASE_URL}/?tab=profile`,
      },
      body: "{}",
    });

    console.log("签到响应:", checkinResp.body);
    const checkinData = safeJson(checkinResp.body);
    if (checkinData && checkinData.status === "success") {
      const earned = checkinData.data?.points_earned ?? "?";
      const total  = checkinData.data?.total_points  ?? points;
      $.msg("gyq签到", "✅ 签到成功", `获得积分：${earned}\n累计积分：${total}`);
    } else {
      $.msg("gyq签到", "⚠️ 签到失败", checkinResp.body || JSON.stringify(checkinData));
    }
  } catch (e) {
    console.log("异常:", e);
    $.msg("gyq签到", "❌ 脚本异常", e.message || String(e));
  }

  $.done();
})();

// ─── 工具函数 ────────────────────────────────────────────

function safeJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function extractCookie(headers) {
  if (!headers) return null;
  // Surge: headers 是对象，set-cookie 可能是字符串或数组
  // QX:    headers 是对象
  // Loon:  同 Surge
  let raw = headers["set-cookie"] || headers["Set-Cookie"] || "";
  if (Array.isArray(raw)) raw = raw.join("; ");
  const m = raw.match(/session_id=[^;]+/);
  return m ? m[0] : null;
}

// 统一请求函数，兼容 Surge / Loon / QX
function request(opts) {
  return new Promise((resolve, reject) => {
    const isQX   = typeof $task !== "undefined";
    const isSurge = typeof $httpClient !== "undefined";

    if (isQX) {
      $task.fetch({
        method: opts.method,
        url: opts.url,
        headers: opts.headers,
        body: opts.body,
      }).then(resp => resolve({ body: resp.body, headers: resp.headers, status: resp.statusCode }))
        .catch(reject);
    } else if (isSurge) {
      const fn = opts.method === "POST" ? $httpClient.post : $httpClient.get;
      fn({
        url: opts.url,
        headers: opts.headers,
        body: opts.body,
      }, (err, resp, body) => {
        if (err) return reject(new Error(err));
        resolve({ body, headers: resp.headers, status: resp.status });
      });
    } else {
      reject(new Error("不支持的运行环境"));
    }
  });
}

// ─── Env 类 ──────────────────────────────────────────────

function Env(name) {
  this.name = name;
  const isQX    = typeof $task !== "undefined";
  const isSurge = typeof $httpClient !== "undefined";

  this.getdata = (key) => {
    if (isQX)    return $prefs.valueForKey(key);
    if (isSurge) return $persistentStore.read(key);
    return null;
  };

  this.msg = (title, subtitle, body) => {
    if (isQX)    $notify(title, subtitle, body);
    if (isSurge) $notification.post(title, subtitle, body);
  };

  this.done = () => {
    if (isQX || isSurge) $done({});
  };
}