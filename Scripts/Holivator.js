/**
 * Holivator 每日签到脚本 Pro
 * 支持 Surge / Loon / QX
 * 支持 BoxJS 配置账号密码
 *
 * 新增特性：
 *   - 随机延迟 0~20 分钟后执行签到（规避风控）
 *   - 失败自动重试，最多 5 次，斐波那契退避间隔（5s→13s→21s→34s→55s）
 *
 * ========== Surge 配置 ==========
 * [Script]
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin_pro.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const BASE_URL     = 'https://holivator.de';
const USERNAME_KEY = 'holi_username';
const PASSWORD_KEY = 'holi_password';

// 随机延迟上限（毫秒），默认 20 分钟
const MAX_DELAY_MS  = 20 * 60 * 1000;
// 最大重试次数（不含首次）
const MAX_RETRIES = 5;
// 斐波那契退避间隔表（毫秒）：5s → 13s → 21s → 34s → 55s
const RETRY_DELAYS_MS = [5000, 13000, 21000, 34000, 55000];

// ─── 环境适配层 ───────────────────────────────────────────────────────────────

const Env = (() => {
  const isQX   = typeof $task !== 'undefined' && typeof $prefs !== 'undefined';
  const isLoon = typeof $loon !== 'undefined'
    || (typeof $httpClient       !== 'undefined'
      && typeof $persistentStore !== 'undefined'
      && typeof $environment     === 'undefined');
  const isSurge = typeof $httpClient       !== 'undefined'
    && typeof $persistentStore !== 'undefined'
    && typeof $loon            === 'undefined';

  function read(key) {
    if (isQX)              return $prefs.valueForKey(key) || '';
    if (isSurge || isLoon) return $persistentStore.read(key) || '';
    return '';
  }

  function write(val, key) {
    if (isQX)              return $prefs.setValueForKey(val, key);
    if (isSurge || isLoon) return $persistentStore.write(val, key);
  }

  function notify(title, subTitle, message) {
    const t = String(title    || '');
    const s = String(subTitle || '');
    const m = String(message  || '');
    if (typeof $notify !== 'undefined') { $notify(t, s, m); return; }
    if (typeof $notification !== 'undefined'
      && typeof $notification.post === 'function') { $notification.post(t, s, m); return; }
  }

  function done(value) {
    if (typeof $done !== 'undefined') $done(value || {});
  }

  function request(options) {
    if (isQX) {
      return $task.fetch(options).then(resp => ({
        status:  resp.statusCode || resp.status,
        headers: resp.headers    || {},
        body:    resp.body       || ''
      }));
    }
    return new Promise((resolve, reject) => {
      const method = String(options.method || 'GET').toUpperCase();
      const cb = (err, resp, body) => {
        if (err) return reject(err);
        resolve({
          status:  resp && (resp.status || resp.statusCode),
          headers: (resp && resp.headers) || {},
          body:    body || ''
        });
      };
      if (method === 'POST') $httpClient.post(options, cb);
      else                   $httpClient.get(options, cb);
    });
  }

  return { isQX, isSurge, isLoon, read, write, notify, done, request };
})();

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function parseBody(body) {
  try   { return JSON.parse(body || '{}'); }
  catch { return {}; }
}

function maskAccount(v) {
  const s = String(v || '').trim();
  if (!s)            return '';
  if (s.length <= 4) return s[0] + '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}

function authHeaders(token) {
  return {
    'accept':          '*/*',
    'accept-language': 'zh-CN,zh-Hans;q=0.9',
    'authorization':   `Bearer ${token}`,
    'user-agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
    'origin':          BASE_URL,
    'referer':         `${BASE_URL}/portal`,
    'sec-fetch-dest':  'empty',
    'sec-fetch-mode':  'cors',
    'sec-fetch-site':  'same-origin'
  };
}

/** 返回一个在指定毫秒后 resolve 的 Promise */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带斐波那契退避的重试包装器（5s→13s→21s→34s→55s）
 * @param {() => Promise} fn      - 要执行的异步操作
 * @param {number}        retries - 剩余重试次数
 * @param {number}        attempt - 当前是第几次尝试（从 0 开始）
 */
