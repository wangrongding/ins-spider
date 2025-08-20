# 使用

## 先安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)，下载 LTS 版本（长期支持版本），运行安装包并按照向导完成安装
2. 打开终端/命令提示符，验证安装：
   ```bash
   node --version
   npm --version
   ```

## 安装依赖

进入当前项目文件夹，终端执行以下命令安装依赖：

```bash
npm install
```

### 3. 配置代理（如果梯子全局代理了，这里可以不用配置）

编辑 `config.json` 文件，修改代理设置：

```json
{
  "urls": ["TODO"],
  "proxy": "127.0.0.1:7890"
}
```

如果不需要代理，可以将 proxy 设置为空字符串。

### 4. 修改目标 URL

在 `index.js` 中找到以下行，替换为你想要抓取的 Instagram 帖子 URL：

```javascript
await page.goto('https://www.instagram.com/p/DNZJEZ5y29E/?img_index=1', {
  waitUntil: 'networkidle0',
})
```

### 5. 运行脚本

```bash
npm test
# 或
node index.js
```

## TODO

- [ ] 支持批量 URL 抓取
- [ ] 添加错误重试机制
- [x] 添加配置文件支持
