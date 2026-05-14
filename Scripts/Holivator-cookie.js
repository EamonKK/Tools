/**
 * Holivator 自动抓取 Cookie 脚本
 * 拦截登录响应，自动保存 Cookie 到 persistentStore
 * 
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-cookie = type=http-response,pattern=^https:\/\/holivator\.de\/api\/v1\/auth\/login,requires-body=1,script-path=holivator_cookie.js,script-update-interval=0
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

// 从响应 Header 中提取 Cookie
const headers = $response.headers;
const setCookie = headers["Set-Cookie"] || headers["set-cookie"] || "";

// 将所有 set-cookie 合并成一个字符串处理
const cookieStr = Array.isArray(setCookie) ? setCookie.join("; ") : setCookie;

// 提取各个 Cookie 值
function extractCookie(str, name) {
  const match = str.match(new RegExp(name + "=([^;,\\s]+)"));
  return match ? match[1] : null;
}

const accessToken = extractCookie(cookieStr, "access_token");
const csrfToken = extractCookie(cookieStr, "csrf_token");
const cfClearance = extractCookie(cookieStr, "cf_clearance");

// 尝试从响应 body 中提取 token（有些网站放在 body 里）
let bodyToken = null;
try {
  const body = JSON.parse($response.body);
  bodyToken = body?.data?.token || body?.token || body?.access_token || null;
} catch (e) {}

// 保存 Cookie
let saved = [];

if (accessToken) {
  $persistentStore.write(accessToken, "holi_access_token");
  saved.push("access_token");
} else if (bodyToken) {
  $persistentStore.write(bodyToken, "holi_access_token");
  saved.push("access_token(body)");
}

if (csrfToken) {
  $persistentStore.write(csrfToken, "holi_csrf_token");
  saved.push("csrf_token");
}

if (cfClearance) {
  $persistentStore.write(cfClearance, "holi_cf_clearance");
  saved.push("cf_clearance");
}

if (saved.length > 0) {
  $notification.post(
    "Holivator",
    "✅ Cookie 已自动保存",
    `已保存: ${saved.join(", ")}`
  );
} else {
  $notification.post(
    "Holivator",
    "⚠️ Cookie 未能自动获取",
    "请检查登录是否成功，或手动运行 setup 脚本"
  );
}

$done({ response: $response });