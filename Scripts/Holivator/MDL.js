/**
 * MDL 签到脚本
 * 兼容 Surge / Loon / Quantumult X
 *
 * Surge / Loon:
 * [Script]
 * MDL签到 = type=cron,cronexp="0 8 * * *",script-path=https://你的链接/gyq_saodu6_checkin.js,timeout=60
 *
 * Quantumult X:
 * [task_local]
 * 0 8 * * * https://你的链接/gyq_saodu6_checkin.js, tag=MDL签到, enabled=true
 */

const $ = new Env("MDL签到");

const BASE_URL = "https://gyq.saodu6.wang:19999";
const USERNAME = $.getdata("gyq_username");
const PASSWORD = $.getdata("gyq_password");

!(async () => {
  if (!USERNAME || !PASSWORD) {
    $.msg("MDL签到", "❌ 未配置账号", "请在 BoxJS 中填写用户名和密码");
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

    const loginData = safeJson(loginResp.body);
    if (!loginData || loginData.status !== "success") {
      $.msg("MDL签到", "❌ 登录失败", loginData?.message || loginResp.body);
      $.done();
      return;
    }

    // 提取 Cookie
    const cookie = extractCookie(loginResp.headers);
    if (!cookie) {
      $.msg("MDL签到", "❌ 获取 Cookie 失败", "未找到 session_id");
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

    const infoData = safeJson(infoResp.body);
    if (!infoData || infoData.status !== "success") {
      $.msg("MDL签到", "❌ 获取积分信息失败", infoResp.body);
      $.done();
      return;
    }

    const { points, has_checked_in } = infoData.data;

    // 今日已签到：用签到前存的积分快照算出今日获得
    if (has_checked_in) {
      const pointsBefore = parseInt($.getdata("gyq_points_before") || "0");
      const earned = pointsBefore > 0 ? points - pointsBefore : "?";
      $.msg(
        "MDL签到",
        "ℹ️ 今日已签到",
        earned !== "?" ? `今日获得：+${earned} 积分\n当前积分：${points}` : `当前积分：${points}`
      );
      $.done();
      return;
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
        "User-Agent": "Mozilla/5.0",
        "Accept": "*/*",
        "Referer": `${BASE_URL}/?tab=profile`,
      },
      body: "{}",
    });

    const checkinData = safeJson(checkinResp.body);

    if (checkinData && checkinData.status === "success") {
      // 优先用接口返回的 earned，否则查一次新积分做差
      let earned = checkinData.data?.points_earned;
      let total  = checkinData.data?.total_points;

      if (!earned || !total) {
        // 接口没返回明细，再查一次积分
        const infoResp2 = await request({
          method: "GET",
          url: `${BASE_URL}/api/user/points/info`,
          headers: { "Cookie": cookie, "User-Agent": "Mozilla/5.0", "Accept": "*/*" },
        });
        const infoData2 = safeJson(infoResp2.body);
        total  = infoData2?.data?.points ?? "?";
        earned = total !== "?" ? total - points : "?";
      }

      $.msg(
        "MDL签到",
        "✅ 签到成功",
        `今日获得：+${earned} 积分\n当前积分：${total}`
      );
    } else {
      $.msg("MDL签到", "⚠️ 签到失败", checkinResp.body);
    }

  } catch (e) {
    console.log("异常:", e);
    $.msg("MDL签到", "❌ 脚本异常", e.message || String(e));
  }

  $.done();
})();

// ─── 工具函数 ────────────────────────────────────────────

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