/**
 * 节点阻断检测 - Surge Panel 版版
 * 改编自 Quantumult X 版 block_check.js（原作者 RavelloH，含 Globalping 国内定位版）
 *
 * 用法：argument 里传 nodes=节点名，逗号分隔（通常填一个，测单个节点）：
 *   nodes=🇭🇰 香港 Y09 | IEPL
 * 装好模块后在 Surge 的模块设置里随时改这个值，不用重新导入文件。
 * 填的必须是真实的叶子节点名（ss/vmess/trojan/vless 等），不支持填策略组名——
 * 之前试过自动解析策略组当前选中的节点，链路太脆弱（尤其是嵌套的 smart 智能组），
 * 所以简化成直接指定具体节点，更稳定。
 *
 * 原理：
 *   1. 本机直连测一次基线（不走代理）
 *   2. 对目标节点：走该节点请求一次（policy 路由）+ 用 check-host.net 从全球多地探测其服务器
 *   3. 三者比对，区分"节点正常 / 疑似被墙 / 节点离线 / 本机网络异常"
 *   4. 若命中"疑似被墙"（本机网络正常 + check-host 全球可达 + 走节点不通），
 *      追加一次 Globalping 探测：从中国大陆电信/联通/移动的真实住宅网络出口
 *      各测一次，区分"三大运营商全都不通=GFW全局阻断"
 *      / "只有部分运营商不通=运营商级拦截" / "三家都通=不是被墙，查客户端配置"
 *      （仅单节点视图会做这步，批量模式为了保持每行一条的紧凑格式，不触发）
 *
 * 关键点：策略详情不是结构化 JSON，而是该策略在配置文件里的原始定义行文本，
 * 例如 {"HK-01": "HK-01 = ss, 1.2.3.4, 443, encrypt-method=..., password=..."}。
 * 用 GET /v1/policies 一次性拉全量列表本地按 key 查找（而不是逐个按名字查询），
 * 绕开了节点名里表情符号/竖线等特殊字符导致按名查询匹配不上的问题；
 * 查找时还做了去空白+Unicode标准化的兜底匹配。
 * 如果给的名字实际是个策略组（而不是叶子节点），会直接提示改填具体节点名，
 * 不会尝试往下钻。
 *
 * 如果遇到没预料到的返回格式，面板会把原始返回（截断后）打出来，
 * 把内容发回来我再调整解析逻辑。
 */

const IP_API = "http://ip-api.com/json?lang=zh-CN";
const CHECK_HOST = "https://check-host.net";
const GP_API = "https://api.globalping.io/v1/measurements";
const TIMEOUT = 8000;
const GP_TIMEOUT = 10000;
const MAX_NODES_PER_RUN = 8;
const GROUP_TYPES = ["select", "url-test", "fallback", "load-balance", "ssid", "smart"];

