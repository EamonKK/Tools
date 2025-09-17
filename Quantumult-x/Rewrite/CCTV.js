/******************************
🧚🏻‍♂️项目名称：央视频 
🧚🏻‍♂️脚本作者：ios151
🧚🏻‍♂️特别说明：公益项目请勿盗用
🧚🏻‍♂️软件版本: 2024731最新版本
🧚🏻‍♂️注意事项：仅供学习 请勿传播售卖
***************************

[rewrite_local]

^http:\/\/(liveinfo|bkliveinfo|playvv)\.ysp\.cctv\.cn\/(playvinfo\?.+|.*) url script-request-header https://raw.githubusercontent.com/betraykk/Quantumult-x/main/CCTV.js

# 解锁[电视]内会员 如果登录提示错误的话 手动屏蔽下面这条
#^https:\/\/liveinfo\.ysp\.cctv\.cn\/ url script-request-header https://raw.githubusercontent.com/betraykk/Quantumult-x/main/CCTV.js
#^https:\/\/m\.yangshipin\.cn\/static\/\w/\w+\/index\.html$ url script-request-header https://raw.githubusercontent.com/betraykk/Quantumult-x/main/CCTV.js
# > 央视频 去广告
^https?:\/\/cdn\.cmgadx\.com\/sdk\/pool\/.+\.json url reject-dict


[mitm]
hostname = *.ysp.cctv.cn, cdn.cmgadx.com

*******************************/
