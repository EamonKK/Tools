// 移除会员权益中的 vip_article
try {
  const obj = JSON.parse($response.body);
  if (obj?.data?.vip_article !== undefined) {
    delete obj.data.vip_article;
  }
  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({});
}