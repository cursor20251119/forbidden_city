const fs = require('fs');
const crypto = require('crypto');

// 配置项
const BASE_URL = 'https://bnuzleon.cn/g/'; // 中转页地址
const COUNT = 11000;

function generateUUID() {
    // 使用 Node.js 内置 crypto 生成 UUID v4，并移除连字符
    return crypto.randomUUID().replace(/-/g, '');
}

function getBatchString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}`;
}

function generate() {
    const timeStr = getBatchString();
    // 行业常用批次号格式: LOT + 年月日时分
    const batchId = `LOT${timeStr}`;
    const outputFile = `NFC_URLS_${batchId}.csv`;

    console.log(`开始生成 ${COUNT} 个 NFC 链接 (批次: ${batchId})...`);
    
    let content = 'ID,URL,UUID\n'; // CSV Header
    
    for (let i = 1; i <= COUNT; i++) {
        const uuid = generateUUID();
        // 新的 URL 格式: https://bnuzleon.cn/g/?id={UUID}&src=nfc
        const url = `${BASE_URL}?id=${uuid}&src=nfc`;
        // 格式: 序号, 完整URL, 原始UUID
        content += `${i},${url},${uuid}\n`;
    }

    fs.writeFileSync(outputFile, content, 'utf8');

    // 计算文件 MD5
    const fileHash = crypto.createHash('md5').update(content).digest('hex');
    const nowStr = new Date().toLocaleString();

    console.log(`
==================================================
✅  生成完成！
--------------------------------------------------
📅  生成时间: ${nowStr}
🏷️   批次编号: ${batchId}
📄  文件名称: ${outputFile}
🔢  数据总量: ${COUNT} 条
🔒  文件MD5 : ${fileHash}
--------------------------------------------------
⚠️   烧录前请核对 MD5 值，确保文件未被篡改。
==================================================
`);
}

generate();
