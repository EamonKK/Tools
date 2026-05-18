/**
 * Holivator 每日签到 + 积分兑换经验值 合并脚本
 * 执行顺序：随机延迟 → 登录 → 签到 → 兑换积分
 * 支持 Surge / Loon / QX
 * 支持 BoxJS 配置账号密码
 *
 * 特性：
 *   - 随机延迟 0~20 分钟后执行（规避风控）
 *   - 签到失败自动重试，最多 5 次，斐波那契退避（5s→13s→21s→34s→55s）
 *   - 签到完成后自动将全部积分兑换为经验值
 *
 * ========== Surge 配置 ==========
 * [Script]
 * holivator-all = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_all_in_one.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const BASE_URL      = 'https://holivator.de';
const USERNAME_KEY  = 'holi_username';
const PASSWORD_KEY  = 'holi_password';

const MAX_DELAY_MS    = 10 * 60 * 1000;          // 随机延迟上限：10 分钟
const MAX_RETRIES     = 5;                        // 签到最大重试次数
const RETRY_DELAYS_MS = [5000, 13000, 21000, 34000, 55000]; // 斐波那契退避
const MIN_POINTS      = 10;                       // 兑换最低积分门槛

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

function authHeaders(token, referer) {
  return {
    'accept':          '*/*',
    'accept-language': 'zh-CN,zh-Hans;q=0.9',
    'authorization':   `Bearer ${token}`,
    'user-agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
    'origin':          BASE_URL,
    'referer':         referer || `${BASE_URL}/portal`,
    'sec-fetch-dest':  'empty',
    'sec-fetch-mode':  'cors',
    'sec-fetch-site':  'same-origin'
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withRetry(fn, retries, attempt) {
  retries = retries !== undefined ? retries : MAX_RETRIES;
  attempt = attempt || 0;
  return fn().catch(err => {
    if (err && err.__noRetry) return Promise.reject(err);
    if (retries <= 0)         return Promise.reject(err);
    const delay = RETRY_DELAYS_MS[attempt] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const msg   = (err && (err.error || err.message)) ? (err.error || err.message) : String(err);
    Env.notify(
      'Holivator',
      `⚠️ 第 ${attempt + 1} 次失败，剩余 ${retries} 次重试`,
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
  Env.notify(title, subTitle, String(message || ''));
  Env.done({});
}

// ─── 步骤1：登录，返回 accessToken ───────────────────────────────────────────

function doLogin(username, password) {
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
  }).then(resp => {
    const body        = parseBody(resp.body);
    const accessToken = (body.data && body.data.access_token) || '';
    if (!accessToken) {
      finish('Holivator', '❌ 登录失败', `未获取到 token\n${resp.body}`);
      return Promise.reject({ __noRetry: true });
    }
    Env.write(accessToken, 'holi_access_token');
    return accessToken;
  });
}

// ─── 步骤2：签到，返回签到结果摘要 ───────────────────────────────────────────

function doCheckin(accessToken) {
  return Env.request({
    url:    `${BASE_URL}/api/v1/user/checkin`,
    method: 'POST',
    headers: Object.assign({}, authHeaders(accessToken), { 'content-length': '0' }),
    body:   ''
  }).then(resp => {
    const checkinOk   = [200, 201, 400, 403].includes(resp.status);
    const alreadyDone = resp.status === 400 || resp.status === 403;

    if (!checkinOk) {
      throw new Error(`签到状态码异常: ${resp.status}\n${resp.body}`);
    }

    // 查询签到状态获取积分详情
    return Env.request({
      url:    `${BASE_URL}/api/v1/user/checkin/status`,
      method: 'GET',
      headers: authHeaders(accessToken)
    }).then(resp2 => {
      const data   = parseBody(resp2.body).data || {};
      const points = data.today_points        || '';
      const streak = data.streak              || '';
      const total  = data.total_points_earned || '';

      const lines = [
        points ? `今日获得 ${points} 积分` : '',
        streak ? `🔥 连续 ${streak} 天`   : '',
        total  ? `累计 ${total} 积分`      : ''
      ].filter(Boolean);

      const checkinLabel = alreadyDone ? '📅 今日已签到' : '✅ 签到成功！';
      Env.notify('Holivator 签到', checkinLabel, lines.join('\n') || '签到完成');

      return accessToken; // 传递 token 给下一步
    });
  });
}

// ─── 步骤3：查询积分并一次性全部兑换 ─────────────────────────────────────────

function doExchange(accessToken) {
  return Env.request({
    url:    `${BASE_URL}/api/v1/user/exp/info`,
    method: 'GET',
    headers: authHeaders(accessToken, `${BASE_URL}/portal/growth`)
  }).then(resp => {
    const infoData       = parseBody(resp.body).data || {};
    const pointsBalance  = infoData.points_balance   || 0;
    const remainingToday = infoData.remaining_today  !== undefined ? infoData.remaining_today : 50000;
    const exchangePoints = Math.min(pointsBalance, remainingToday);

    if (exchangePoints < MIN_POINTS) {
      finish(
        'Holivator 兑换',
        '💤 积分不足，跳过兑换',
        `当前积分 ${pointsBalance}，最少需要 ${MIN_POINTS} 积分`
      );
      return;
    }

    Env.notify('Holivator 兑换', '开始兑换', `积分余额 ${pointsBalance}，兑换 ${exchangePoints} 积分`);

    const csrfToken = Env.read('holi_csrf_token') || '';

    return Env.request({
      url:    `${BASE_URL}/api/v1/user/exp/exchange`,
      method: 'POST',
      headers: Object.assign({}, authHeaders(accessToken, `${BASE_URL}/portal/growth`), {
        'accept':        'application/json',
        'content-type':  'application/json',
        'x-csrf-token':  csrfToken
      }),
      body: JSON.stringify({ points: exchangePoints })
    }).then(exchResp => {
      const result = parseBody(exchResp.body);
      if (exchResp.status === 200 && result.code === 0) {
        const data = result.data || {};
        const msg  = [
          `消耗 ${data.points_spent || ''} 积分`,
          `获得 ${data.exp_gained   || ''} 经验值`,
          `当前等级 Lv.${data.new_level || ''}`,
          `剩余积分 0`
        ].filter(Boolean).join('\n');
        finish('Holivator 兑换', '✅ 全部兑换成功！', msg);
      } else {
        finish('Holivator 兑换', '⚠️ 兑换失败', result.message || `状态码: ${exchResp.status}\n${exchResp.body}`);
      }
    });
  });
}

// ─── 主流程：登录 → 签到（含重试）→ 兑换 ────────────────────────────────────

const username = String(Env.read(USERNAME_KEY) || '').trim();
const password = String(Env.read(PASSWORD_KEY) || '').trim();

if (!username || !password) {
  finish('Holivator', '⚠️ 未配置账号', '请在 BoxJS 中填写用户名和密码');
} else {
  const delayMs  = Math.floor(Math.random() * (MAX_DELAY_MS + 1));
  const delayMin = (delayMs / 60000).toFixed(1);

  Env.notify(
    'Holivator',
    `⏱ 随机延迟 ${delayMin} 分钟`,
    `账号：${maskAccount(username)}`
  );

  sleep(delayMs)
    .then(() => withRetry(() =>
      doLogin(username, password)
        .then(token => doCheckin(token))
        .then(token => doExchange(token))
    ))
    .catch(err => {
      if (err && err.__noRetry) return; // 业务错误已由 finish() 处理
      const errMsg = (err && (err.error || err.message))
        ? (err.error || err.message)
        : String(err);
      finish('Holivator', `❌ 重试 ${MAX_RETRIES} 次后仍失败`, errMsg);
    });