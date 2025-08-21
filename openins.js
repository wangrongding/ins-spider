const puppeteer = require('puppeteer') // v13.0.0 or later
const fs = require('fs')
const path = require('path')
const config = require('./config.json')
const { createBrowser, createPage } = require('./browser-config')

;(async function main() {
  let browser = await createBrowser()
  const page = await createPage(browser)

  console.log('正在导航到Instagram页面...')
  await page.goto('https://www.instagram.com/explore/search/keyword/?q=home-decor', {
    waitUntil: 'networkidle0',
  })

  console.log('页面加载完成...')
})()
