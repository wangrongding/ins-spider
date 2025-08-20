const puppeteer = require('puppeteer') // v13.0.0 or later
const fs = require('fs')
const path = require('path')
const config = require('./config.json')

// 延迟
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 保存HTML到文件
async function saveHtmlToFile(html, filename) {
  const filePath = path.join(__dirname, filename)
  try {
    await fs.promises.writeFile(filePath, html, 'utf8')
    console.log(`HTML已保存到: ${filePath}`)
  } catch (error) {
    console.error('保存文件时出错:', error)
  }
}

// 解码HTML实体的函数
function decodeHtmlEntities(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

;(async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // 使用您的默认Chrome用户数据目录，这样可以保持登录状态 (没生效我擦)
    // userDataDir: '/Users/wangrongding/Library/Application Support/Google/Chrome/Default', // 这里替换成你的路径
    defaultViewport: {
      width: 1920, // 设置浏览器的宽度
      height: 1080, // 设置浏览器的高度
      deviceScaleFactor: 1, // 设置默认缩放比例
      isMobile: false, // 设置为true，则使用mobile user agent
      hasTouch: false, // 设置是否有触摸屏
      isLandscape: false, // 设置为true，则浏览器显示为横屏
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--start-maximized',
      '--max_old_space_size=2048', // 限制内存使用为2GB
      `--proxy-server=${config.proxy}`, // 使用配置文件中的代理设置
      '--disable-web-security', // 禁用web安全（有助于代理工作）
      '--disable-features=VizDisplayCompositor', // 提高兼容性
    ],
  })

  try {
    const [page] = await browser.pages()
    await page.setDefaultNavigationTimeout(60000) // 设置60秒超时

    console.log('正在导航到Instagram页面...')
    await page.goto('https://www.instagram.com/p/DNZJEZ5y29E/?img_index=1', {
      waitUntil: 'networkidle0',
    })

    console.log('页面加载完成，等待内容渲染...')
    await sleep(3000) // 等待3秒确保页面完全加载

    // 获取页面HTML
    console.log('正在获取页面HTML...')
    const html = await page.content()

    // 生成文件名（包含时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const decodedFilename = `instagram-page-decoded-${timestamp}.html`

    // 保存解码后的HTML到文件
    const decodedHtml = decodeHtmlEntities(html)
    await saveHtmlToFile(decodedHtml, decodedFilename)

    console.log('脚本执行完成！保存了解码版本')
  } catch (error) {
    console.error('执行过程中出错:', error)
  } finally {
    // 关闭浏览器
    // await browser.close()
  }
})()

// !! TODO 将以上的脚本执行修改成根据 url 列表 循环的，即可
