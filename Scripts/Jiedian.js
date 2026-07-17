/**
 * 节点阻断检测 - Surge Panel 版
 * 改编自 Quantumult X 版 block_check.js（原作者 RavelloH）
 *
 * 两种用法（在 argument 里二选一）：
 *   1. 检测策略组当前选中的节点：       group=Proxy （仅支持 select 手动选择类型的组）
 *   2. 固定检测一批节点：               nodes=HK-01,US-02,JP-03
 *
 * 原理（和原脚本一致）：
 *   1. 本机直连测一次基线（不走代理）
 *   2. 对目标节点：走该节点请求一次（policy 路由）+ 用 check-host.net 从全球多地探测其服务器
 *   3. 三者比对，区分"节点正常 / 疑似被墙 / 节点离线 / 本机网络异常"
 *
 * 关键点：/v1/policies/detail 返回的不是结构化 JSON，而是该策略在配置文件里的
 * 原始定义行文本，例如：
 *   叶子节点： {"HK-01": "HK-01 = ss, 1.2.3.4, 443, encrypt-method=..., password=..."}
 *   策略组：   {"香港": "香港 = smart, ..., include-other-group=\"A, B\", ..."}
 * 所以按 Surge 配置行语法解析：第一个逗号前是类型，如果类型是已知的组类型
 * （select/url-test/fallback/load-balance/ssid/smart），就当它是策略组，
 * 用 /v1/policy_groups/select 查它当前指向谁，递归下钻，直到找到真正带
 * server/port 的叶子节点，或者钻到底也没找到（这时远端探测会显示"跳过"，
 * 而不是误判为"不可达"）。
 *
 * 已确认 smart 类型策略组无法通过 /v1/policy_groups/select 查到当前选中项
 * （该接口只支持 select 等其他类型），遇到 smart 组会直接跳过远端探测并给出
 * 明确原因，不会误判成"不可达"或"被墙"。
 *
 * 如果遇到其他没预料到的返回格式，面板会把原始返回（截断后）打出来，
 * 把内容发回来我再调整解析逻辑。
 */

const IP_API = "http://ip-api.com/json?lang=zh-CN";
const CHECK_HOST = "https://check-host.net";
const TIMEOUT = 8000;
const MAX_NODES_PER_RUN = 8;
const MAX_RESOLVE_DEPTH = 4;
const GROUP_TYPES = ["select", "url-test", "fallback", "load-balance", "ssid", "smart"];

function run() {
  const params = parseArgs($argument);

  if (params.group) {
    resolveGroupToNode(params.group).then(function (r) {
      if (!r.name) {
        $done({
          title: "🌐 节点阻断检测 · 调试",
          content: "策略组「" + params.group + "」没取到当前选中节点\n原始返回：\n" + r.raw
        });
        return;
      }
      runOne(r.name);
    });
    return;
  }

  const nodes = (params.nodes || "")
    .split(",")
    .map(function (s) { return decodeURIComponent(s).trim(); })
    .filter(Boolean);

  if (nodes.length === 0) {
    $done({
      title: "🌐 节点阻断检测",
      content: "未配置 group= 或 nodes=，见脚本头部注释"
    });
    return;
  }

  if (nodes.length === 1) {
    runOne(nodes[0]);
  } else {
    runBatch(nodes);
  }
}

function parseArgs(argStr) {
  const raw = (argStr || "").trim();
  const params = {};
  raw.split("&").forEach(function (pair) {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    params[pair.slice(0, idx)] = pair.slice(idx + 1);
  });
  return params;
}

function safeStringify(obj) {
  try { return JSON.stringify(obj); } catch (e) { return String(obj); }
}

function resolveGroupToNode(groupName) {
  return new Promise(function (resolve) {
    $httpAPI(
      "GET",
      "/v1/policy_groups/select?group_name=" + encodeURIComponent(groupName),
      {},
      function (result) {
        const r = result || {};
        const name = r.policy || r.selected || r.now || r.policy_name || null;
        resolve({ name: name, raw: safeStringify(result) });
      }
    );
  });
}

function httpGet(url, policy) {
  return new Promise(function (resolve, reject) {
    const opts = { url: url, timeout: TIMEOUT };
    if (policy) opts.policy = policy;
    $httpClient.get(opts, function (error, response, data) {
      if (error || data === undefined || data === null) {
        reject(error || "empty response");
        return;
      }
      resolve(data);
    });
  });
}

