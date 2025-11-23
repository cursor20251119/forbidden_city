require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 静态资源托管 (请将图片命名为 poster.jpg 放入 public 文件夹)
app.use(express.static(path.join(__dirname, 'public')));

const APP_ID = process.env.WX_APP_ID;
const APP_SECRET = process.env.WX_APP_SECRET;

// 简单的内存缓存 Access Token
let cachedToken = null;
let tokenExpireTime = 0;

async function getAccessToken() {
    const now = Date.now();
    if (cachedToken && now < tokenExpireTime) {
        return cachedToken;
    }

    try {
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
        const response = await axios.get(url);
        
        if (response.data.access_token) {
            cachedToken = response.data.access_token;
            // 提前5分钟过期，确保安全
            tokenExpireTime = now + (response.data.expires_in - 300) * 1000;
            return cachedToken;
        } else {
            throw new Error(`获取Token失败: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        console.error('Get Access Token Error:', error);
        throw error;
    }
}

// --- 渠道处理逻辑 ---

// 微信渠道处理
async function handleWeChat(res, braceletId) {
    // 检查是否配置了 Secret
    if (!APP_SECRET || APP_SECRET === 'YOUR_SECRET_HERE') {
        return res.status(500).send('请在服务器 .env 文件中配置 WX_APP_SECRET');
    }

    try {
        const token = await getAccessToken();
        
        // 调用微信接口生成 URL Scheme
        const schemeUrl = `https://api.weixin.qq.com/wxa/generatescheme?access_token=${token}`;
        
        const payload = {
            "jump_wxa": {
                "path": "pages/index/index", 
                "query": `bid=${braceletId}` // 传递手链ID (UUID)
            },
            "is_expire": true,
            "expire_time": Math.floor(Date.now() / 1000) + 3600 // 1小时后失效
        };

        const wxRes = await axios.post(schemeUrl, payload);

        if (wxRes.data.errcode === 0) {
            const openLink = wxRes.data.openlink;
            
            // 返回一个 H5 页面进行自动跳转
            const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>瑞兽守护</title>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; background: #1a1a1a; }
        .bg {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            /* 故宫红渐变，大气且不暴露素材 */
            background: linear-gradient(to bottom, #a83232, #5e1b1b);
            z-index: -2;
        }
        /* 简单的光晕装饰 */
        .circle {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 215, 0, 0.05);
            filter: blur(30px);
        }
        .c1 { width: 300px; height: 300px; top: -50px; left: -50px; }
        .c2 { width: 200px; height: 200px; bottom: 10%; right: -20px; background: rgba(255, 215, 0, 0.08); }
        
        .overlay {
            height: 100%;
            width: 100%;
            position: absolute;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1;
        }
        .content {
            text-align: center;
            color: #e6cba6; /* 浅金色文字 */
            animation: fadeIn 1s ease-out;
        }
        .logo {
            font-size: 60px;
            margin-bottom: 20px;
            text-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .title {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 12px;
            letter-spacing: 4px;
        }
        .subtitle {
            font-size: 14px;
            opacity: 0.8;
            margin-bottom: 50px;
            font-weight: 300;
            letter-spacing: 2px;
        }
        .btn { 
            display: inline-block; 
            width: 180px;
            padding: 12px 0; 
            border: 1px solid #e6cba6;
            color: #e6cba6; 
            text-decoration: none; 
            border-radius: 50px; 
            font-size: 14px;
            transition: all 0.3s;
            background: rgba(0,0,0,0.2);
        }
        .btn:active { background: rgba(230, 203, 166, 0.2); }
        
        .loading-dots {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
        }
        .dot {
            width: 8px; height: 8px; background: #e6cba6; border-radius: 50%; margin: 0 4px;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .debug-info { position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 10px; color: rgba(255,255,255,0.1); }
    </style>
</head>
<body>
    <div class="bg"></div>
    <div class="circle c1"></div>
    <div class="circle c2"></div>
    
    <div class="overlay">
        <div class="content">
            <div class="logo">🦁</div>
            <div class="title">瑞兽守护</div>
            <div class="subtitle">正在开启您的专属守护</div>
            
            <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
            
            <a href="${openLink}" id="jumpBtn" class="btn">点击手动开启</a>
        </div>
    </div>
    <div class="debug-info">ID: ${braceletId}</div>

    <script>
        // 尝试自动跳转
        setTimeout(function() {
            window.location.href = "${openLink}";
        }, 500);
    </script>
</body>
</html>
            `;
            res.send(html);
        } else {
            console.error('WeChat API Error:', wxRes.data);
            res.status(500).send(`生成跳转链接失败: ${wxRes.data.errmsg} (Code: ${wxRes.data.errcode})`);
        }

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).send('服务器内部错误，请检查日志');
    }
}

// 默认/通用渠道处理 (非微信环境)
function handleDefault(res, braceletId) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>瑞兽守护</title>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
        .bg {
            /* 深色背景，不使用图片 */
            background: linear-gradient(to bottom, #2c3e50, #000000);
            height: 100%;
            width: 100%;
            position: absolute;
            z-index: -1;
        }
        .overlay {
            height: 100%;
            width: 100%;
            position: absolute;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            width: 80%;
            max-width: 320px;
            padding: 40px 20px;
            border-radius: 20px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
        }
        .icon { font-size: 48px; margin-bottom: 20px; }
        .title { font-size: 20px; font-weight: bold; margin-bottom: 15px; letter-spacing: 1px; }
        .text { font-size: 14px; line-height: 1.6; margin-bottom: 20px; opacity: 0.8; }
        .tag { 
            display: inline-block; 
            background: rgba(255,255,255,0.1); 
            color: rgba(255,255,255,0.6); 
            font-size: 12px; 
            padding: 4px 10px; 
            border-radius: 4px; 
        }
    </style>
</head>
<body>
    <div class="bg"></div>
    <div class="overlay">
        <div class="card">
            <div class="icon">📷</div>
            <div class="title">请使用微信扫一扫</div>
            <div class="text">为了完整体验瑞兽守护功能<br>请使用微信扫描 NFC 标签</div>
            <div class="tag">ID: ${braceletId}</div>
        </div>
    </div>
</body>
</html>
    `;
    res.send(html);
}

// --- 主路由 ---

app.get('/nfc/:id', async (req, res) => {
    const braceletId = req.params.id;
    const userAgent = req.headers['user-agent'] || '';
    
    // 简单的渠道判断策略
    if (userAgent.includes('MicroMessenger')) {
        // 微信环境
        await handleWeChat(res, braceletId);
    } else {
        // 其他环境 (浏览器、支付宝等)
        // 未来可以在这里添加 else if (userAgent.includes('AlipayClient')) { ... }
        handleDefault(res, braceletId);
    }
});

app.get('/', (req, res) => {
    res.send('NFC Redirect Service is Running. Use /nfc/{id} to test.');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
