/**
 * Holivator 每日签到脚本
 * 按 cron 时间触发，5分钟内随机延迟执行
 * 失败自动重试最多5次
 *
 * ========== Surge 配置文件 ==========
 * [Script]
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const BASE_URL = 'https://holivator.de';
const USERNAME_KEY = 'holi_username';
const PASSWORD_KEY = 'holi_password';
const MAX_RETRY = 5;
const RETRY_INTERVAL = 10000;
const MAX_RANDOM_DELAY = 5 * 60 * 1000; // 5分钟内随机

const Env = (() => {
  const isQX = typeof $task !== 'undefined' && typeof $prefs !== 'undefined';
  const isSurge = typeof $httpClient !== 'undefined' && typeof $persistentStore !== 'undefined' && typeof $loon === 'undefined';
  const isLoon = typeof $loon !== 'undefined' || (typeof $httpClient !== 'undefined' && typeof $persistentStore !== 'undefined' && typeof $environment === 'undefined');

  function read(key) {
    if (isQX) return $prefs.valueForKey(key) || '';
    if (isSurge || isLoon) return $persistentStore.read(key) || '';
    return '';
  }

  function write(val, key) {
    if (isQX) return $prefs.setValueForKey(val, key);
    if (isSurge || isLoon) return $persistentStore.write(val, key);
  }

  function notify(title, subTitle, message) {
    const t = String(title || '');
    const s = String(subTitle || '');
    const m = String(message || '');
    if (typeof $notify !== 'undefined') { $notify(t, s, m); return; }
    if (typeof $notification !== 'undefined' && typeof $notification.post === 'function') { $notification.post(t, s, m); return; }
  }

  function done(value) {
    if (typeof $done !== 'undefined') $done(value || {});
  }

  function request(options) {
    if (isQX) {
      return $task.fetch(options).then(resp => ({
        status: resp.statusCode || resp.status,
        headers: resp.headers || {},
        body: resp.body || ''
      }));
    }
    return new Promise((resolve, reject) => {
      const method = String(options.method || 'GET').toUpperCase();
      const cb = (err, resp, body) => {
        if (err) return reject(err);
        resolve({
          status: resp && (resp.status || resp.statusCode),
          headers: (resp && resp.headers) || {},
          body: body || ''
        });
      };
      if (method === 'POST') $httpClient.post(options, cb);
      else $httpClient.get(options, cb);
    });
  }

  return { isQX, isSurge, isLoon, read, write, notify, done, request };
})();

function parseBody(body) {
  try { return JSON.parse(body || '{}'); } catch(e) { return {}; }
}

function maskAccount(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.length <= 4) return s[0] + '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let finished = false;

function finish(title, subTitle, message) {
  if (finished) return;
  finished = true;
  Env.notify(title, subTitle, String(message || ''));
  Env.done();
}

const username = String(Env.read(USERNAME_KEY) || '').trim();
const password = String(Env.read(PASSWORD_KEY) || '').trim();

if (!username || !password) {
  finish('Holivator 签到', '⚠️ 未配置账号', '请在 BoxJS 中填写用户名和密码');
} else {

  function login() {
    return Env.request({
      url: `${BASE_URL}/api/v1/auth/login`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
        'origin': BASE_URL,
        'referer': `${BASE_URL}/login`
      },
      body: JSON.stringify({ username, password })
    }).then(resp => {
      const body = parseBody(resp.body);
      const accessToken = (body.data && body.data.access_token) || '';
      if (!accessToken) throw new Error(`登录失败: ${resp.body}`);
      Env.write(accessToken, 'holi_access_token');
      return accessToken;
    });
  }

  function checkin(accessToken) {
    return Env.request({
      url: `${BASE_URL}/api/v1/user/checkin`,
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'zh-CN,zh-Hans;q=0.9',
        'authorization': `Bearer ${accessToken}`,
        'content-length': '0',
        'origin': BASE_URL,
        'referer': `${BASE_URL}/portal`,
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1'
      },
      body: ''
    });
  }

  function getStatus(accessToken) {
    return Env.request({
      url: `${BASE_URL}/api/v1/user/checkin/status`,
      method: 'GET',
      headers: {
        'accept': '*/*',
        'authorization': `Bearer ${accessToken}`,
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
        'origin': BASE_URL,
        'referer': `${BASE_URL}/portal`
      }
    });
  }

  function attempt(retryCount) {
    return login().then(accessToken => {
      return checkin(accessToken).then(resp => {
        if (resp.status === 200 || resp.status === 201 || resp.status === 400 || resp.status === 403) {
          const alreadyDone = resp.status === 400 || resp.status === 403;
          return getStatus(accessToken).then(statusResp => {
            const data = parseBody(statusResp.body).data || {};
            const points = data.today_points || '';
            const streak = data.streak || '';
            const total = data.total_points_earned || '';
            const msg = [
              points ? `今日获得 ${points} 积分` : '',
              streak ? `🔥 连续 ${streak} 天` : '',
              total ? `累计 ${total} 积分` : ''
            ].filter(Boolean).join('\n');
            if (alreadyDone) {
              finish('Holivator 签到', '📅 今日已签到', msg || '无需重复签到');
            } else {
              finish('Holivator 签到', '✅ 签到成功！', msg || '签到完成');
            }
          });
        }

        if (resp.status >= 500) {
          if (retryCount < MAX_RETRY) {
            Env.notify('Holivator 签到', `⚠️ 第${retryCount}次失败，重试中`, `${RETRY_INTERVAL / 1000}秒后第${retryCount + 1}次尝试`);
            return sleep(RETRY_INTERVAL).then(() => attempt(retryCount + 1));
          } else {
            return finish('Holivator 签到', '❌ 签到失败', `已重试 ${MAX_RETRY} 次，均返回 ${resp.status}`);
          }
        }

        if (resp.status === 401) {
          return finish('Holivator 签到', '❌ 认证失败', '请检查账号密码是否正确');
        }

        return finish('Holivator 签到', '⚠️ 签到异常', `状态码: ${resp.status}\n${resp.body}`);
      });
    });
  }

  // 5分钟内随机延迟，总执行时间远低于 Surge 超时限制
  const delay = Math.floor(Math.random() * MAX_RANDOM_DELAY);
  const delaySec = Math.floor(delay / 1000);

  setTimeout(function() {
    attempt(1).catch(err => {
      finish('Holivator 签到', '❌ 请求失败', err && (err.error || err.message) ? (err.error || err.message) : String(err));
    });
  }, delay);
}