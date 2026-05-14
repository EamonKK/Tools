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

// 提取 Authorization Bearer Token
const authorization = lowerHeaders["authorization"] || "";
const accessToken = authorization.replace(/^Bearer\s+/i, "").trim();

// 提取 x-csrf-token
const csrfToken = lowerHeaders["x-csrf-token"] || "";

// 从 Cookie 字符串中提取指定值
function extractCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp(name + "=([^;\\s]+)"));
  return match ? match[1] : null;
}

const cookieStr = lowerHeaders["cookie"] || "";
const cfClearance = extractCookie(cookieStr, "cf_clearance");

// 也从 cookie 中提取 access_token 和 csrf_token 作为备用
const accessTokenFromCookie = extractCookie(cookieStr, "access_token");
const csrfTokenFromCookie = extractCookie(cookieStr, "csrf_token");

const finalAccessToken = accessToken || accessTokenFromCookie;
const finalCsrfToken = csrfToken || csrfTokenFromCookie;

// 保存到 persistentStore
let saved = [];

if (finalAccessToken) {
  $persistentStore.write(finalAccessToken, "holi_access_token");
  saved.push("access_token");
}

if (finalCsrfToken) {
  $persistentStore.write(finalCsrfToken, "holi_csrf_token");
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