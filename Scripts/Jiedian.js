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
 *   2. 对目标节点：走该节点请求一次 + 用 check-host.net 从全球多地探测节点服务器
 *   3. 三者比对，区分"节点正常 / 疑似被墙 / 节点离线 / 本机网络异常"
 *
 * 调试机制：
 *   /v1/policy_groups/select 和 /v1/policies/detail 这两个接口的返回字段名
 *   没有实机验证过，是按大概率猜的。如果取不到值，面板会直接显示接口原始返回，
 *   把那段内容截图/复制发回来，我照真实结构把取值那两行改掉就行。
 */

const IP_API = "http://ip-api.com/json?lang=zh-CN";
const CHECK_HOST = "https://check-host.net";
const TIMEOUT = 8000;
const MAX_NODES_PER_RUN = 8;

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

function getPolicyDetail(name) {
  return new Promise(function (resolve) {
    $httpAPI(
      "GET",
      "/v1/policies/detail?policy_name=" + encodeURIComponent(name),
      {},
      function (result) {
        const r = result || {};
        const host = r.server || r.host || r.hostname
          || (r.detail && (r.detail.server || r.detail.host));
        const port = r.port || (r.detail && r.detail.port);
        resolve({ host: host, port: port, raw: safeStringify(result) });
      }
    );
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

function diagnose(dOk, nOk, rOk) {
  if (!dOk) return "⚠️ 本机网络异常";
  if (nOk && rOk) return "✅ 正常";
  if (!nOk && rOk) return "🚫 疑似被运营商/GFW阻断";
  if (!nOk && !rOk) return "💤 离线或无法探测";
  return "❓ 数据不完整（节点通但远端探测拿不到结果，见下方原始返回）";
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
  return getPolicyDetail(name).then(function (detail) {
    const pNode = httpGet(IP_API, name).then(function () { return true; }, function () { return false; });
    const pRemote = checkHostProbe(detail.host, detail.port);
    return Promise.all([pNode, pRemote]).then(function (r) {
      const nOk = r[0], rOk = r[1].ok;
      return name + "：" + diagnose(dOk, nOk, rOk);
    });
  });
}

// 单节点模式（group= 或单个 nodes 走这里）：信息给全，对齐原版单节点大卡片
function runOne(name) {
  httpGet(IP_API, null).then(
    function () { return true; },
    function () { return false; }
  ).then(function (dOk) {
    getPolicyDetail(name).then(function (detail) {
      if (!detail.host || !detail.port) {
        $done({
          title: "🌐 节点阻断检测 · 调试",
          content: "节点：" + name + "\n取不到 host/port\n原始返回：\n" + detail.raw
        });
        return;
      }

      const pNode = httpGet(IP_API, name)
        .then(function (body) { return { ok: true, data: JSON.parse(body) }; })
        .catch(function () { return { ok: false }; });
      const pRemote = checkHostProbe(detail.host, detail.port);

      Promise.all([pNode, pRemote]).then(function (r) {
        const node = r[0];
        const remote = r[1];
        const lines = [];

        lines.push("节点：" + name);
        lines.push("节点代理：" + (node.ok ? "✅ 正常" : "❌ 不可达"));
        if (node.ok && node.data) {
          const d = node.data;
          lines.push("IP：" + d.query);
          lines.push("位置：" + [d.country, d.regionName, d.city].filter(Boolean).join(" - "));
          lines.push("ISP：" + (d.isp || "未知"));
        }
        lines.push("本机网络：" + (dOk ? "✅ 正常" : "❌ 异常"));
        lines.push("远端探测：" + (remote.ok ? "✅ 可达" : "❌ 不可达"));

        if (remote.items && remote.items.length > 0) {
          for (let i = 0; i < remote.items.length; i += 2) {
            const left = remote.items[i];
            const right = i + 1 < remote.items.length ? remote.items[i + 1] : null;
            let line = left.flag + " " + formatMs(left.ms);
            if (right) line += "    " + right.flag + " " + formatMs(right.ms);
            lines.push(line);
          }
        } else if (!remote.ok) {
          lines.push("（探测无结果，原始返回：" + remote.raw + "）");
        }

        lines.push("诊断：" + diagnose(dOk, node.ok, remote.ok));

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