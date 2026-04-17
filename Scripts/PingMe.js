// ===== PingMe Surge纯净版 =====

const scriptName = "PingMe";
const ckKey = "pingme_capture_v3";
const SECRET = "0fOiukQq7jXZV2GRi9LGlO";

const MAX_VIDEO = 5;
const VIDEO_DELAY = 8000;

// ===== 通知 =====
function notify(title, body) {
  $notification.post(scriptName, title, body);
}

// ===== 存储 =====
function getData(key) {
  return $persistentStore.read(key);
}

function setData(val, key) {
  return $persistentStore.write(val, key);
}

// ===== HTTP =====
function get(url, headers) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url, headers }, (err, resp, body) => {
      if (err) reject(err);
      else resolve({ status: resp.status, body });
    });
  });
}

// ===== 工具 =====
function parseQuery(url) {
  const q = url.split("?")[1] || "";
  const map = {};
  q.split("&").forEach(p => {
    const i = p.indexOf("=");
    if (i > 0) map[p.slice(0, i)] = p.slice(i + 1);
  });
  return map;
}

function getUTC() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

// ===== MD5（精简版）=====
function md5(str) {
  return require("crypto").createHash("md5").update(str).digest("hex");
}

// ===== 构造请求 =====
function buildParams(capture) {
  const p = {};
  Object.keys(capture.params).forEach(k => {
    if (k !== "sign" && k !== "signDate") p[k] = capture.params[k];
  });
  p.signDate = getUTC();
  const base = Object.keys(p).sort().map(k => `${k}=${p[k]}`).join("&");
  p.sign = md5(base + SECRET);
  return p;
}

function buildUrl(path, capture) {
  const p = buildParams(capture);
  const qs = Object.keys(p).map(k => `${k}=${encodeURIComponent(p[k])}`).join("&");
  return `https://api.pingmeapp.net/app/${path}?${qs}`;
}

// ===== 主逻辑 =====
if (typeof $request !== "undefined") {

  const capture = {
    params: parseQuery($request.url),
    headers: $request.headers
  };

  setData(JSON.stringify(capture), ckKey);

  notify("✅ 抓参成功", "打开一次即可长期使用");
  $done({});

} else {

  const raw = getData(ckKey);

  if (!raw) {
    notify("⚠️ 未抓参", "先打开 PingMe");
    $done();
  }

  const capture = JSON.parse(raw);
  const headers = capture.headers;
  const msgs = [];

  function api(path) {
    return get(buildUrl(path, capture), headers);
  }

  function videoLoop() {
    let i = 0;

    function next() {
      if (i >= MAX_VIDEO) return Promise.resolve();

      return new Promise(resolve => {
        setTimeout(() => {
          i++;

          api("videoBonus").then(res => {
            try {
              const d = JSON.parse(res.body);
              if (d.retcode === 0) {
                msgs.push(`🎬视频${i} +${d.result.bonus}`);
                resolve(next());
              } else {
                msgs.push(`⏸视频${i} ${d.retmsg}`);
                resolve();
              }
            } catch {
              msgs.push(`❌视频${i}解析失败`);
              resolve();
            }
          }).catch(() => {
            msgs.push(`❌视频${i}请求失败`);
            resolve();
          });

        }, i === 0 ? 1500 : VIDEO_DELAY);
      });
    }

    return next();
  }

  // ===== 执行流程 =====
  api("queryBalanceAndBonus")
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`💰余额：${d.result.balance}`);
      return api("checkIn");
    })
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`✅签到：${d.retmsg}`);
      return videoLoop();
    })
    .then(() => api("queryBalanceAndBonus"))
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`💰最新：${d.result.balance}`);

      notify("🎉任务完成", msgs.join("\n"));
      $done();
    })
    .catch(err => {
      notify("❌失败", String(err));
      $done();
    });
}