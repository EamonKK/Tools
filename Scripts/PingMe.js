//2026/04/16 修复版 Surge/QX 通用
/*
@Name：PingMe 自动化签到+视频奖励（兼容版）
*/

const scriptName = 'PingMe';
const ckKey = 'pingme_capture_v3';
const SECRET = '0fOiukQq7jXZV2GRi9LGlO';
const MAX_VIDEO = 5;
const VIDEO_DELAY = 8000;

// ====== 环境兼容 ======
const isQX = typeof $prefs !== "undefined";

const $store = {
  get: key => isQX ? $prefs.valueForKey(key) : $persistentStore.read(key),
  set: (key, val) => isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key)
};

const $http = {
  get: options => {
    if (typeof $task !== "undefined") return $task.fetch(options);
    return new Promise((resolve, reject) => {
      $httpClient.get(options, (err, resp, body) => {
        if (err) reject(err);
        else resolve({ statusCode: resp.status, body });
      });
    });
  }
};

function notify(title, body) {
  $notify(scriptName, title, body);
}

// ====== MD5 ======
function MD5(string) {
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
  const S=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  for(let k=0;k<x.length;k+=16){
    let AA=a,BB=b,CC=c,DD=d;
    a=FF(a,b,c,d,x[k+0],S[0],0xD76AA478);d=FF(d,a,b,c,x[k+1],S[1],0xE8C7B756);
    c=FF(c,d,a,b,x[k+2],S[2],0x242070DB);b=FF(b,c,d,a,x[k+3],S[3],0xC1BDCEEE);
    a=GG(a,b,c,d,x[k+1],S[4],0xF61E2562);d=GG(d,a,b,c,x[k+6],S[5],0xC040B340);
    c=GG(c,d,a,b,x[k+11],S[6],0x265E5A51);b=GG(b,c,d,a,x[k+0],S[7],0xE9B6C7AA);
    a=HH(a,b,c,d,x[k+5],S[8],0xFFFA3942);d=HH(d,a,b,c,x[k+8],S[9],0x8771F681);
    c=HH(c,d,a,b,x[k+11],S[10],0x6D9D6122);b=HH(b,c,d,a,x[k+14],S[11],0xFDE5380C);
    a=II(a,b,c,d,x[k+0],S[12],0xF4292244);d=II(d,a,b,c,x[k+7],S[13],0x432AFF97);
    c=II(c,d,a,b,x[k+14],S[14],0xAB9423A7);b=II(b,c,d,a,x[k+5],S[15],0xFC93A039);
    a=AddUnsigned(a,AA);b=AddUnsigned(b,BB);c=AddUnsigned(c,CC);d=AddUnsigned(d,DD);
  }
  return (WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d)).toLowerCase();
}

// ====== 工具函数 ======
function getUTCSignDate() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function parseRawQuery(url) {
  const q = (url.split('?')[1] || '').split('#')[0];
  const m = {};
  q.split('&').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) m[p.slice(0,i)] = p.slice(i+1);
  });
  return m;
}

function buildSignedParamsRaw(capture) {
  const params = {};
  Object.keys(capture.paramsRaw).forEach(k => {
    if (k !== 'sign' && k !== 'signDate') params[k] = capture.paramsRaw[k];
  });
  params.signDate = getUTCSignDate();
  const base = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  params.sign = MD5(base + SECRET);
  return params;
}

function buildUrl(path, capture) {
  const p = buildSignedParamsRaw(capture);
  const qs = Object.keys(p).map(k => `${k}=${encodeURIComponent(p[k])}`).join('&');
  return `https://api.pingmeapp.net/app/${path}?${qs}`;
}

// ====== 主逻辑 ======
if (typeof $request !== 'undefined') {

  const capture = {
    url: $request.url,
    paramsRaw: parseRawQuery($request.url),
    headers: $request.headers
  };

  $store.set(ckKey, JSON.stringify(capture));
  notify('✅ 抓参成功', '已保存数据');
  $done({});

} else {

  const raw = $store.get(ckKey);

  if (!raw) {
    notify('⚠️ 未抓参', '请先打开 PingMe');
    $done();
  }

  const capture = JSON.parse(raw);
  const msgs = [];

  function fetchApi(path) {
    return $http.get({
      url: buildUrl(path, capture),
      headers: capture.headers
    });
  }

  fetchApi('queryBalanceAndBonus')
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`💰余额：${d.result.balance}`);
      return fetchApi('checkIn');
    })
    .then(res => {
      const d = JSON.parse(res.body);
      msgs.push(`✅签到：${d.retmsg}`);
      notify('🎉 完成', msgs.join('\n'));
      $done();
    })
    .catch(e => {
      notify('❌失败', String(e));
      $done();
    });
}