/**
 * gyq.saodu6.wang 签到脚本
 * 
 * BoxJS 订阅：将下方 JSON 保存为 .json 文件并添加到 BoxJS 订阅
 * 
 * Surge / Loon / Shadowrocket 配置：
 * [Script]
 * gyq签到 = type=cron,cronexp="0 8 * * *",script-path=gyq_saodu6_checkin.js,timeout=60
 * 
 * Quantumult X 配置：
 * [task_local]
 * 0 8 * * * gyq_saodu6_checkin.js, tag=gyq签到, enabled=true
 */

const $ = new Env("gyq签到");

// BoxJS 存储 key
const BOXJS_KEY_USER = "gyq_username";
const BOXJS_KEY_PASS = "gyq_password";

const BASE_URL = "https://gyq.saodu6.wang:19999";

!(async () => {
  const username = $.getdata(BOXJS_KEY_USER);
  const password = $.getdata(BOXJS_KEY_PASS);

  if (!username || !password) {
    $.msg("gyq签到", "❌ 未配置账号", "请在 BoxJS 中填写用户名和密码");
    return;
  }

  try {
    // Step 1: 登录
    const loginResp = await http_post(`${BASE_URL}/api/requests/auth`, {
      username,
      password,
    });

    const loginData = JSON.parse(loginResp.body);
    if (loginData.status !== "success") {
      $.msg("gyq签到", "❌ 登录失败", loginData.message || JSON.stringify(loginData));
      return;
    }

    // 提取 session cookie
    const cookie = getCookie(loginResp.headers);
    if (!cookie) {
      $.msg("gyq签到", "❌ 获取 Cookie 失败", "登录后未找到 session_id");
      return;
    }

    // Step 2: 检查是否已签到
    const infoResp = await http_get(`${BASE_URL}/api/user/points/info`, cookie);
    const infoData = JSON.parse(infoResp.body);

    if (infoData.status !== "success") {
      $.msg("gyq签到", "❌ 获取积分信息失败", JSON.stringify(infoData));
      return;
    }

    const { points, has_checked_in } = infoData.data;

    if (has_checked_in) {
      $.msg("gyq签到", "ℹ️ 今日已签到", `当前积分：${points}`);
      return;
    }

    // Step 3: 执行签到
    const checkinResp = await http_post_cookie(`${BASE_URL}/api/user/points/checkin`, cookie);
    const checkinData = JSON.parse(checkinResp.body);

    if (checkinData.status === "success") {
      const earned = checkinData.data?.points_earned ?? "?";
      const total  = checkinData.data?.total_points  ?? "?";
      $.msg("gyq签到", "✅ 签到成功", `获得积分：${earned}\n累计积分：${total}`);
    } else {
      $.msg("gyq签到", "⚠️ 签到失败", JSON.stringify(checkinData));
    }
  } catch (e) {
    $.msg("gyq签到", "❌ 脚本异常", e.message || String(e));
  } finally {
    $.done();
  }
})();

// ─── 工具函数 ───────────────────────────────────────────

function getCookie(headers) {
  // 兼容 Surge / QX / Loon 的 headers 格式
  const setCookie =
    headers?.["set-cookie"] ||
    headers?.["Set-Cookie"] ||
    (Array.isArray(headers)
      ? headers.find((h) => h.name?.toLowerCase() === "set-cookie")?.value
      : null);
  if (!setCookie) return null;
  const match = (Array.isArray(setCookie) ? setCookie.join(";") : setCookie).match(
    /session_id=[^;]+/
  );
  return match ? match[0] : null;
}

function http_post(url, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      url,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
      body: JSON.stringify(body),
    };
    $.post(opts, (err, resp) => (err ? reject(err) : resolve(resp)));
  });
}

function http_get(url, cookie) {
  return new Promise((resolve, reject) => {
    const opts = {
      url,
      headers: {
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
    };
    $.get(opts, (err, resp) => (err ? reject(err) : resolve(resp)));
  });
}

function http_post_cookie(url, cookie) {
  return new Promise((resolve, reject) => {
    const opts = {
      url,
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        Accept: "*/*",
      },
      body: "{}",
    };
    $.post(opts, (err, resp) => (err ? reject(err) : resolve(resp)));
  });
}

// ─── Env 类（兼容 Surge / QX / Loon / Node）───────────────

function Env(name) {
  this.name = name;
  this.isQX = typeof $task !== "undefined";
  this.isLoon = typeof $loon !== "undefined";
  this.isSurge = typeof $httpClient !== "undefined" && !this.isLoon;
  this.isNode = typeof require === "function";

  this.getdata = (key) => {
    if (this.isQX) return $prefs.valueForKey(key);
    if (this.isLoon || this.isSurge) return $persistentStore.read(key);
    if (this.isNode) {
      // Node 环境下从 process.env 读取（方便测试）
      return process.env[key] || null;
    }
    return null;
  };

  this.setdata = (val, key) => {
    if (this.isQX) return $prefs.setValueForKey(val, key);
    if (this.isLoon || this.isSurge) return $persistentStore.write(val, key);
    return false;
  };

  this.msg = (title, subtitle, body) => {
    if (this.isQX) $notify(title, subtitle, body);
    else if (this.isLoon || this.isSurge) $notification.post(title, subtitle, body);
    else console.log(`[${title}] ${subtitle} ${body}`);
  };

  this.get = this.isQX
    ? (opts, cb) => $task.fetch({ method: "GET", ...opts }).then((r) => cb(null, r)).catch(cb)
    : this.isSurge || this.isLoon
    ? (opts, cb) => $httpClient.get(opts, cb)
    : (opts, cb) => {
        const https = require("https");
        const u = new URL(opts.url);
        const req = https.request(
          { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: "GET",
            headers: opts.headers, rejectUnauthorized: false },
          (res) => { let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => cb(null, { status: res.statusCode, headers: res.headers, body: b })); }
        );
        req.on("error", cb); req.end();
      };

  this.post = this.isQX
    ? (opts, cb) => $task.fetch({ method: "POST", ...opts }).then((r) => cb(null, r)).catch(cb)
    : this.isSurge || this.isLoon
    ? (opts, cb) => $httpClient.post(opts, cb)
    : (opts, cb) => {
        const https = require("https");
        const u = new URL(opts.url);
        const data = opts.body || "";
        const req = https.request(
          { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: "POST",
            headers: { ...opts.headers, "Content-Length": Buffer.byteLength(data) }, rejectUnauthorized: false },
          (res) => { let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => cb(null, { status: res.statusCode, headers: res.headers, body: b })); }
        );
        req.on("error", cb); req.write(data); req.end();
      };

  this.done = () => {
    if (this.isQX || this.isLoon || this.isSurge) $done({});
  };
}