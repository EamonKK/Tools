// 京东 basicConfig 修改脚本
// 转换自 Loon http-response-jq 规则
// 原作者: RuCu6, Maasea

const body = $response.body;
if (!body || body.length === 0) {
  $done({});
}

let obj;
try {
  obj = JSON.parse(body);
} catch (e) {
  $done({});
}

// 规则1: 禁用 socketmonitor - isSocketEstablishedAhead
try {
  const sm = obj?.data?.JDMessage?.socketmonitor;
  if (sm && Object.prototype.hasOwnProperty.call(sm, "isSocketEstablishedAhead")) {
    sm.isSocketEstablishedAhead = 0;
  }
} catch (e) {}

// 规则2: 禁用 socketmonitor - isSocketReport
try {
  const sm = obj?.data?.JDMessage?.socketmonitor;
  if (sm && Object.prototype.hasOwnProperty.call(sm, "isSocketReport")) {
    sm.isSocketReport = 0;
  }
} catch (e) {}

// 规则3: 禁用 httpdns
try {
  const dns = obj?.data?.JDHttpToolKit?.httpdns;
  if (dns && Object.prototype.hasOwnProperty.call(dns, "httpdns")) {
    dns.httpdns = 0;
  }
} catch (e) {}

$done({ body: JSON.stringify(obj) });