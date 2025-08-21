#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')

// 获取命令行参数中的搜索关键词
const keyword = process.argv[2]
if (!keyword) {
  console.error('请提供搜索关键词！')
  console.log('使用方法: npm start <关键词>')
  console.log('例如: npm start home-decor')
  process.exit(1)
}

console.log(`开始执行完整流程，搜索关键词: ${keyword}`)

// 执行搜索脚本
function runSearch() {
  return new Promise((resolve, reject) => {
    console.log('\n=== 步骤1: 收集链接 ===')
    const searchProcess = spawn('node', ['get-search-urls.js', keyword], {
      stdio: 'inherit',
      cwd: __dirname
    })

    searchProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ 链接收集完成')
        resolve()
      } else {
        reject(new Error(`搜索脚本执行失败，退出码: ${code}`))
      }
    })

    searchProcess.on('error', (err) => {
      reject(err)
    })
  })
}

// 执行详情获取脚本
function runGetDetails() {
  return new Promise((resolve, reject) => {
    console.log('\n=== 步骤2: 获取详情 ===')
    const detailsProcess = spawn('node', ['get-detail.js'], {
      stdio: 'inherit',
      cwd: __dirname
    })

    detailsProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ 详情获取完成')
        resolve()
      } else {
        reject(new Error(`详情获取脚本执行失败，退出码: ${code}`))
      }
    })

    detailsProcess.on('error', (err) => {
      reject(err)
    })
  })
}

// 串行执行
async function main() {
  try {
    await runSearch()
    await runGetDetails()
    console.log('\n🎉 完整流程执行成功！')
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message)
    process.exit(1)
  }
}

main()
