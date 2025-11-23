const fs = require('fs');
const crypto = require('crypto');

// 配置项
const BASE_URL = 'https://forbidden-city.vercel.app/nfc'; // 替换为你的实际域名
const COUNT = 11000;
const OUTPUT_FILE = 'nfc_urls.csv';

function generateUUID() {
    // 使用 Node.js 内置 crypto 生成 UUID v4
    return crypto.randomUUID();
}

function generate() {
    console.log(`开始生成 ${COUNT} 个 NFC 链接...`);
    
    let content = 'ID,URL,UUID\n'; // CSV Header
    
    for (let i = 1; i <= COUNT; i++) {
        const uuid = generateUUID();
        const url = `${BASE_URL}/${uuid}`;
        // 格式: 序号, 完整URL, 原始UUID
        content += `${i},${url},${uuid}\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, content, 'utf8');
    console.log(`生成完成！文件已保存为: ${OUTPUT_FILE}`);
    console.log(`请将此文件发送给工厂进行烧录。`);
}

generate();
