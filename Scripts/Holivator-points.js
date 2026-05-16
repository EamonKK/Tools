/**
 * Holivator 积分兑换经验值脚本
 * 支持 Surge / Loon / QX
 * 支持 BoxJS 配置账号密码和兑换积分数
 *
 * ========== Surge 配置文件 ==========
 * [Script]
 * holivator-exchange = type=cron,cronexp="10 8 * * *",wake-up=1,script-path=holivator_exchange.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const BASE_URL = 'https://holivator.de';
const USERNAME_KEY = 'holi_username';
const PASSWORD_KEY = 'holi_password';
const POINTS_KEY = 'holi_exchange_points';

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

let finished = false;

function finish(title, subTitle, message) {
  if (finished) return;
  finished = true;
  Env.notify(title, subTitle, String(message || ''));
  Env.done();
}

const username = String(Env.read(USERNAME_KEY) || '').trim();
const password = String(Env.read(PASSWORD_KEY) || '').trim();
const exchangePoints = parseInt(Env.read(POINTS_KEY) || '50', 10) || 50;

if (!username || !password) {
  finish('Holivator 兑换', '⚠️ 未配置账号', '请在 BoxJS 中填写用户名和密码');
} else {
  Env.notify('Holivator 兑换', '开始登录', `账号：${maskAccount(username)}，兑换 ${exchangePoints} 积分`);

  let savedToken = '';

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
    const body = parseBody(resp.body);
    const accessToken = (body.data && body.data.access_token) || '';
    if (!accessToken) return finish('Holivator 兑换', '❌ 登录失败', resp.body);
    savedToken = accessToken;
    Env.write(accessToken, 'holi_access_token');
    const csrfToken = Env.read('holi_csrf_token') || '';

    // 第二步：兑换积分
    return Env.request({
      url: `${BASE_URL}/api/v1/user/exp/exchange`,
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Bearer ${accessToken}`,
        'x-csrf-token': csrfToken,
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
        'origin': BASE_URL,
        'referer': `${BASE_URL}/portal/growth`,
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      },
      body: JSON.stringify({ points: exchangePoints })
    });
  }).then(resp => {
    if (!resp) return;
    const result = parseBody(resp.body);

    if (resp.status === 200 && result.code === 0) {
      const data = result.data || {};

      // 第三步：查询积分余额
      return Env.request({
        url: `${BASE_URL}/api/v1/user/exp/info`,
        method: 'GET',
        headers: {
          'accept': '*/*',
          'authorization': `Bearer ${savedToken}`,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',
          'origin': BASE_URL,
          'referer': `${BASE_URL}/portal/growth`
        }
      }).then(infoResp => {
        const infoData = parseBody(infoResp.body).data || {};
        const balance = infoData.points_balance !== undefined ? infoData.points_balance : '';
        const msg = [
          `消耗 ${data.points_spent || exchangePoints} 积分`,
          `获得 ${data.exp_gained || ''} 经验值`,
          `当前等级 Lv.${data.new_level || ''}`,
          balance !== '' ? `剩余积分 ${balance}` : ''
        ].filter(Boolean).join('\n');
        finish('Holivator 兑换', '✅ 兑换成功！', msg);
      });
    } else {
      finish('Holivator 兑换', '⚠️ 兑换失败', result.message || `状态码: ${resp.status}\n${resp.body}`);
    }
  }).catch(err => {
    finish('Holivator 兑换', '❌ 请求失败', err && (err.error || err.message) ? (err.error || err.message) : String(err));
  });
}