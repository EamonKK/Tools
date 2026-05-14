/**
 * Holivator 自动抓取 Cookie 脚本
 * 同时拦截登录请求和响应，保存所有 Cookie
 *
 * ========== Surge 配置文件添加内容 ==========
 *
 * [Script]
 * holivator-cookie-req = type=http-request,pattern=^https:\/\/holivator\.de\/api\/v1\/auth\/login,script-path=holivator_cookie.js,script-update-interval=0
 * holivator-cookie-res = type=http-response,pattern=^https:\/\/holivator\.de\/api\/v1\/auth\/login,requires-body=1,script-path=holivator_cookie.js,script-update-interval=0
 * holivator-checkin = type=cron,cronexp="0 8 * * *",wake-up=1,script-path=holivator_checkin.js,script-update-interval=0
 *
 * [MITM]
 * hostname = %APPEND% holivator.de
 */

function extractCookie(cookieStr, name) {
  const match = cookieStr.match(new RegExp(name + "=([^;\\s]+)"));
  return match ? match[1] : null;
}

function lowerCaseHeaders(headers) {
  const result = {};
  for (const key in headers) {
    result[key.toLowerCase()] = headers[key];
  }
  return result;
}

let saved = [];

// ===== 拦截请求：提取 csrf_token 和 cf_clearance =====
if (typeof $request !== "undefined" && typeof $response === "undefined") {
  const headers = lowerCaseHeaders($request.headers);
  const cookieStr = headers["cookie"] || "";

  const csrfToken = headers["x-csrf-token"] || extractCookie(cookieStr, "csrf_token") || "";
  const cfClearance = extractCookie(cookieStr, "cf_clearance") || "";

  if (csrfToken) {
    $persistentStore.write(csrfToken, "holi_csrf_token");
    saved.push("csrf_token");
  }
  if (cfClearance) {
    $persistentStore.write(cfClearance, "holi_cf_clearance");
    saved.push("cf_clearance");
  }

  if (saved.length > 0) {
    $notification.post("Holivator", "✅ Cookie 已保存", `已保存: ${saved.join(", ")}`);
  }

  $done({ request: $request });
}

// ===== 拦截响应：提取 access_token =====
if (typeof $response !== "undefined") {
  let accessToken = "";

  // 先从响应 body 提取
  try {
    const body = JSON.parse($response.body);
    accessToken = body?.data?.token
      || body?.data?.access_token
      || body?.token
      || body?.access_token
      || "";
  } catch (e) {}

  // 再从 set-cookie 提取
  if (!accessToken) {
    const headers = lowerCaseHeaders($response.headers);
    const rawCookie = headers["set-cookie"] || "";
    const cookieStr = Array.isArray(rawCookie) ? rawCookie.join("; ") : rawCookie;
    accessToken = extractCookie(cookieStr, "access_token") || "";
  }

  if (accessToken) {
    $persistentStore.write(accessToken, "holi_access_token");
    saved.push("access_token");
    $notification.post("Holivator", "✅ Cookie 已保存", `已保存: ${saved.join(", ")}`);
  }

  $done({ response: $response });
}