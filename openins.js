const { createBrowser, createPage } = require('./browser-config')

;(async function main() {
  let browser = await createBrowser()
  const page = await createPage(browser)

  console.log('正在导航到Instagram页面...')
  await page.goto('https://www.instagram.com/', {
    waitUntil: 'networkidle0',
  })
})()
