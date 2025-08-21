const puppeteer = require('puppeteer') // v13.0.0 or later
const fs = require('fs')
const path = require('path')
const config = require('./config.json')

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

  console.log('正在导航到Instagram页面...')
  await page.goto('https://www.instagram.com/explore/search/keyword/?q=home-decor', {
    waitUntil: 'networkidle0',
  })

  console.log('页面加载完成...')
})()
