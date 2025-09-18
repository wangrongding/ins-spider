const fs = require('fs')
const path = require('path')
const urls = require('./instagram-urls.json')
const { createBrowser, createPage } = require('./browser-config')

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

// 保存单个项目到JSON文件
async function saveItemToFile(item, filePath) {
  try {
    // 检查文件是否存在
    let existingData = { data: {}, metadata: { totalProcessed: 0, successCount: 0, errorCount: 0 } }
    
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8')
      existingData = JSON.parse(fileContent)
    } catch (error) {
      // 文件不存在或无法读取，使用默认结构
      console.log('创建新的数据文件...')
    }
    
    // 添加新的项目
    const itemKey = `item_${item.index}`
    existingData.data[itemKey] = item
    
    // 更新元数据
    const allItems = Object.values(existingData.data)
    existingData.metadata = {
      totalProcessed: allItems.length,
      successCount: allItems.filter(r => !r.error).length,
      errorCount: allItems.filter(r => r.error).length,
      lastUpdated: new Date().toISOString(),
      description: '通过索引区分的Instagram数据采集结果(实时更新)',
    }
    
    // 写入文件
    await fs.promises.writeFile(filePath, JSON.stringify(existingData, null, 2), 'utf8')
    console.log(`项目 ${item.index} 已保存到文件`)
  } catch (error) {
    console.error('保存项目到文件时出错:', error)
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

// 处理单个URL的核心逻辑并立即写入文件
async function processInstagramUrl(page, url, index, jsonFilePath) {
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

    const result = {
      index: index + 1,
      ...info,
    }

    // 立即保存到文件
    await saveItemToFile(result, jsonFilePath)
    
    console.log(`成功处理URL: ${url} 并已保存到文件`)
    return result
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

// 重启浏览器函数
async function restartBrowser(currentBrowser) {
  try {
    if (currentBrowser) {
      console.log('关闭当前浏览器实例...')
      await currentBrowser.close()
    }
    
    console.log('创建新的浏览器实例...')
    const newBrowser = await createBrowser()
    const newPage = await createPage(newBrowser)
    
    console.log('浏览器重启完成')
    return { browser: newBrowser, page: newPage }
  } catch (error) {
    console.error('重启浏览器时出错:', error)
    throw error
  }
}

;(async function main() {
  let browser

  try {
    // 检查URLs文件中的URL列表
    const filteredUrls = urls.filter(url => url && url.trim() !== '' && url !== 'TODO')

    if (filteredUrls.length === 0) {
      console.error('urls.json文件中没有有效的URL，请在urls.json中添加Instagram URL')
      return
    }

    console.log(`准备处理 ${filteredUrls.length} 个URL`)

    // 生成时间戳文件名，在开始处理前就确定文件路径
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const jsonFilename = `instagram-data-${timestamp}.json`
    const jsonFilePath = path.join(__dirname, jsonFilename)
    
    console.log(`数据将实时保存到: ${jsonFilename}`)

    // 初始化浏览器
    browser = await createBrowser()
    let page = await createPage(browser)

    // 存储处理结果的统计信息
    let successCount = 0
    let errorCount = 0

    // 每批处理的URL数量
    const BATCH_SIZE = 50

    // 循环处理URL，每50条重启一次浏览器
    for (let i = 0; i < filteredUrls.length; i++) {
      const url = filteredUrls[i]
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const positionInBatch = (i % BATCH_SIZE) + 1
      
      // 检查是否需要重启浏览器（除了第一个URL）
      if (i > 0 && i % BATCH_SIZE === 0) {
        console.log(`\n🔄 已处理 ${i} 条URL，正在重启浏览器...`)
        const browserData = await restartBrowser(browser)
        browser = browserData.browser
        page = browserData.page
        console.log(`✅ 浏览器重启完成，开始处理第 ${batchNumber} 批次`)
        
        // 重启后等待一下
        await sleep(2000)
      }

      console.log(`\n=================== 第${batchNumber}批次 - 第${positionInBatch}/${Math.min(BATCH_SIZE, filteredUrls.length - Math.floor(i / BATCH_SIZE) * BATCH_SIZE)}个 (总进度: ${i + 1}/${filteredUrls.length}) ===================`)

      const result = await processInstagramUrl(page, url, i, jsonFilePath)
      
      // 更新统计
      if (result.error) {
        errorCount++
      } else {
        successCount++
      }

      // 如果不是最后一个URL，等待一段时间避免被限制
      if (i < filteredUrls.length - 1) {
        console.log('等待2秒后处理下一个URL...')
        await sleep(2000)
      }
    }

    console.log(`\n=================== 处理完成 ===================`)
    console.log(`总共处理: ${filteredUrls.length} 个URL`)
    console.log(`成功: ${successCount} 个`)
    console.log(`失败: ${errorCount} 个`)
    console.log(`结果已实时保存到: ${jsonFilePath}`)
    console.log(`数据结构: 使用索引 item_1, item_2, ... 来区分不同条目`)
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
