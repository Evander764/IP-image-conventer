# IP-image-conventer

本地桌面应用：输入或导入 Markdown，选择平台和模板，生成封面、3:4 正文分页图、长图，并支持 PNG/JPG/WebP 导出。

## 日常使用

日常使用不需要命令行：双击桌面上的 `IP-image-conventer` 图标即可打开应用。

工作台按 4 步组织：

1. 内容：导入 `.md` 文件，填写标题、副标题、作者和标签。
2. 设计：选择小红书、公众号或通用平台，切换模板，上传封面底图，编辑封面提示词，并调整标题字号。
3. 预览：查看封面、正文分页和长图效果。
4. 导出：选择 PNG/JPG/WebP，导出封面、单页图、长图或全部素材；JPG 使用最高质量，WebP 使用无损导出。

## 模板

当前内置 9 套模板，主推 3 套参考图落地模板排在前面：

- 蓝色科技系统：浅蓝网格、编号标题、提示卡片，适合 AI、效率、产品和技术文章。
- 黑白商务报告：黑白灰、强标题、左竖线引用，适合公众号、商业分析和观点长文。
- 暖金阅读专栏：米白纸感、金色强调、柔和引用块，适合成长、读书和方法论内容。
- 清爽杂志：知识长文、公众号阅读。
- 强观点：爆款观点、金句和高对比内容。
- 清新笔记：小红书笔记、方法清单和轻教程。
- 清新阅读：旧山水修行风。
- 温暖治愈：旧随笔纸感风。
- 手账成长：旧手账贴纸风。

长图使用专门的无缝渲染模式，会隐藏重复页眉、页脚、页码和装饰，避免明显拼接痕迹。

## 自动更新

应用启动后会自动检查 GitHub Releases 的最新版本。发现新版本时，会在预览区顶部提示，并提供“查看更新”入口。

更新仓库通过 `package.json` 的 `ipImageConverter.updateRepository` 配置，格式为 `owner/repo`。

## 输出

每次生成会创建项目目录：

```text
projects/<timestamp>-<article-slug>/
  source.md
  config.json
  output/
    cover_vertical.png
    cover_wechat.png
    page-001.png
    page-002.png
    long.png
    exports/
      xiaohongshu-all-cover-vertical.png
      xiaohongshu-all-page-001.png
      xiaohongshu-all-long.webp
```

## 开发与打包

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run dist
```

`npm run dist` 会生成 Windows 安装包和便携包，输出到 `release/`。
