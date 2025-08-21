const puppeteer = require('puppeteer')
const path = require('path')
const config = require('./config.json')

/**
 * 创建 Puppeteer 浏览器实例
 * @param {Object} options - 可选的配置参数
 * @param {boolean} options.headless - 是否无头模式，默认 false
 * @returns {Promise<Browser>} 浏览器实例
 */
async function createBrowser(options = {}) {
  const { headless = false } = options

  const launchOptions = {
    headless,
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
      ...(config.proxy ? [`--proxy-server=${config.proxy}`] : []),
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
    ],
  }

  return await puppeteer.launch(launchOptions)
}

/**
 * 创建页面并设置默认配置
 * @param {Browser} browser - 浏览器实例
 * @param {number} timeout - 超时时间（毫秒），默认 60000
 * @returns {Promise<Page>} 页面实例
 */
async function createPage(browser, timeout = 60000) {
  const [page] = await browser.pages()
  await page.setDefaultNavigationTimeout(timeout)
  return page
}

module.exports = {
  createBrowser,
  createPage
}
