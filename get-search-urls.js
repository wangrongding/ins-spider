const puppeteer = require('puppeteer') // v13.0.0 or later
const fs = require('fs')
const path = require('path')
const config = require('./config.json')

// 获取命令行参数中的搜索关键词
const keyword = process.argv[2]
if (!keyword) {
  console.error('请提供搜索关键词！')
  console.log('使用方法: node get-search-urls.js <关键词>')
  console.log('例如: node get-search-urls.js home-decor')
  process.exit(1)
}

console.log(`搜索关键词: ${keyword}`)
;(async function main() {
  let browser = await puppeteer.launch({
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    userDataDir: path.join(__dirname, 'user_data'),
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      isLandscape: false,
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--start-maximized',
      '--max_old_space_size=2048',
      `--proxy-server=${config.proxy}`,
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ],
  })

  const [page] = await browser.pages()
  await page.setDefaultNavigationTimeout(60000) // 设置60秒超时

  console.log(`正在导航到Instagram页面，搜索关键词: ${keyword}`)
  await page.goto(`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(keyword)}`, {
    waitUntil: 'networkidle0',
  })

  console.log('页面加载完成...')

  // 收集到的链接集合，用于去重
  const collectedUrls = new Set()

  // 收集当前页面的链接
  async function collectCurrentUrls() {
    const urls = await page.evaluate(() => {
      const selector = 'div.x78zum5.xdt5ytf.x11lt19s.x1n2onr6.xph46j.x7x3xai.xsybdxg.x194l6zq a'
      const links = document.querySelectorAll(selector)
      return Array.from(links).map(link => link.href)
    })
    console.log('🌸🌸🌸 / urls: ', urls)

    const beforeCount = collectedUrls.size
    urls.forEach(url => collectedUrls.add(url))
    const newCount = collectedUrls.size - beforeCount

    console.log(`本次收集到 ${urls.length} 个链接，新增 ${newCount} 个，总计 ${collectedUrls.size} 个`)
    return newCount > 0
  }

  // 滚动到页面底部
  async function scrollToBottom() {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
  }

  // 检查是否到达页面底部
  async function isAtBottom() {
    return await page.evaluate(() => {
      return window.innerHeight + window.scrollY >= document.body.scrollHeight - 100
    })
  }

  // 等待网络空闲
  async function waitForNetworkIdle() {
    return new Promise(resolve => {
      let timeoutId
      let requestCount = 0

      const onRequest = () => {
        requestCount++
        clearTimeout(timeoutId)
      }

      const onResponse = () => {
        requestCount--
        if (requestCount === 0) {
          timeoutId = setTimeout(() => {
            page.off('request', onRequest)
            page.off('response', onResponse)
            resolve()
          }, 500) // 500ms没有新的网络请求就认为空闲
        }
      }

      page.on('request', onRequest)
      page.on('response', onResponse)

      // 初始超时，防止无限等待
      setTimeout(() => {
        page.off('request', onRequest)
        page.off('response', onResponse)
        resolve()
      }, 10 * 1000) // 最多等待 10 秒
    })
  }

  // 主要的滚动收集逻辑
  console.log('开始收集链接...')

  let consecutiveNoNewUrls = 0
  let scrollCount = 0
  const maxScrolls = 50
  const maxConsecutiveNoNewUrls = 3
  const maxUrls = 200 // 收集到200个链接时停止

  // 先收集初始页面的链接
  await collectCurrentUrls()
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 开始滚动收集
  while (consecutiveNoNewUrls < maxConsecutiveNoNewUrls && scrollCount < maxScrolls && collectedUrls.size < maxUrls) {
    scrollCount++
    console.log(`第 ${scrollCount} 次滚动...`)

    // 滚动到底部
    await scrollToBottom()
    console.log('等待新内容加载...')

    // 等待网络空闲，确保新内容加载完成
    await waitForNetworkIdle()
    console.log('网络空闲，开始收集链接...')

    // 收集新的链接
    const hasNewUrls = await collectCurrentUrls()

    if (hasNewUrls) {
      consecutiveNoNewUrls = 0
    } else {
      consecutiveNoNewUrls++
      console.log(`连续 ${consecutiveNoNewUrls} 次没有新链接`)
    }

    // 检查是否达到目标数量
    if (collectedUrls.size >= maxUrls) {
      console.log(`已收集到目标数量 ${maxUrls} 个链接，停止滚动`)
      break
    }

    // 检查是否到达底部
    if ((await isAtBottom()) && consecutiveNoNewUrls > 0) {
      console.log('已到达页面底部')
      break
    }
  }

  console.log(`滚动结束，总共收集到 ${collectedUrls.size} 个唯一链接`)

  // 更新config.json文件
  const configData = JSON.parse(fs.readFileSync('./config.json', 'utf8'))
  configData.urls = Array.from(collectedUrls)

  fs.writeFileSync('./config.json', JSON.stringify(configData, null, 2))
  console.log(`已将 ${collectedUrls.size} 个链接写入 config.json`)

  // 输出前10个链接作为示例
  const sampleUrls = Array.from(collectedUrls).slice(0, 10)
  console.log('\n示例链接:')
  sampleUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`)
  })

  // await browser.close()
  console.log('脚本执行完成')
})()
