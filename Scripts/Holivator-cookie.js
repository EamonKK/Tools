/**
 * Holivator 自动抓取签到 Cookie 脚本
 * 拦截签到请求，自动保存所有 Cookie 到 persistentStore
 *
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-save-cookie = type=http-request,pattern=^https:\/\/holivator\.de\/api\/v1\/user\/checkin,script-path=holivator_save_cookie.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

const headers = $request.headers;

// 统一转为小写 key 方便匹配
const lowerHeaders = {};
for (const key in headers) {
  lowerHeaders[key.toLowerCase()] = headers[key];
}

// 从 Cookie 字符串中提取指定值
function extractCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp(name + "=([^;\\s]+)"));
  return match ? match[1] : null;
}

const cookieStr = lowerHeaders["cookie"] || "";

// access_token 优先从 Authorization 头取，取不到就从 Cookie 里取
const authorization = lowerHeaders["authorization"] || "";
const tokenFromAuth = authorization.replace(/^Bearer\s+/i, "").trim();
const tokenFromCookie = extractCookie(cookieStr, "access_token");
const finalAccessToken = tokenFromAuth || tokenFromCookie;

// csrf_token 从请求头或 Cookie 取
const csrfToken = lowerHeaders["x-csrf-token"] || extractCookie(cookieStr, "csrf_token") || "";

// cf_clearance 从 Cookie 取
const cfClearance = extractCookie(cookieStr, "cf_clearance") || "";

// 保存到 persistentStore
let saved = [];

if (finalAccessToken) {
  $persistentStore.write(finalAccessToken, "holi_access_token");
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
    "✅ Cookie 已自动更新",
    `已保存: ${saved.join(", ")}`
  );
}

// 放行原始请求，不影响正常签到
$done({ request: $request });