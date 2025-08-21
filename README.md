# 使用

## 前置：先安装 Node.js

1. 访问 [Node.js 官网](https://nodejs.org/)，下载 LTS 版本（长期支持版本），运行安装包并按照向导完成安装
2. 打开终端/命令提示符，验证安装：
   ```bash
   node --version
   npm --version
   ```

## 安装项目依赖

进入当前项目文件夹，终端执行以下命令安装依赖：

```bash
npm install
```

### 2. 配置代理（可选）

编辑 `config.json` 文件，如果需要代理：

```json
{
  "proxy": "127.0.0.1:7890"
}
```

不需要代理可设置为空字符串 `""`。

### 3. 运行

```bash
# 搜索并抓取指定关键词的内容
npm start "关键词"

# 例如：
npm start "home-decor"
npm start "travel photography"
```

## 工作流程

1. **搜索阶段**：自动访问 Instagram 搜索页面，滚动收集链接（最多 200 个）
2. **抓取阶段**：逐个访问链接，获取详细内容并保存为 JSON 文件

## 分步运行（可选）

如果需要分步执行：

```bash
# 只搜索收集链接
npm run search "关键词"

# 只抓取详情（需要先有链接）
npm run get-details
```

## 输出文件

- `config.json` - 包含收集到的链接列表
- `instagram-data-{时间戳}.json` - 抓取到的详细内容
