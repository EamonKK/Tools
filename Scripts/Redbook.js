/**
 * 小红书 - 评论区用户 ID 置空
 * 原 QuantumultX 规则：
 *   ^https?:\/\/edith\.xiaohongshu\.com\/api\/sns\/v\d\/note\/comment\/list
 *   url response-body red_id response-body fmz200
 *
 * 作用：将评论列表响应体中的 red_id 字段值替换为 fmz200，达到用户 ID 脱敏/置空效果。
 * 作者：奶思（原规则） / Surge 适配版
 *
 * Surge 模块配置（添加到 .sgmodule 的 [Script] 和 [MITM] 段）：
 *
 * [Script]
 * 小红书_评论区用户ID = type=http-response,pattern=^https?:\/\/edith\.xiaohongshu\.com\/api\/sns\/v\d\/note\/comment\/list,requires-body=1,max-size=0,script-path=xiaohongshu_comment_id.js,binary-body-mode=0
 *
 * [MITM]
 * hostname = %APPEND% edith.xiaohongshu.com
 */

const body = $response.body;

if (!body) {
  $done({});
}

try {
  // 将响应体中所有 red_id 的值替换为 fmz200
  // 原始 JSON 结构中 red_id 形如: "red_id":"someUserId123"
  const replaced = body.replace(/"red_id"\s*:\s*"([^"]*)"/g, '"red_id":"fmz200"');

  $done({ body: replaced });
} catch (e) {
  // 解析失败时原样放行，避免影响正常使用
  console.log("[小红书_评论ID] 处理失败: " + e.message);
  $done({});
}