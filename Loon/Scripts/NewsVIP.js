// 精简底栏：只保留 news 和 live
try {
  const obj = JSON.parse($response.body);
  if (obj?.data?.items) {
    obj.data.items = obj.data.items.filter(i => i.key === "news" || i.key === "live");
  }
  $done({ body: JSON.stringify(obj) });
} catch (e) {
  $done({});
}