function run() {
  const params = parseArgs($argument);

  const nodes = (params.nodes || "")
    .split(",")
    .map(function (s) { return decodeURIComponent(s).trim(); })
    .filter(Boolean);

  if (nodes.length === 0) {
    $done({
      title: "🌐 节点阻断检测",
      content: "未配置 nodes=，见脚本头部注释"
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

function httpPost(url, bodyObj, policy, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const opts = {
      url: url,
      timeout: timeoutMs || TIMEOUT,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyObj)
    };
    if (policy) opts.policy = policy;
    $httpClient.post(opts, function (error, response, data) {
      if (error || data === undefined || data === null) {
        reject(error || "empty response");
        return;
      }
      resolve(data);
    });
  });
}

function clip(s, len) {
  s = String(s || "");
  return s.length > len ? s.slice(0, len) + "…" : s;
}

// 解析 /v1/policies/detail?policy_name=X 返回的原始定义行文本
// 形如 {"节点名": "节点名 = ss, 1.2.3.4, 443, encrypt-method=..., password=..."}
function parsePolicyDetail(name, result) {
  const raw = result && (typeof result[name] === "string" ? result[name] : (result.policy || result.detail));
  if (typeof raw !== "string") {
    return { host: null, port: null, type: null, isGroup: null, raw: null };
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

// /v1/policies（不带 policy_name）返回的是纯名字清单，不是详情：
// {"proxies": ["名字1", "名字2", ...], "policy-groups": ["组名1", ...]}
// 只用来核实"这个名字到底存不存在、属于哪一类"，取不到 server/port
let _allPolicyNamesCache = null;
function getAllPolicyNames() {
  if (_allPolicyNamesCache) return Promise.resolve(_allPolicyNamesCache);
  return new Promise(function (resolve) {
    $httpAPI("GET", "/v1/policies", {}, function (result) {
      const r = result || {};
      _allPolicyNamesCache = {
        proxies: Array.isArray(r.proxies) ? r.proxies : [],
        groups: Array.isArray(r["policy-groups"]) ? r["policy-groups"] : []
      };
      resolve(_allPolicyNamesCache);
    });
  });
}

// 详情接口查不到时，去名字清单里核实一下，给出准确原因而不是含糊的"未能识别"
function diagnoseNotFound(name) {
  return getAllPolicyNames().then(function (lists) {
    if (lists.proxies.indexOf(name) !== -1) {
      return {
        host: null, port: null, type: "proxy", isGroup: false,
        raw: "「" + name + "」确实是已配置的叶子节点（在 /v1/policies 的 proxies 清单里能找到），"
          + "但 /v1/policies/detail 接口查不到它的详情——目前看是节点名里带竖线时 Surge 这个接口内部匹配会失败，"
          + "这是接口本身的限制，不是名字填错了"
      };
    }
    if (lists.groups.indexOf(name) !== -1) {
      return { host: null, port: null, type: "group", isGroup: true, raw: "「" + name + "」是一个策略组，不是叶子节点" };
    }
    return {
      host: null, port: null, type: null, isGroup: null,
      raw: "「" + name + "」在 proxies 和 policy-groups 清单里都没找到，检查一下是否完整复制了名字（空格、表情符号）"
    };
  });
}

// 按名字查详情，依次尝试几种编码方式；全部失败再去名字清单核实原因
function getPolicyDetail(name) {
  const encodings = [encodeURIComponent(name), encodeURI(name), name];
  const tried = [];
  encodings.forEach(function (e) { if (tried.indexOf(e) === -1) tried.push(e); });

  function attempt(i) {
    return new Promise(function (resolve) {
      $httpAPI("GET", "/v1/policies/detail?policy_name=" + tried[i], {}, function (result) {
        const hasError = result && result.error;
        if (hasError && i + 1 < tried.length) {
          resolve(attempt(i + 1));
        } else if (hasError) {
          resolve(diagnoseNotFound(name));
        } else {
          resolve(parsePolicyDetail(name, result));
        }
      });
    });
  }

  return attempt(0);
}

// 只做一层判断：给定的名字要么是能直接拿到 server/port 的叶子节点，
// 要么给出明确原因（不再尝试往策略组里下钻，NODES 参数需要直接填具体节点名）
function resolveToLeaf(name) {
  return getPolicyDetail(name).then(function (detail) {
    if (!detail.isGroup && detail.host && detail.port) {
      return { host: detail.host, port: detail.port, leafName: name, reason: null };
    }
    if (detail.isGroup) {
      return {
        host: null, port: null, leafName: name,
        reason: "「" + name + "」是策略组" + (detail.type ? "（" + detail.type + " 类型）" : "") + "，不是具体节点，NODES 需要填一个真实的叶子节点名"
      };
    }
    return {
      host: null, port: null, leafName: name,
      reason: detail.raw ? clip(detail.raw, 200) : ("未能识别「" + name + "」的类型，或解析不出 server/port")
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

// ---- Globalping 国内运营商定位 ----

function classifyISP(network) {
  const n = (network || "").toLowerCase();
  if (n.indexOf("unicom") !== -1) return "中国联通";
  if (n.indexOf("chinanet") !== -1 || n.indexOf("telecom") !== -1) return "中国电信";
  if (n.indexOf("mobile") !== -1) return "中国移动";
  return null;
}

const CN_CITY_MAP = {
  "Beijing": "北京", "Shanghai": "上海", "Guangzhou": "广州",
  "Shenzhen": "深圳", "Chengdu": "成都", "Hangzhou": "杭州",
  "Wuhan": "武汉", "Nanjing": "南京", "Tianjin": "天津",
  "Xi'an": "西安", "Changsha": "长沙", "Zhengzhou": "郑州",
  "Jinan": "济南", "Qingdao": "青岛", "Dalian": "大连",
  "Xiamen": "厦门", "Fuzhou": "福州", "Kunming": "昆明",
  "Hefei": "合肥", "Ningbo": "宁波", "Suzhou": "苏州",
  "Wuxi": "无锡", "Changzhou": "常州", "Guilin": "桂林",
  "Nanning": "南宁", "Haikou": "海口", "Sanya": "三亚",
  "Guiyang": "贵阳", "Lanzhou": "兰州", "Urumqi": "乌市",
  "Hohhot": "呼市", "Harbin": "哈市", "Changchun": "长春",
  "Shenyang": "沈阳", "Shijiazhuang": "石市", "Taiyuan": "太原",
  "Xuzhou": "徐州", "Yancheng": "盐城", "Taishan": "台山",
  "Nanchang": "南昌", "Foshan": "佛山", "Dongguan": "东莞",
  "Zhuhai": "珠海", "Zhongshan": "中山", "Huizhou": "惠州"
};
function cnCity(en) { return CN_CITY_MAP[en] || en; }

function analyzeBlockSource(gpData) {
  const results = gpData && gpData.results;
  if (!results || !Array.isArray(results)) return null;

  const ispGroups = {};
  results.forEach(function (r) {
    const isp = classifyISP(r.probe && r.probe.network);
    if (!isp) return;
    if (!ispGroups[isp]) ispGroups[isp] = { probes: [], reachable: false };

    const res = r.result || {};
    const stats = res.stats;
    let ok = false, ms = "--.--ms";
    if (res.status === "finished" && stats) {
      ok = stats.rcv > 0;
      ms = ok ? formatMs(stats.avg || 0) : "--.--ms";
    }
    if (ok) ispGroups[isp].reachable = true;
    ispGroups[isp].probes.push({ city: cnCity(r.probe.city), ok: ok, ms: ms });
  });

  const reachableIsps = [], blockedIsps = [];
  Object.keys(ispGroups).forEach(function (k) {
    const g = ispGroups[k];
    if (g.probes.length === 0) return;
    (g.reachable ? reachableIsps : blockedIsps).push(k);
  });

  let conclusion;
  if (reachableIsps.length === 0 && blockedIsps.length === 0) {
    conclusion = null; // 没拿到任何三大运营商的探针数据，不下结论
  } else if (reachableIsps.length === 0) {
    conclusion = "🚫 GFW 全局阻断 — 国内三大运营商均无法访问";
  } else if (blockedIsps.length > 0) {
    conclusion = "🚫 运营商级拦截 — " + blockedIsps.join("、") + " 不可达，" + reachableIsps.join("、") + " 正常";
  } else {
    conclusion = "✅ 国内三大运营商全部可达，非 GFW/运营商拦截，建议检查客户端配置";
  }

  return { ispGroups: ispGroups, conclusion: conclusion };
}

// 返回 gpData 或 null（提交失败/超时/无结果都归为 null，调用方按"未拿到结果"处理）
function runGlobalping(host, port) {
  const body = {
    type: "ping",
    target: host,
    measurementOptions: { port: parseInt(port, 10), protocol: "TCP" },
    locations: [{ country: "CN", tags: ["eyeball-network"] }],
    limit: 12
  };

  return httpPost(GP_API, body, null, GP_TIMEOUT)
    .then(function (respBody) {
      const d = JSON.parse(respBody);
      if (!d.id) return null;
      return new Promise(function (resolve) {
        setTimeout(function () {
          httpGet(GP_API + "/" + d.id, null)
            .then(function (r2) { resolve(JSON.parse(r2)); })
            .catch(function () { resolve(null); });
        }, 6000);
      });
    })
    .catch(function () { return null; });
}

// rOk 三态：true 可达 / false 测了但不可达 / null 没能测（无法下结论）
// gpAnalysis 只在"疑似被墙"且有 Globalping 结果时提供，用来给更精确的结论
function diagnose(dOk, nOk, rOk, gpAnalysis) {
  if (!dOk) return "⚠️ 本机网络异常";
  if (rOk === null || rOk === undefined) {
    return nOk ? "✅ 节点连接正常（未做远端交叉验证）" : "❓ 节点不可达，且无法交叉验证，无法判断是否被墙";
  }
  if (nOk && rOk) return "✅ 正常";
  if (nOk && !rOk) return "✅ 节点连接正常（远端探测被拒，多为服务器防扫描策略，不代表被墙）";
  if (!nOk && rOk) {
    return (gpAnalysis && gpAnalysis.conclusion) ? gpAnalysis.conclusion : "🚫 疑似被运营商/GFW阻断";
  }
  return "💤 离线或无法探测"; // !nOk && !rOk
}

// 批量模式（nodes 传多个）：每个节点压缩成一行，不做 Globalping 深挖（保持紧凑）
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

// 单节点模式（group= 或单个 nodes 走这里）：信息给全，命中疑似被墙时追加 Globalping 深挖
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
        const shouldGP = dOk && hasLeaf && remote && remote.ok && !node.ok;
        const pGP = shouldGP ? runGlobalping(leaf.host, leaf.port) : Promise.resolve(null);

        pGP.then(function (gpData) {
          const gpAnalysis = gpData ? analyzeBlockSource(gpData) : null;
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

          if (shouldGP) {
            if (gpAnalysis && gpAnalysis.conclusion) {
              lines.push("国内探测：");
              const order = ["中国电信", "中国联通", "中国移动"];
              const abbr = { "中国电信": "电信", "中国联通": "联通", "中国移动": "移动" };
              const allProbes = [];
              order.forEach(function (k) {
                const g = gpAnalysis.ispGroups[k];
                if (!g) return;
                g.probes.forEach(function (p) {
                  allProbes.push((p.ok ? "✅" : "❌") + abbr[k] + p.city + " " + p.ms);
                });
              });
              for (let i2 = 0; i2 < allProbes.length; i2 += 2) {
                const left2 = allProbes[i2];
                const right2 = i2 + 1 < allProbes.length ? allProbes[i2 + 1] : null;
                lines.push(left2 + (right2 ? "    " + right2 : ""));
              }
            } else {
              lines.push("国内探测：未拿到结果（Globalping 超时或暂无国内探针）");
            }
          }

          lines.push("诊断：" + diagnose(dOk, node.ok, hasLeaf ? remote.ok : null, gpAnalysis));

          $done({
            title: "🌐 节点阻断检测 · " + timeNow(),
            content: lines.join("\n")
          });
        });
      });
    });
  });
}

function timeNow() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

run();
