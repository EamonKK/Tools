/**
 * Holivator 自动抓取 Cookie 脚本
 * 拦截登录响应，自动保存所有 Cookie 到 persistentStore
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

// 统一转为小写 key
const lowerHeaders = {};
for (const key in $response.headers) {
  lowerHeaders[key.toLowerCase()] = $response.headers[key];
}

// 从 Cookie 字符串中提取指定值
function extractCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp(name + "=([^;\\s]+)"));
  return match ? match[1] : null;
}

// set-cookie 可能是数组或字符串
const rawCookie = lowerHeaders["set-cookie"] || "";
const cookieStr = Array.isArray(rawCookie) ? rawCookie.join("; ") : rawCookie;

// 从响应 body 提取 access_token
let accessToken = "";
try {
  const body = JSON.parse($response.body);
  accessToken = body?.data?.token
    || body?.data?.access_token
    || body?.token
    || body?.access_token
    || extractCookie(cookieStr, "access_token")
    || "";
} catch (e) {
  accessToken = extractCookie(cookieStr, "access_token") || "";
}

const csrfToken = extractCookie(cookieStr, "csrf_token") || "";
const cfClearance = extractCookie(cookieStr, "cf_clearance") || "";

// 保存到 persistentStore
let saved = [];

if (accessToken) {
  $persistentStore.write(accessToken, "holi_access_token");
  saved.push("access_token");
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
    "⚠️ Cookie 未能获取",
    "请检查登录是否成功"
  );
}

$done({ response: $response });