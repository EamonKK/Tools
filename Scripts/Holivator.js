/**
 * Holivator 每日签到脚本
 * 支持 Surge / Loon / QX
 * 支持 BoxJS 配置账号密码
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

// ========== 环境适配 ==========
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

// ========== 主流程 ==========
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
  Env.notify('Holivator 签到', '开始登录签到', `账号：${maskAccount(username)}`);

  // 第一步：登录
  Env.request({
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
    // 从 set-cookie 提取 token
    const cookies = resp.headers['Set-Cookie'] || resp.headers['set-cookie'] || '';
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    const tokenMatch = cookieStr.match(/access_token=([^;,\s]+)/);
    const csrfMatch = cookieStr.match(/csrf_token=([^;,\s]+)/);

    let accessToken = tokenMatch ? tokenMatch[1] : '';
    let csrfToken = csrfMatch ? csrfMatch[1] : '';
    const cfClearance = Env.read('holi_cf_clearance') || '';

    // 从 body 提取备用
    if (!accessToken) {
      const body = parseBody(resp.body);
      accessToken = (body.data && (body.data.token || body.data.access_token)) || body.token || body.access_token || '';
    }

    if (!accessToken) {
      return finish('Holivator 签到', '❌ 登录失败', '未获取到 token，请检查账号密码');
    }

    Env.write(accessToken, 'holi_access_token');
    if (csrfToken) Env.write(csrfToken, 'holi_csrf_token');

    // 第二步：签到
    return Env.request({
      url: `${BASE_URL}/api/v1/user/checkin`,
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'zh-CN,zh-Hans;q=0.9',
        'authorization': `Bearer ${accessToken}`,
        'content-length': '0',
        'cookie': `access_token=${accessToken}; cf_clearance=${cfClearance}; csrf_token=${csrfToken}`,
        'origin': BASE_URL,
        'referer': `${BASE_URL}/portal`,
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
        'x-csrf-token': csrfToken
      },
      body: ''
    });
  }).then(resp => {
    if (!resp) return;
    const result = parseBody(resp.body);
    if (resp.status === 200 || resp.status === 201) {
      const points = (result.data && result.data.points) || result.points || '';
      finish('Holivator 签到', '✅ 签到成功！', points ? `获得 ${points} 积分` : '签到完成');
    } else if (resp.status === 400 || resp.status === 403) {
      finish('Holivator 签到', '📅 今日已签到', '无需重复签到');
    } else if (resp.status === 401) {
      finish('Holivator 签到', '❌ 认证失败', '请检查账号密码是否正确');
    } else {
      finish('Holivator 签到', '⚠️ 签到异常', `状态码: ${resp.status}\n${resp.body}`);
    }
  }).catch(err => {
    finish('Holivator 签到', '❌ 请求失败', err && (err.error || err.message) ? (err.error || err.message) : String(err));
  });
}