# 开源致谢 / Acknowledgements

ICHIGOMusic 的实现离不开以下开源项目、歌词数据源与社区工作。谨向所有作者与贡献者致谢。

> 各项目的代码、文档与素材版权归其原作者所有，并遵循各自的许可证。本文件仅用于说明来源，不改变上游许可证。若你计划分发、修改或商用本项目，请分别核对下列项目的授权条款，尤其是 **AGPL-3.0**、**LGPL-3.0** 与 **Non-Commercial License** 项目。

---

## 一、核心上游项目

### 1. 网易云音乐 API、音源与播放数据

| 项目 | 在本项目中的用途 | 许可证 |
| --- | --- | --- |
| [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced) | `ichigomusic/server/` 内嵌的网易云音乐 API 服务（`@neteasecloudmusicapienhanced/api` v4.36.x），由 Electron 主进程直接启动 | MIT |
| [Binaryify/NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) | 上述增强版 API 的上游原项目，`ichigomusic/server/LICENSE` 保留其版权声明 | MIT |
| [UnblockNeteaseMusic/server](https://github.com/UnblockNeteaseMusic/server) | 解灰引擎，通过 `@unblockneteasemusic/server` 提供多平台音源匹配与代理播放 | LGPL-3.0 |
| [@neteasecloudmusicapienhanced/unblockmusic-utils](https://www.npmjs.com/package/@neteasecloudmusicapienhanced/unblockmusic-utils) | 解灰与音源匹配封装，供 `server/module/song_url_match.js` 调用 | MIT |
| [SPlayer](https://github.com/SPlayer-Dev/SPlayer)（原 `imsyy/SPlayer`） | `server/module/song_url_match.js` 的 UNM-Server 适配方式参考（QQ / 酷狗 / 酷我 / 咪咕等） | AGPL-3.0 |
| [GD 音乐台](https://music.gdstudio.xyz/) | 第三方音源接口来源（`music-api.gdstudio.xyz`），由 `unblockmusic-utils` 的音源模块使用 | 第三方服务，遵循其使用条款 |
| [folltoshe/netease-report-listen-song](https://github.com/folltoshe/netease-report-listen-song) | `server/util/ncbl.js` 与 `server/module/scrobble_v1.js` 的 PLV/PLD 听歌打卡、NCBL 加密与上报实现 | AGPL-3.0 |
| [hcanyz/flutter-netease-music-api](https://github.com/hcanyz/flutter-netease-music-api) | `server/module/homepage_block_page.js`、`homepage_dragon_ball.js` 的首页数据结构参考 | MIT |

### 2. 歌词解析、逐字歌词与歌词数据

| 项目 | 在本项目中的用途 | 许可证 |
| --- | --- | --- |
| [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) | “莫奈”歌词布局与逐字动画的核心参考/移植来源：`src/components/lyrics/MonetLyricsEngine.js`、`MonetLyricsRail.jsx`、`MonetWordSweep.jsx`、`MonetPosterLayout.jsx`、`foliaRows.js`；以及 `server/util/qrcDecrypt.js`、`server/util/krcDecrypt.js`、`server/util/lyricMatch.js` 的 QRC/KRC 解密与多源逐字歌词匹配 | AGPL-3.0 |
| [amll-dev/amll-ttml-db](https://github.com/amll-dev/amll-ttml-db) | AMLL TTML 逐词歌词库，`server/util/lyricMatch.js` 通过 `amll-ttml-db.stevexmh.net` 获取 TTML 歌词 | CC0-1.0 |
| [amll-dev/applemusic-like-lyrics](https://github.com/amll-dev/applemusic-like-lyrics) | AMLL / Apple Music 风格 TTML 歌词格式与生态参考，对应 `src/utils/lyrics/lyricExporter.js` 的 TTML 导出与设置中的 AMLL 歌词源 | AGPL-3.0 |
| [hexenq/kuroshiro](https://github.com/hexenq/kuroshiro) | 日语歌词假名注音（Furigana）转换 | MIT |
| [hexenq/kuroshiro-analyzer-kuromoji](https://github.com/hexenq/kuroshiro-analyzer-kuromoji) | Kuroshiro 的 Kuromoji 形态素分析器 | MIT |
| [takuyaa/kuromoji.js](https://github.com/takuyaa/kuromoji.js) | 日语分词与词典运行时 | Apache-2.0 |

### 3. 视觉特效、PV 与文字动画

| 项目 | 在本项目中的用途 | 许可证 |
| --- | --- | --- |
| [852wa/JIZURA](https://github.com/852wa/JIZURA) | JIZURA 文字 PV / 动态排版引擎，集成于 `src/pv/jizura/jizuraLib.js`、`plannerBridge.js`，根目录 `JIZURA/` 为上游参考副本 | MIT |
| [DanteAlighieri13210914/pv-tool](https://github.com/DanteAlighieri13210914/pv-tool) | PV 可视化与动态排版引擎，`src/pv/**` 中的特效、模板与核心引擎源自该项目，`.reference-pv-tool/` 为上游参考副本 | Non-Commercial License |
| [stdio2016/pfa](https://github.com/stdio2016/pfa) | Audio FingerPrint 音频指纹算法，`public/afp/` 的 WASM 指纹运行时使用其能力，用于“听歌识曲 / 音频匹配” | 上游未声明许可证，请自行确认授权 |
| [stdio2016/bewpfa](https://github.com/stdio2016/bewpfa) | pfa 的 Web / WASM 版本（Audio FingerPrint WEB），`public/afp/afp.js`、`afp.wasm.js`、`rec.js` 的运行时来源 | 上游未声明许可证，请自行确认授权 |

---

## 二、前端、桌面与后端依赖

| 项目 | 用途 | 许可证 |
| --- | --- | --- |
| [Electron](https://github.com/electron/electron) | 桌面应用运行时、托盘、任务栏缩略图、桌面歌词窗口 | MIT |
| [React](https://github.com/facebook/react) / [React DOM](https://github.com/facebook/react) | 渲染层与组件模型 | MIT |
| [Vite](https://github.com/vitejs/vite) | 开发服务器与生产构建 | MIT |
| [PixiJS](https://github.com/pixijs/pixijs) | PV / 可视化特效的 WebGL 渲染 | MIT |
| [GSAP](https://gsap.com/) | 动画与时间轴控制 | GSAP Standard License |
| [Framer Motion](https://github.com/framer/motion) | 界面与歌词动效 | MIT |
| [sonner](https://github.com/emilkowalski/sonner) | 全局 Toast 通知（收藏、队列、复制、导入导出与错误反馈） | MIT |
| [cmdk](https://github.com/pacocoursey/cmdk) | Ctrl/Cmd+K 命令面板的搜索与键盘导航 | MIT |
| [TanStack Virtual](https://github.com/TanStack/virtual) | 播放队列的虚拟滚动 | MIT |
| [Radix UI](https://github.com/radix-ui/primitives) | 无障碍 UI 原语（Dialog、Select、Checkbox、AlertDialog、Progress、Slider、Switch、Tabs、ContextMenu、Popover、Tooltip 等） | MIT |
| [Lucide](https://github.com/lucide-icons/lucide) | 图标库（`lucide-react`） | ISC |
| [axios](https://github.com/axios/axios) | HTTP 客户端 | MIT |
| [Express](https://github.com/expressjs/express) | 内嵌 API 与一起听后端 | MIT |
| [cors](https://github.com/expressjs/cors) | 一起听后端跨域支持 | MIT |
| [PM2](https://github.com/Unitech/pm2) | 一起听后端的进程管理（`ichigomusicserver`） | AGPL-3.0 |
| [Socket.IO](https://github.com/socketio/socket.io) / [ws](https://github.com/websockets/ws) | 一起听房间的实时通信 | MIT |
| [music-metadata](https://github.com/Borewit/music-metadata) | 本地音频元数据解析 | MIT |
| [crypto-js](https://github.com/brix/crypto-js) | 加密与哈希 | MIT |
| [node-forge](https://github.com/digitalbazaar/forge) | RSA / TLS 相关加密 | BSD-3-Clause 或 GPL-2.0 |
| [qrcode](https://github.com/soldair/node-qrcode) | 登录二维码生成 | MIT |
| [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) | XML 解析 | MIT |
| [dotenv](https://github.com/motdotla/dotenv) | 环境变量加载 | BSD-2-Clause |
| [express-fileupload](https://github.com/richardgirges/express-fileupload) | 文件上传中间件 | MIT |
| [pac-proxy-agent](https://github.com/TooTallNate/proxy-agents) | 代理支持 | MIT |
| [tunnel](https://github.com/koichik/node-tunnel) | HTTP 隧道代理 | MIT |
| [yargs](https://github.com/yargs/yargs) | 命令行参数解析 | MIT |
| [safe-decode-uri-component](https://github.com/jridgewell/safe-decode-uri-component) | URI 解码 | MIT |
| [reflect-metadata](https://github.com/rbuckton/reflect-metadata) | 元数据反射 | Apache-2.0 |
| [gzip](https://www.npmjs.com/package/gzip) | GZIP 压缩支持 | MIT |
| [@fontsource/dotgothic16](https://github.com/fontsource/fontsource) | DotGothic16 字体资源 | OFL-1.1 |
| [electron-builder](https://github.com/electron-userland/electron-builder) | Windows 安装包构建 | MIT |

---

## 三、字体与图标

界面核心字体通过 `@fontsource-variable` 自托管，离线可用；PV 与歌词装饰字体按需加载：

- **Newsreader**（标题与展示衬线）— SIL Open Font License 1.1
- **Instrument Sans**（界面与正文无衬线）— SIL Open Font License 1.1
- **JetBrains Mono**（时长、码率等技术数字）— SIL Open Font License 1.1

PV、沉浸歌词与旧版歌词样式仍可按需使用以下字体（Google Fonts，均遵循其各自的开源字体许可证，通常为 SIL Open Font License 1.1）。这些字体不参与首屏阻塞加载：

- Inter
- Outfit
- Rajdhani
- Noto Sans SC
- Noto Serif JP / Noto Serif SC
- Zen Kaku Gothic New
- Shippori Mincho
- Klee One
- DotGothic16
- Press Start 2P
- Silkscreen
- VT323
- Ma Shan Zheng
- Rubik Glitch
- ZCOOL KuaiLe

图标来自 [Lucide](https://github.com/lucide-icons/lucide)（ISC License）。

---

## 四、特别说明

1. **本项目自身**以 MIT License 发布；上述第三方组件仍遵循各自许可证，不因被本项目引用而改变。
2. **PV Tool** 采用 Non-Commercial License。`src/pv/**` 中的特效、模板与引擎代码来自该项目，商业使用需另行取得原作者授权。
3. **folia-major**、**SPlayer**、**netease-report-listen-song** 采用 AGPL-3.0；**UnblockNeteaseMusic/server** 采用 LGPL-3.0。分发、修改或商用前请遵守对应许可证（包括源码开放、许可证保留等要求）。
4. `stdio2016/pfa` 与 `stdio2016/bewpfa` 未声明许可证，本项目仅致谢来源；如需再分发 `public/afp/` 中的运行时，请先向原作者确认授权。
5. 音乐、歌词、封面与相关元数据的版权归网易云音乐及各版权方所有，本项目仅供个人学习与技术交流使用。

---

## 五、补充与更正

如果你发现遗漏的项目、错误的归属或许可证信息，欢迎提交 Issue 或 Pull Request 补充。再次感谢所有开源作者与贡献者。