// 解析 /v1/policies/detail 返回的原始定义行文本
function parsePolicyDetail(name, result) {
  const raw = result && (result[name] || result.policy || result.detail);
  if (typeof raw !== "string") {
    return { host: null, port: null, type: null, isGroup: null, raw: safeStringify(result) };
  }
  const eqIdx = raw.indexOf("=");
  if (eqIdx === -1) return { host: null, port: null, type: null, isGroup: null, raw: raw };

  const rest = raw.slice(eqIdx + 1);
  const fields = rest.split(",").map(function (s) { return s.trim(); });
  const type = (fields[0] || "").toLowerCase();
  const isGroup = GROUP_TYPES.indexOf(type) !== -1;

  if (isGroup) {
    return { host: null, port: null, type: type, isGroup: true, raw: raw };
  }

  // 叶子节点：类型后面紧跟的位置字段（不含"="号的）一般是 server、port
  const f1 = fields[1] || "";
  const f2 = fields[2] || "";
  const server = f1 && f1.indexOf("=") === -1 ? f1 : null;
  const portRaw = f2 && f2.indexOf("=") === -1 ? f2 : null;
  const port = portRaw ? parseInt(portRaw, 10) : null;

  return {
    host: server,
    port: (port && !isNaN(port)) ? port : null,
    type: type,
    isGroup: false,
    raw: raw
  };
}

function getPolicyDetail(name) {
  return new Promise(function (resolve) {
    $httpAPI(
      "GET",
      "/v1/policies/detail?policy_name=" + encodeURIComponent(name),
      {},
      function (result) {
        resolve(parsePolicyDetail(name, result));
      }
    );
  });
}

// 截断，避免超长内容在 Panel 卡片里渲染异常（实测过长内容会显示不全）
function clip(s, len) {
  s = String(s || "");
  return s.length > len ? s.slice(0, len) + "…" : s;
}

// 从任意策略名（可能是叶子，也可能是嵌套的策略组）递归下钻，找到 server/port
// 找不到时用 reason 给出人话原因，而不是甩一段原始 JSON
function resolveToLeaf(name, depth) {
  depth = depth || 0;
  return getPolicyDetail(name).then(function (detail) {
    if (!detail.isGroup && detail.host && detail.port) {
      return { host: detail.host, port: detail.port, leafName: name, reason: null };
    }
    if (depth >= MAX_RESOLVE_DEPTH) {
      return {
        host: null, port: null, leafName: name,
        reason: "递归超过 " + MAX_RESOLVE_DEPTH + " 层，停止下钻"
      };
    }
    // smart 组已实测确认：/v1/policy_groups/select 不支持查询，直接给出明确原因，不再徒劳调用
    if (detail.type === "smart") {
      return {
        host: null, port: null, leafName: name,
        reason: "「" + name + "」是 smart 智能策略组，Surge 暂无接口可查询其当前实际选中的叶子节点"
      };
    }
    if (detail.isGroup) {
      return resolveGroupToNode(name).then(function (r) {
        if (!r.name || r.name === name) {
          return {
            host: null, port: null, leafName: name,
            reason: "「" + name + "」是 " + detail.type + " 类型策略组，select 接口未返回有效的当前选中项",
            raw: clip(r.raw, 150)
          };
        }
        return resolveToLeaf(r.name, depth + 1);
      });
    }
    return {
      host: null, port: null, leafName: name,
      reason: "未能识别「" + name + "」的类型，或解析不出 server/port",
      raw: clip(detail.raw, 150)
    };
  });
}

function getFlag(cc) {
  if (!cc || cc.length !== 2) return "🌍";
  const cp = cc.toUpperCase().split("").map(function (c) { return 127397 + c.charCodeAt(); });
  return String.fromCodePoint.apply(null, cp);
}

function formatMs(ms) {
  if (ms === null || ms === undefined) return "timeout";
  if (ms >= 1000) return (ms / 1000).toFixed(2) + "s";
  return Math.round(ms) + "ms";
}

// 返回 { ok, items: [{flag, ms}], raw }
function checkHostProbe(host, port) {
  if (!host || !port) return Promise.resolve({ ok: false, items: [], raw: "(未取到 host/port，跳过探测)" });

  const target = host + ":" + port;
  const submitUrl = CHECK_HOST + "/check-tcp?host=" + encodeURIComponent(target) + "&max_nodes=8";

  return httpGet(submitUrl, null)
    .then(function (body) {
      const d = JSON.parse(body);
      if (!d.ok || !d.request_id) return { ok: false, items: [], raw: body };

      const nodeList = d.nodes || {};
      const nodeNames = Object.keys(nodeList);
      const countryMap = {};
      nodeNames.forEach(function (n) {
        const info = nodeList[n];
        if (info && info.length >= 1) countryMap[n] = info[0];
      });

      return new Promise(function (resolve) {
        setTimeout(function () {
          httpGet(CHECK_HOST + "/check-result/" + d.request_id, null)
            .then(function (body2) {
              const res = JSON.parse(body2);
              let reachable = false;
              const items = [];
              nodeNames.forEach(function (n) {
                const cc = countryMap[n] || "";
                const flag = cc ? getFlag(cc) : "🌍";
                const nr = res[n];
                let ms = null;
                if (nr && Array.isArray(nr) && nr[0] && nr[0].time !== undefined) {
                  reachable = true;
                  ms = nr[0].time * 1000;
                }
                items.push({ flag: flag, ms: ms });
              });
              resolve({ ok: reachable, items: items, raw: body2 });
            })
            .catch(function (e) { resolve({ ok: false, items: [], raw: "查询结果失败: " + e }); });
        }, 3500);
      });
    })
    .catch(function (e) { return { ok: false, items: [], raw: "提交探测失败: " + e }; });
}

