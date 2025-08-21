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

// 处理单个URL的核心逻辑
async function processInstagramUrl(page, url, index) {
  try {
    console.log(`正在处理第 ${index + 1} 个URL: ${url}`)

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    })

    console.log('页面加载完成，等待内容渲染...')
    await sleep(3000) // 等待3秒确保页面完全加载

    // 等待目标元素出现
    const imgSelector = '.x5yr21d.xu96u03.x10l6tqk.x13vifvy.x87ps6o.xh8yej3'
    const contentSelector =
      '.x193iq5w.xeuugli.x13faqbe.x1vvkbs.xt0psk2.x1i0vuye.xvs91rp.xo1l8bm.x5n08af.x10wh9bi.xpm28yp.x8viiok.x1o7cslx.x126k92a'

    try {
      console.log('等待图片元素加载...')
      await page.waitForSelector(imgSelector, { timeout: 10000 })
      console.log('等待内容元素加载...')
      await page.waitForSelector(contentSelector, { timeout: 10000 })
    } catch (error) {
      console.warn('等待元素超时，继续执行...', error.message)
    }

    // 使用 page.evaluate() 在浏览器上下文中执行代码
    const info = await page.evaluate(
      (imgSel, contentSel) => {
        const imgElement = document.querySelector(imgSel)
        const contentElement = document.querySelector(contentSel)

        return {
          url: window.location.href,
          img: imgElement ? imgElement.src : null,
          content: contentElement ? contentElement.innerText : null,
          timestamp: new Date().toISOString(),
        }
      },
      imgSelector,
      contentSelector
    )

    console.log(`成功处理URL: ${url}`)
    return info
  } catch (error) {
    console.error(`处理URL ${url} 时出错:`, error.message)
    return {
      url: url,
      img: null,
      content: null,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
}

;(async function main() {
  let browser

  try {
    // 检查配置文件中的URL列表
    const urls = config.urls.filter(url => url && url.trim() !== '' && url !== 'TODO')

    if (urls.length === 0) {
      console.error('配置文件中没有有效的URL，请在config.json中添加Instagram URL')
      return
    }

    console.log(`准备处理 ${urls.length} 个URL`)

    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
    await page.setDefaultNavigationTimeout(60000)

    // 存储所有结果的对象，使用索引作为键
    const results = {}

    // 循环处理每个URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      console.log(`\n=================== 开始处理第 ${i + 1}/${urls.length} 个URL ===================`)

      const result = await processInstagramUrl(page, url, i)
      // 使用索引作为键存储结果
      results[`item_${i + 1}`] = {
        index: i + 1,
        ...result
      }

      // 如果不是最后一个URL，等待一段时间避免被限制
      if (i < urls.length - 1) {
        console.log('等待2秒后处理下一个URL...')
        await sleep(2000)
      }
    }

    // 生成时间戳文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const jsonFilename = `instagram-data-${timestamp}.json`
    const jsonFilePath = path.join(__dirname, jsonFilename)

    // 将结果数组转换为数组格式以便统计
    const resultsArray = Object.values(results)

    // 保存所有结果到JSON文件
    const finalResults = {
      metadata: {
        totalProcessed: resultsArray.length,
        successCount: resultsArray.filter(r => !r.error).length,
        errorCount: resultsArray.filter(r => r.error).length,
        processedAt: new Date().toISOString(),
        description: '通过索引区分的Instagram数据采集结果'
      },
      data: results
    }

    try {
      await fs.promises.writeFile(jsonFilePath, JSON.stringify(finalResults, null, 2), 'utf8')
      console.log(`\n=================== 处理完成 ===================`)
      console.log(`总共处理: ${finalResults.metadata.totalProcessed} 个URL`)
      console.log(`成功: ${finalResults.metadata.successCount} 个`)
      console.log(`失败: ${finalResults.metadata.errorCount} 个`)
      console.log(`结果已保存到: ${jsonFilePath}`)
      console.log(`数据结构: 使用索引 item_1, item_2, ... 来区分不同条目`)
    } catch (error) {
      console.error('保存结果文件时出错:', error)
    }
  } catch (error) {
    console.error('执行过程中出错:', error)
  } finally {
    // 确保浏览器正确关闭
    if (browser) {
      // await browser.close()
      console.log('浏览器已关闭')
    }
  }
})()
