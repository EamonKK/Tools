/**
 * gyq.saodu6.wang 签到脚本
 * 兼容 Surge / Loon / Quantumult X
 *
 * Surge / Loon:
 * [Script]
 * MDL签到 = type=cron,cronexp="0 8 * * *",script-path=https://你的链接/gyq_saodu6_checkin.js,timeout=700
 *
 * Quantumult X:
 * [task_local]
 * 0 8 * * * https://你的链接/gyq_saodu6_checkin.js, tag=MDL签到, enabled=true
 */

const $ = new Env("MDL签到");

const BASE_URL   = "https://gyq.saodu6.wang:19999";
const USERNAME   = $.getdata("gyq_username");
const PASSWORD   = $.getdata("gyq_password");
const MAX_RETRY  = 5;          // 最多重试次数
const RETRY_GAP  = 30 * 1000; // 每次重试间隔 30 秒

// 随机从 Safari / Chrome UA 池中选一个
const UA_POOL = [
  // iPhone Safari
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3.2 Mobile/15E148 Safari/604.1",
  // Mac Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3.1 Safari/605.1.15",
];
const USER_AGENT = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];

!(async () => {
  if (!USERNAME || !PASSWORD) {
    $.msg("MDL签到", "❌ 未配置账号", "请在 BoxJS 中填写用户名和密码");
    $.done();
    return;
  }

  // 随机延迟 0~10 分钟
  const delay = Math.floor(Math.random() * 10 * 60 * 1000);
  console.log(`延迟 ${Math.round(delay / 1000)} 秒后签到...`);
  await sleep(delay);

  // 读取今日已重试次数（每天重置）
  const today        = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const retryKey     = "gyq_retry_date";
  const retryCount   = "gyq_retry_count";
  const savedDate    = $.getdata(retryKey) || "";
  let   tried        = savedDate === today ? parseInt($.getdata(retryCount) || "0") : 0;

  if (tried >= MAX_RETRY) {
    $.msg("MDL签到", "🚫 今日已达重试上限", `已连续失败 ${MAX_RETRY} 次，不再尝试`);
    $.done();
    return;
  }

  let lastErr = "";

  while (tried < MAX_RETRY) {
    try {
      const result = await doCheckin();

      if (result.ok) {
        // 签到成功或今日已签到，重置重试计数
        $.setdata(today, retryKey);
        $.setdata("0", retryCount);
        $.msg("MDL签到", result.subtitle, result.body);
        $.done();
        return;
      }

      // 业务失败（非异常），也算一次失败
      lastErr = result.body;
    } catch (e) {
      console.log(`第 ${tried + 1} 次失败:`, e);
      lastErr = e.message || String(e);
    }

    tried++;
    $.setdata(today, retryKey);
    $.setdata(String(tried), retryCount);
    console.log(`已失败 ${tried} 次，${tried < MAX_RETRY ? `${RETRY_GAP / 1000}秒后重试...` : "不再重试"}`);

    if (tried < MAX_RETRY) await sleep(RETRY_GAP);
  }

  $.msg("MDL签到", `🚫 签到失败（已重试 ${MAX_RETRY} 次）`, lastErr);
  $.done();
})();

// ─── 核心签到逻辑 ────────────────────────────────────────

async function doCheckin() {
  // Step 1: 登录
  const loginResp = await request({
    method: "POST",
    url: `${BASE_URL}/api/requests/auth`,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "Accept": "*/*",
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/?tab=profile`,
    },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });

  const loginData = safeJson(loginResp.body);
  if (!loginData || loginData.status !== "success") {
    return { ok: false, subtitle: "❌ 登录失败", body: loginData?.message || loginResp.body };
  }

  // 提取 Cookie
  const cookie = extractCookie(loginResp.headers);
  if (!cookie) {
    return { ok: false, subtitle: "❌ 获取 Cookie 失败", body: "未找到 session_id" };
  }

  // Step 2: 查询积分/签到状态
  const infoResp = await request({
    method: "GET",
    url: `${BASE_URL}/api/user/points/info`,
    headers: { "Cookie": cookie, "User-Agent": USER_AGENT, "Accept": "*/*", "Origin": BASE_URL, "Referer": `${BASE_URL}/?tab=profile` },
  });

  const infoData = safeJson(infoResp.body);
  if (!infoData || infoData.status !== "success") {
    return { ok: false, subtitle: "❌ 获取积分信息失败", body: infoResp.body };
  }

  const { points, has_checked_in } = infoData.data;

  // 今日已签到
  if (has_checked_in) {
    const pointsBefore = parseInt($.getdata("gyq_points_before") || "0");
    const earned = pointsBefore > 0 ? points - pointsBefore : "?";
    return {
      ok: true,
      subtitle: "ℹ️ 今日已签到",
      body: earned !== "?" ? `今日获得：+${earned} 积分\n当前积分：${points}` : `当前积分：${points}`,
    };
  }

  // Step 3: 记录签到前积分快照
  $.setdata(String(points), "gyq_points_before");

  // Step 4: 执行签到
  const checkinResp = await request({
    method: "POST",
    url: `${BASE_URL}/api/user/points/checkin`,
    headers: {
      "Cookie": cookie,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "Accept": "*/*",
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/?tab=profile`,
    },
    body: "{}",
  });

  const checkinData = safeJson(checkinResp.body);

  if (checkinData && checkinData.status === "success") {
    let earned = checkinData.data?.points_earned;
    let total  = checkinData.data?.total_points;

    if (!earned || !total) {
      const infoResp2 = await request({
        method: "GET",
        url: `${BASE_URL}/api/user/points/info`,
        headers: { "Cookie": cookie, "User-Agent": USER_AGENT, "Accept": "*/*" },
      });
      const infoData2 = safeJson(infoResp2.body);
      total  = infoData2?.data?.points ?? "?";
      earned = total !== "?" ? total - points : "?";
    }

    return {
      ok: true,
      subtitle: "✅ 签到成功",
      body: `今日获得：+${earned} 积分\n当前积分：${total}`,
    };
  }

  return { ok: false, subtitle: "⚠️ 签到失败", body: checkinResp.body };
}

// ─── 工具函数 ────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function safeJson(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function extractCookie(headers) {
  if (!headers) return null;
  let raw = headers["set-cookie"] || headers["Set-Cookie"] || "";
  if (Array.isArray(raw)) raw = raw.join("; ");
  const m = raw.match(/session_id=[^;]+/);
  return m ? m[0] : null;
}

function request(opts) {
  return new Promise((resolve, reject) => {
    const isQX    = typeof $task !== "undefined";
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
      fn({ url: opts.url, headers: opts.headers, body: opts.body },
        (err, resp, body) => {
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

  this.setdata = (val, key) => {
    if (isQX)    return $prefs.setValueForKey(val, key);
    if (isSurge) return $persistentStore.write(val, key);
  };

  this.msg = (title, subtitle, body) => {
    if (isQX)    $notify(title, subtitle, body);
    if (isSurge) $notification.post(title, subtitle, body);
  };

  this.done = () => {
    if (isQX || isSurge) $done({});
  };
}