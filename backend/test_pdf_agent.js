#!/usr/bin/env node

/**
 * PDF Agent 流式对话测试脚本 (Node.js)
 * 
 * 使用方法:
 *   node test_pdf_agent.js <pdf-file-path>
 * 
 * 示例:
 *   node test_pdf_agent.js ./sample.pdf
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://localhost:8080/api/v1';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    log(`\n${'='.repeat(50)}`, 'cyan');
    log(title, 'cyan');
    log(`${'='.repeat(50)}`, 'cyan');
}

// HTTP 请求
function makeRequest(method, path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const requestOptions = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + url.search,
            method: method,
            headers: options.headers || {},
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// 上传 PDF
async function uploadPdf(filePath) {
    logSection('1. 上传 PDF 文件');

    if (!fs.existsSync(filePath)) {
        log(`✗ 文件不存在: ${filePath}`, 'red');
        process.exit(1);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 13);

    // 构建 multipart/form-data
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;
    body += fileBuffer.toString('binary') + `\r\n`;
    body += `--${boundary}--\r\n`;

    log('发送请求...', 'dim');

    const response = await makeRequest('POST', '/pdf/upload', {
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(body, 'binary'),
        },
        body: Buffer.from(body, 'binary'),
    });

    if (response.statusCode !== 200) {
        log(`✗ 上传失败: HTTP ${response.statusCode}`, 'red');
        process.exit(1);
    }

    try {
        const data = JSON.parse(response.body);
        if (data.code !== 200) {
            log(`✗ 上传失败: ${data.msg}`, 'red');
            process.exit(1);
        }

        const sessionId = data.data.session_id;
        log(`✓ PDF 上传成功`, 'green');
        log(`  Session ID: ${sessionId}`, 'dim');
        log(`  文件名: ${data.data.filename}`, 'dim');
        log(`  页数: ${data.data.page_count}`, 'dim');

        return sessionId;
    } catch (e) {
        log(`✗ 响应解析失败: ${e.message}`, 'red');
        process.exit(1);
    }
}

// 常规对话
async function chatNormal(sessionId, question) {
    logSection('2. 常规对话测试');

    const requestBody = JSON.stringify({
        question: question,
        session_id: sessionId
    });

    log('发送请求...', 'dim');

    const response = await makeRequest('POST', '/pdf/chat', {
        headers: {
            'Content-Type': 'application/json',
        },
        body: requestBody,
    });

    try {
        const data = JSON.parse(response.body);
        if (data.code !== 200) {
            log(`✗ 常规对话失败: ${data.msg}`, 'red');
            return;
        }

        log(`✓ 常规对话成功`, 'green');
        log(`\n回答:\n`, 'dim');
        log(data.data.answer, 'reset');
    } catch (e) {
        log(`✗ 响应解析失败: ${e.message}`, 'red');
    }
}

// 流式对话
async function chatStream(sessionId, question) {
    logSection('3. 流式对话测试');

    const requestBody = JSON.stringify({
        question: question,
        session_id: sessionId
    });

    log('建立连接...', 'dim');

    const response = await makeRequest('POST', '/pdf/chat/stream', {
        headers: {
            'Content-Type': 'application/json',
        },
        body: requestBody,
    });

    if (response.statusCode !== 200) {
        log(`✗ 流式对话失败: HTTP ${response.statusCode}`, 'red');
        return;
    }

    log(`✓ 连接成功`, 'green');
    log(`\n流式响应:\n`, 'dim');

    const lines = response.body.split('\n');
    let tokenCount = 0;
    let fullAnswer = '';

    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const token = line.substring(6);
            if (token) {
                process.stdout.write(colors.cyan + token + colors.reset);
                fullAnswer += token;
                tokenCount++;
            }
        }
    }

    log(`\n`, 'reset');
    log(`✓ 流式对话完成`, 'green');
    log(`  Token 数: ${tokenCount}`, 'dim');
    log(`  回答长度: ${fullAnswer.length} 字符`, 'dim');
}

// 多轮对话
async function followUp(sessionId, question) {
    logSection('4. 多轮对话测试');

    const requestBody = JSON.stringify({
        question: question,
        session_id: sessionId
    });

    log('发送后续问题...', 'dim');

    const response = await makeRequest('POST', '/pdf/chat', {
        headers: {
            'Content-Type': 'application/json',
        },
        body: requestBody,
    });

    try {
        const data = JSON.parse(response.body);
        if (data.code !== 200) {
            log(`✗ 多轮对话失败: ${data.msg}`, 'red');
            return;
        }

        log(`✓ 多轮对话成功`, 'green');
        log(`\n后续回答:\n`, 'dim');
        log(data.data.answer, 'reset');
    } catch (e) {
        log(`✗ 响应解析失败: ${e.message}`, 'red');
    }
}

// 清除会话
async function clearSession(sessionId) {
    logSection('5. 清除会话');

    const requestBody = JSON.stringify({
        session_id: sessionId
    });

    log('发送清除请求...', 'dim');

    const response = await makeRequest('POST', '/pdf/clear', {
        headers: {
            'Content-Type': 'application/json',
        },
        body: requestBody,
    });

    try {
        const data = JSON.parse(response.body);
        if (data.code !== 200) {
            log(`✗ 清除失败: ${data.msg}`, 'red');
            return;
        }

        log(`✓ 会话已清除`, 'green');
    } catch (e) {
        log(`✗ 响应解析失败: ${e.message}`, 'red');
    }
}

// 主函数
async function main() {
    logSection('PDF Agent 流式对话测试');

    const pdfPath = process.argv[2];
    if (!pdfPath) {
        log('使用方法: node test_pdf_agent.js <pdf-file-path>', 'yellow');
        log('示例: node test_pdf_agent.js ./sample.pdf', 'yellow');
        process.exit(1);
    }

    try {
        // 1. 上传 PDF
        const sessionId = await uploadPdf(pdfPath);

        // 2. 常规对话
        await chatNormal(sessionId, '这份文档的主要内容是什么？');

        // 3. 流式对话
        await chatStream(sessionId, '这份文档中最重要的信息是什么？');

        // 4. 多轮对话
        await followUp(sessionId, '能详细解释一下吗？');

        // 5. 清除会话
        await clearSession(sessionId);

        logSection('所有测试完成！');
    } catch (error) {
        log(`\n✗ 发生错误: ${error.message}`, 'red');
        if (error.code === 'ECONNREFUSED') {
            log('确保后端服务运行在 http://localhost:8080', 'yellow');
        }
        process.exit(1);
    }
}

main();