function withRetry(fn, retries, attempt) {
  retries = retries !== undefined ? retries : MAX_RETRIES;
  attempt = attempt || 0;

  return fn().catch(err => {
    if (retries <= 0) return Promise.reject(err);

    const delay = RETRY_DELAYS_MS[attempt] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const msg   = (err && (err.error || err.message)) ? (err.error || err.message) : String(err);
    const left  = retries;

    Env.notify(
      'Holivator 签到',
      `⚠️ 第 ${attempt + 1} 次失败，${left} 次重试机会`,
      `${msg}\n${(delay / 1000).toFixed(0)}s 后重试…`
    );

    return sleep(delay).then(() => withRetry(fn, retries - 1, attempt + 1));
  });
}

// ─── 流程控制 ─────────────────────────────────────────────────────────────────

let finished = false;

function finish(title, subTitle, message) {
  if (finished) return;
  finished = true;
  Env.notify(title, subTitle, message);
  Env.done({});
}

// ─── 核心签到逻辑 ─────────────────────────────────────────────────────────────

/**
 * 完整执行一次登录 → 签到 → 查询状态的流程。
 * 任何网络层错误会向上抛出，由 withRetry 捕获后重试。
 * 业务层错误（登录失败、签到异常）直接调用 finish() 终止。
 */
function doCheckin(username, password) {
  // 第一步：登录
  return Env.request({
    url:    `${BASE_URL}/api/v1/auth/login`,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept':       'application/json',
      'user-agent':   'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
      'origin':       BASE_URL,
      'referer':      `${BASE_URL}/login`
    },
    body: JSON.stringify({ username, password })
  })

  // 第二步：签到
  .then(resp => {
    const body        = parseBody(resp.body);
    const accessToken = (body.data && body.data.access_token) || '';

    if (!accessToken) {
      // 业务错误——直接结束，不重试
      finish('Holivator 签到', '❌ 登录失败', `未获取到 token\n${resp.body}`);
      return Promise.reject({ __noRetry: true });
    }

    Env.write(accessToken, 'holi_access_token');

    return Env.request({
      url:    `${BASE_URL}/api/v1/user/checkin`,
      method: 'POST',
      headers: Object.assign({}, authHeaders(accessToken), { 'content-length': '0' }),
      body:   ''
    }).then(resp2 => ({ resp2, accessToken }));
  })

  // 第三步：查询签到状态获取积分
  .then(result => {
    if (!result) return;

    const { resp2, accessToken } = result;
    const checkinOk   = [200, 201, 400, 403].includes(resp2.status);
    const alreadyDone = resp2.status === 400 || resp2.status === 403;

    if (!checkinOk) {
      // 非预期状态码——抛出让重试机制处理
      throw new Error(`签到状态码异常: ${resp2.status}\n${resp2.body}`);
    }

    return Env.request({
      url:    `${BASE_URL}/api/v1/user/checkin/status`,
      method: 'GET',
      headers: authHeaders(accessToken)
    }).then(resp3 => {
      const data   = parseBody(resp3.body).data || {};
      const points = data.today_points        || '';
      const streak = data.streak              || '';
      const total  = data.total_points_earned || '';

      const msg = [
        points ? `今日获得 ${points} 积分` : '',
        streak ? `🔥 连续 ${streak} 天`   : '',
        total  ? `累计 ${total} 积分`      : ''
      ].filter(Boolean).join('\n');

      if (alreadyDone) {
        finish('Holivator 签到', '📅 今日已签到', msg || '无需重复签到');
      } else {
        finish('Holivator 签到', '✅ 签到成功！', msg || '签到完成');
      }
    });
  });
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

const username = Env.read(USERNAME_KEY);
const password = Env.read(PASSWORD_KEY);

if (!username || !password) {
  finish('Holivator 签到', '⚠️ 未配置账号', '请在 BoxJS 中填写用户名和密码');
} else {
  // 随机延迟 0 ~ MAX_DELAY_MS
  const delayMs  = Math.floor(Math.random() * (MAX_DELAY_MS + 1));
  const delayMin = (delayMs / 60000).toFixed(1);

  Env.notify(
    'Holivator 签到',
    `⏱ 随机延迟 ${delayMin} 分钟`,
    `账号：${maskAccount(username)}`
  );

  sleep(delayMs)
    .then(() => withRetry(() => doCheckin(username, password)))
    .catch(err => {
      // __noRetry 标记：业务层已 finish()，无需再通知
      if (err && err.__noRetry) return;
      const errMsg = (err && (err.error || err.message))
        ? (err.error || err.message)
        : String(err);
      finish('Holivator 签到', `❌ 重试 ${MAX_RETRIES} 次后仍失败`, errMsg);
    });
}