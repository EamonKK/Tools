/**
 * 节点阻断检测 - Surge Panel 版
 * 改编自 Quantumult X 版 block_check.js（原作者 RavelloH）
 *
 * 两种用法（在 argument 里二选一）：
 *   1. 固定检测一批节点：              nodes=HK-01,US-02,JP-03
 *   2. 检测某个策略组当前选中的节点：   group=Proxy
 *      （目前只处理 select 类型策略组，url-test/fallback 自动测速组不适用，见下方说明）
 *
 * 原理（和原脚本一致）：
 *   1. 本机直连测一次基线（不走代理）
 *   2. 对目标节点：走该节点请求一次 + 用 check-host.net 从全球多地探测节点服务器
 *   3. 三者比对，区分"节点正常 / 疑似被墙 / 节点离线 / 本机网络异常"
 *
 * 没有实机验证、需要你自己核对的地方：
 *   - resolveGroupToNode() 里取当前选中节点名用的字段是 result.policy，
 *     是照"设置选中项"接口的请求体字段名 {group_name, policy} 反推的，
 *     GET 返回如果对不上，把注释掉的 console.log 打开，在 Surge 脚本日志里看真实结构再改
 *   - getPolicyDetail() 里取 host/port 字段名同样是猜的，取不到同样打开对应 console.log 核对
 *   - group= 模式目前只处理 select（手动选择）类型策略组。如果你的组是 url-test/fallback
 *     这种自动测速切换的，Surge 用的是另一个"获取测速结果"接口，不是这个，
 *     告诉我你的组类型（select / url-test / fallback）我再单独适配
 */

const IP_API = "http://ip-api.com/json?lang=zh-CN";
const CHECK_HOST = "https://check-host.net";
const TIMEOUT = 8000;
const MAX_NODES_PER_RUN = 8;

function run() {
  const params = parseArgs($argument);

  if (params.group) {
    resolveGroupToNode(params.group).then(function (nodeName) {
      if (!nodeName) {
        $done({
          title: "🌐 节点阻断检测",
          content: "策略组「" + params.group + "」没取到当前选中节点，见脚本头部注释排查"
        });
        return;
      }
      runOne(nodeName);
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

  runBatch(nodes);
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

function resolveGroupToNode(groupName) {
  return new Promise(function (resolve) {
    $httpAPI(
      "GET",
      "/v1/policy_groups/select?group_name=" + encodeURIComponent(groupName),
      {},
      function (result) {
        // console.log("group select raw: " + JSON.stringify(result));
        const r = result || {};
        resolve(r.policy || r.selected || r.now || null);
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
        // console.log(name + " detail raw: " + JSON.stringify(result));
        const r = result || {};
        const host = r.server || r.host || (r.detail && (r.detail.server || r.detail.host));
        const port = r.port || (r.detail && r.detail.port);
        resolve({ host: host, port: port });
      }
    );
  });
}

function checkHostProbe(host, port) {
  if (!host || !port) return Promise.resolve({ ok: false });
  const target = host + ":" + port;
  const submitUrl = CHECK_HOST + "/check-tcp?host=" + encodeURIComponent(target) + "&max_nodes=6";

  return httpGet(submitUrl, null)
    .then(function (body) {
      const d = JSON.parse(body);
      if (!d.ok || !d.request_id) return { ok: false };
      return new Promise(function (resolve) {
        setTimeout(function () {
          httpGet(CHECK_HOST + "/check-result/" + d.request_id, null)
            .then(function (body2) {
              const res = JSON.parse(body2);
              let reachableCount = 0, total = 0;
              Object.keys(res).forEach(function (k) {
                total++;
                const nr = res[k];
                if (Array.isArray(nr) && nr[0] && nr[0].time !== undefined) reachableCount++;
              });
              resolve({ ok: reachableCount > 0, reachableCount: reachableCount, total: total });
            })
            .catch(function () { resolve({ ok: false }); });
        }, 3500);
      });
    })
    .catch(function () { return { ok: false }; });
}

// 批量模式（nodes=）：多个节点一次刷新，每个节点压缩成一行
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

// 单节点模式（group= 走这里）：信息给全，类似原版单节点大卡片
function runOne(name) {
  httpGet(IP_API, null).then(
    function () { return true; },
    function () { return false; }
  ).then(function (dOk) {
    getPolicyDetail(name).then(function (detail) {
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
        lines.push("远端探测：" + (remote.ok ? "✅ 可达（" + remote.reachableCount + "/" + remote.total + "）" : "❌ 不可达"));
        lines.push("诊断：" + diagnose(dOk, node.ok, remote.ok));

        $done({
          title: "🌐 节点阻断检测 · " + timeNow(),
          content: lines.join("\n")
        });
      });
    });
  });
}

function diagnose(dOk, nOk, rOk) {
  if (!dOk) return "⚠️ 本机网络异常";
  if (nOk && rOk) return "✅ 正常";
  if (!nOk && rOk) return "🚫 疑似被运营商/GFW阻断";
  if (!nOk && !rOk) return "💤 离线或无法探测";
  return "❓ 数据不完整";
}

function timeNow() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

run();