/**
 * Holivator 自动抓取 Cookie 脚本
 * 拦截 checkin/status 请求，自动保存所有 Cookie 到 persistentStore
 *
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-cookie = type=http-request,pattern=^https:\/\/holivator\.de\/api\/v1\/user\/checkin\/status,script-path=holivator_cookie.js,script-update-interval=0
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

function extractCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp(name + "=([^;\\s]+)"));
  return match ? match[1] : null;
}

const lowerHeaders = {};
for (const key in $request.headers) {
  lowerHeaders[key.toLowerCase()] = $request.headers[key];
}

const authorization = lowerHeaders["authorization"] || "";
const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

const cookieStr = lowerHeaders["cookie"] || "";
const cfClearance = extractCookie(cookieStr, "cf_clearance") || "";
const csrfToken = extractCookie(cookieStr, "csrf_token") || "";

let saved = [];

if (accessToken) {
  $persistentStore.write(accessToken, "holi_access_token");
  saved.push("access_token");
}
if (cfClearance) {
  $persistentStore.write(cfClearance, "holi_cf_clearance");
  saved.push("cf_clearance");
}
if (csrfToken) {
  $persistentStore.write(csrfToken, "holi_csrf_token");
  saved.push("csrf_token");
}

if (saved.length > 0) {
  $notification.post(
    "Holivator",
    "✅ Cookie 已自动保存",
    `已保存: ${saved.join(", ")}`
  );
}

$done({ request: $request });