// rOk 是三态：true 可达 / false 测了但不可达 / null 没能测（无法下结论）
function diagnose(dOk, nOk, rOk) {
  if (!dOk) return "⚠️ 本机网络异常";
  if (rOk === null || rOk === undefined) {
    return nOk ? "✅ 节点连接正常（未做远端交叉验证）" : "❓ 节点不可达，且无法交叉验证，无法判断是否被墙";
  }
  if (nOk && rOk) return "✅ 正常";
  if (!nOk && rOk) return "🚫 疑似被运营商/GFW阻断";
  if (!nOk && !rOk) return "💤 离线或无法探测";
  return "❓ 数据不完整";
}

// 批量模式（nodes 传多个）：多个节点一次刷新，每个节点压缩成一行
function runBatch(nodes) {
  httpGet(IP_API, null).then(
    function () { return true; },
    function () { return false; }
  ).then(function (dOk) {
    const jobs = nodes.slice(0, MAX_NODES_PER_RUN).map(function (name) {
      return checkNodeCompact(name, dOk).catch(function () {
        return name + "：❓ 检测出错";
      });
    });

    Promise.allSettled(jobs).then(function (results) {
      const lines = results.map(function (r, i) {
        return r.status === "fulfilled" ? r.value : (nodes[i] + "：❓ 检测出错");
      });
      if (!dOk) lines.unshift("⚠️ 本机网络基线异常，以下结果仅供参考");
      $done({
        title: "🌐 节点阻断检测 · " + timeNow(),
        content: lines.join("\n")
      });
    });
  });
}

function checkNodeCompact(name, dOk) {
  const pNode = httpGet(IP_API, name).then(function () { return true; }, function () { return false; });
  const pLeaf = resolveToLeaf(name);

  return Promise.all([pNode, pLeaf]).then(function (r) {
    const nOk = r[0];
    const leaf = r[1];
    if (!leaf.host || !leaf.port) {
      return name + "：" + diagnose(dOk, nOk, null);
    }
    return checkHostProbe(leaf.host, leaf.port).then(function (remote) {
      return name + "：" + diagnose(dOk, nOk, remote.ok);
    });
  });
}

// 单节点模式（group= 或单个 nodes 走这里）：信息给全，对齐原版单节点大卡片
function runOne(name) {
  httpGet(IP_API, null).then(
    function () { return true; },
    function () { return false; }
  ).then(function (dOk) {
    const pNode = httpGet(IP_API, name)
      .then(function (body) { return { ok: true, data: JSON.parse(body) }; })
      .catch(function () { return { ok: false }; });
    const pLeaf = resolveToLeaf(name);

    Promise.all([pNode, pLeaf]).then(function (r) {
      const node = r[0];
      const leaf = r[1];
      const hasLeaf = !!(leaf.host && leaf.port);
      const pRemote = hasLeaf ? checkHostProbe(leaf.host, leaf.port) : Promise.resolve(null);

      pRemote.then(function (remote) {
        const lines = [];
        lines.push("节点：" + name);
        if (hasLeaf && leaf.leafName !== name) {
          lines.push("（远端探测实际走：" + leaf.leafName + "）");
        }
        lines.push("节点代理：" + (node.ok ? "✅ 正常" : "❌ 不可达"));
        if (node.ok && node.data) {
          const d = node.data;
          lines.push("IP：" + d.query);
          lines.push("位置：" + [d.country, d.regionName, d.city].filter(Boolean).join(" - "));
          lines.push("ISP：" + (d.isp || "未知"));
        }
        lines.push("本机网络：" + (dOk ? "✅ 正常" : "❌ 异常"));

        if (!hasLeaf) {
          lines.push("远端探测：⏭️ 跳过");
          lines.push(leaf.reason || "解析不到具体服务器地址");
          if (leaf.raw) lines.push("原始返回：" + leaf.raw);
        } else {
          lines.push("远端探测：" + (remote.ok ? "✅ 可达" : "❌ 不可达"));
          if (remote.items && remote.items.length > 0) {
            for (let i = 0; i < remote.items.length; i += 2) {
              const left = remote.items[i];
              const right = i + 1 < remote.items.length ? remote.items[i + 1] : null;
              let line = left.flag + " " + formatMs(left.ms);
              if (right) line += "    " + right.flag + " " + formatMs(right.ms);
              lines.push(line);
            }
          }
        }

        lines.push("诊断：" + diagnose(dOk, node.ok, hasLeaf ? remote.ok : null));

        $done({
          title: "🌐 节点阻断检测 · " + timeNow(),
          content: lines.join("\n")
        });
      });
    });
  });
}

function timeNow() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

run();
