<div align="center">
  <img src="https://github.com/SkrMiiKio/gold-price-monitor/blob/main/src/assets/dollar-alpha.png?raw=true">
  <h1 style="margin: 0;">gold-price-monitor</h1>
  <h3 style="margin: 0 0 0.5em;">金价实时监控</h3>
  <p style="margin: 0 0 1em;">精简悬浮窗监控桌面程序，实时监控黄金价格的变化</p>
  <p>
    <a href="https://github.com/SkrMiiKio/gold-price-monitor/releases"><img src="https://img.shields.io/badge/version-0.3.0-green"></a>
    <a href="https://www.electronjs.org"><img src="https://img.shields.io/badge/electron-28.x-4FC08D?logo=electron&logoColor=FFF"></a>
    <a href="https://github.com/SkrMiiKio"><img src="https://img.shields.io/badge/github-SkrMiiKio-blue?logo=github"></a>
    <a href="https://gitee.com/miikio"><img src="https://img.shields.io/badge/gitee-MiiKio-blue?logo=gitee"></a>
    <a href="https://opensource.org/license/gpl-3.0"><img src="https://img.shields.io/badge/license-GPLv3-orange"></a>
  </p>
</div>

---

## 📋 项目简介
* 主页 (github)：[https://github.com/SkrMiiKio/gold-price-monitor](https://github.com/SkrMiiKio/gold-price-monitor)
* 主页 (gitee)：[https://gitee.com/miikio/gold-price-monitor](https://gitee.com/miikio/gold-price-monitor)
* 最新版本：`0.3.0`
* 更新时间：2026-08-21
* 定位：金融分析工具、桌面程序、悬浮窗程序。
* 介绍：精简悬浮窗监控桌面程序，实时监控黄金价格的变化。接口基于京东金融平台，支持查看国际金价/银价/油价、各大银行积存金价格、美元指数、人民币汇率。
* 发行包下载：[Github下载](https://github.com/SkrMiiKio/gold-price-monitor/releases/latest)丨[Gitee下载](https://gitee.com/miikio/gold-price-monitor/releases/latest)

---

## 🛠️ 技术架构

* [node](https://nodejs.org)（>= 18.x）
* [electron](https://www.electronjs.org)（>= 28.x）
* [electron-forge](https://www.electronforge.io)（>= 7.x）

---

## 🚀 开发编译

```bash
# 安装依赖
npm install

# 本地开发演示
npm run start

# 打包程序目录
npm run package

# 生成安装文件
npm run make
```

---

## ⚙️ 数据源配置

| 名称 | 类型 | 来源 | 可用状态 |
|--|--|--|--|
| 伦敦金 | 国际金价 | 京东金融 | ✓ |
| 黄金T+D | 国内AU9999 | 京东金融 | ✓ |
| 民生积存金 | 银行积存金 | 京东金融 | ✓ |
| 浙商积存金 | 银行积存金 | 京东金融 | ✓ |
| 工商积存金 | 银行积存金 | 京东金融 | ✓ |
| 广发积存金 | 银行积存金 | 京东金融 | ✓ |
| 兴业积存金 | 银行积存金 | 京东金融 | ✓ |
| 中信积存金 | 银行积存金 | 京东金融 | ✓ |
| 京东24小时金价 | 金价指数 | 京东金融 | ✓ |
| 现货黄金 | 金价指数 | 京东金融 | ✓ |
| 现货白银 | 银价指数 | 京东金融 | ✓ |
| WTI原油 | 原油指数 | 京东金融 | ✓ |
| 布伦特原油 | 原油指数 | 京东金融 | ✓ |
| 人民币汇率 | 货币汇率 | 京东金融 | ✓ |
| 美元指数 | 货币指数 | 京东金融 | ✓ |

---

## 📸 应用截图

<img style="vertical-align: top;" src="https://github.com/SkrMiiKio/gold-price-monitor/blob/main/screenshot/demo-1.png?raw=true">
<img style="vertical-align: top;" src="https://github.com/SkrMiiKio/gold-price-monitor/blob/main/screenshot/demo-2.png?raw=true">
<img style="vertical-align: top;" src="https://github.com/SkrMiiKio/gold-price-monitor/blob/main/screenshot/demo-3.png?raw=true">
<img style="vertical-align: top;" src="https://github.com/SkrMiiKio/gold-price-monitor/blob/main/screenshot/demo-4.png?raw=true">
<img style="vertical-align: top;" src="https://github.com/SkrMiiKio/gold-price-monitor/blob/main/screenshot/demo-5.png?raw=true">

---

## © 版权许可

* [GPLv3](https://opensource.org/licenses/gpl-3.0)
* Copyright (c) 2026, MiiKio
