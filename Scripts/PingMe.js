// ===== PingMe Surge纯净版 =====

const scriptName = "PingMe";
const ckKey = "pingme_capture_v3";
const SECRET = "0fOiukQq7jXZV2GRi9LGlO";

const MAX_VIDEO = 5;
const VIDEO_DELAY = 8000;

// ===== 通知 =====
function notify(title, body) {
  $notification.post(scriptName, title, body);
}

// ===== 存储 =====
function getData(key) {
  return $persistentStore.read(key);
}

function setData(val, key) {
  return $persistentStore.write(val, key);
}

// ===== HTTP =====
function get(url, headers) {
  return new Promise((resolve, reject) => {
    $httpClient.get({ url, headers }, (err, resp, body) => {
      if (err) reject(err);
      else resolve({ status: resp.status, body });
    });
  });
}

// ===== 工具 =====
function parseQuery(url) {
  const q = url.split("?")[1] || "";
  const map = {};
  q.split("&").forEach(p => {
    const i = p.indexOf("=");
    if (i > 0) map[p.slice(0, i)] = p.slice(i + 1);
  });
  return map;
}

function getUTC() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

// ===== MD5（精简版）=====
function md5(string) {

  function RotateLeft(lValue, iShiftBits){return(lValue<<iShiftBits)|(lValue>>>(32-iShiftBits));}

  function AddUnsigned(lX,lY){const lX4=lX&0x40000000,lY4=lY&0x40000000,lX8=lX&0x80000000,lY8=lY&0x80000000,lResult=(lX&0x3FFFFFFF)+(lY&0x3FFFFFFF);if(lX4&lY4)return lResult^0x80000000^lX8^lY8;if(lX4|lY4)return(lResult&0x40000000)?(lResult^0xC0000000^lX8^lY8):(lResult^0x40000000^lX8^lY8);return lResult^lX8^lY8;}

  function F(x,y,z){return(x&y)|((~x)&z);}function G(x,y,z){return(x&z)|(y&(~z));}

  function H(x,y,z){return x^y^z;}function I(x,y,z){return y^(x|(~z));}

  function FF(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(F(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}

  function GG(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(G(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}

  function HH(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(H(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}

  function II(a,b,c,d,x,s,ac){a=AddUnsigned(a,AddUnsigned(AddUnsigned(I(b,c,d),x),ac));return AddUnsigned(RotateLeft(a,s),b);}

  function ConvertToWordArray(str){const l=str.length,n=((l+8-(l+8)%64)/64+1)*16,a=Array(n-1).fill(0);let i=0;for(;i<l;i++)a[(i-(i%4))/4]|=str.charCodeAt(i)<<((i%4)*8);a[(i-(i%4))/4]|=0x80<<((i%4)*8);a[n-2]=l<<3;a[n-1]=l>>>29;return a;}

  function WordToHex(l){let s='';for(let i=0;i<=3;i++){const b=(l>>>(i*8))&255;s+=('0'+b.toString(16)).slice(-2);}return s;}

  const x=ConvertToWordArray(string);let a=0x67452301,b=0xEFCDAB89,c=0x98BADCFE,d=0x10325476;

  for(let k=0;k<x.length;k+=16){

    let AA=a,BB=b,CC=c,DD=d;

    a=FF(a,b,c,d,x[k+0],7,0xD76AA478);d=FF(d,a,b,c,x[k+1],12,0xE8C7B756);

    c=FF(c,d,a,b,x[k+2],17,0x242070DB);b=FF(b,c,d,a,x[k+3],22,0xC1BDCEEE);

    a=GG(a,b,c,d,x[k+1],5,0xF61E2562);d=GG(d,a,b,c,x[k+6],9,0xC040B340);

    c=GG(c,d,a,b,x[k+11],14,0x265E5A51);b=GG(b,c,d,a,x[k+0],20,0xE9B6C7AA);

    a=HH(a,b,c,d,x[k+5],4,0xFFFA3942);d=HH(d,a,b,c,x[k+8],11,0x8771F681);

    c=HH(c,d,a,b,x[k+11],16,0x6D9D6122);b=HH(b,c,d,a,x[k+14],23,0xFDE5380C);

    a=II(a,b,c,d,x[k+0],6,0xF4292244);d=II(d,a,b,c,x[k+7],10,0x432AFF97);

    c=II(c,d,a,b,x[k+14],15,0xAB9423A7);b=II(b,c,d,a,x[k+5],21,0xFC93A039);

    a=AddUnsigned(a,AA);b=AddUnsigned(b,BB);c=AddUnsigned(c,CC);d=AddUnsigned(d,DD);
  }

  return (WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d)).toLowerCase();
}

// ===== 构造请求 =====
function buildParams(capture) {
  const p = {};
  Object.keys(capture.params).forEach(k => {
    if (k !== "sign" && k !== "signDate") p[k] = capture.params[k];
  });
  p.signDate = getUTC();
  const base = Object.keys(p).sort().map(k => `${k}=${p[k]}`).join("&");
  p.sign = md5(base + SECRET);
  return p;
}

function buildUrl(path, capture) {
  const p = buildParams(capture);
  const qs = Object.keys(p).map(k => `${k}=${encodeURIComponent(p[k])}`).join("&");
  return `https://api.pingmeapp.net/app/${path}?${qs}`;
}

// ===== 主逻辑 =====
if (typeof $request !== "undefined") {

  const capture = {
    params: parseQuery($request.url),
    headers: $request.headers
  };

  setData(JSON.stringify(capture), ckKey);

  notify("✅ 抓参成功", "打开一次即可长期使用");
  $done({});

} else {

  const raw = getData(ckKey);

  if (!raw) {
    notify("⚠️ 未抓参", "先打开 PingMe");
    $done();
  }

  const capture = JSON.parse(raw);
  const headers = capture.headers;
  const msgs = [];

  function api(path) {
    return get(buildUrl(path, capture), headers);
  }

  function videoLoop() {
    let i = 0;

    function next() {
      if (i >= MAX_VIDEO) return Promise.resolve();

      return new Promise(resolve => {
        setTimeout(() => {
          i++;

          api("videoBonus").then(res => {
            try {
              const d = JSON.parse(res.body);
              if (d.retcode === 0) {
                msgs.push(`🎬视频${i} +${d.result.bonus}`);
                resolve(next());
              } else {
                msgs.push(`⏸视频${i} ${d.retmsg}`);
                resolve();
              }
            } catch {
              msgs.push(`❌视频${i}解析失败`);
              resolve();
            }
          }).catch(() => {
            msgs.push(`❌视频${i}请求失败`);
            resolve();
          });

        }, i === 0 ? 1500 : VIDEO_DELAY);
      });
    }

    return next();
  }

  // ===== 执行流程 =====
  api("queryBalanceAndBonus")
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`💰余额：${d.result.balance}`);
      return api("checkIn");
    })
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`✅签到：${d.retmsg}`);
      return videoLoop();
    })
    .then(() => api("queryBalanceAndBonus"))
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`💰最新：${d.result.balance}`);

      notify("🎉任务完成", msgs.join("\n"));
      $done();
    })
    .catch(err => {
      notify("❌失败", String(err));
      $done();
    });
}