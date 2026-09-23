<!-- markdownlint-disable MD033 MD041 -->
<div align="center">
  <h1>SubBoost</h1>
  <p>面向个人自部署的 Clash / Mihomo 订阅管理与配置生成工具。</p>
  <p>
    <img src="https://img.shields.io/badge/platform-Linux%20%2B%20Docker-lightgrey.svg" alt="平台：Linux + Docker">
    <img src="https://img.shields.io/badge/mode-personal%20self--hosted-blue.svg" alt="个人自部署">
  </p>
  <p><strong><a href="README.md">English</a> | <a href="README-CN.md">中文</a></strong></p>
</div>
<!-- markdownlint-enable MD033 MD041 -->

## 定位

这个 Fork 是一个**单管理员、个人使用**的自部署应用：登录后直接管理自己的订阅和配置。它不提供公共在线服务、用户共享、模板市场或配额体系。

界面采用尽量朴素的白底黑字设计，首页即订阅列表；编辑器保留快捷模式、高级模式和 YAML / 可视化预览。

## 功能

- 导入订阅链接、YAML 配置和节点链接，生成 Clash / Mihomo 订阅。
- 管理多个订阅：编辑、刷新、复制订阅链接、克隆和删除。
- 自动更新订阅，可选智能节点匹配。
- 高级配置：节点筛选、中转代理组、规则、DNS、监听端口等。
- 节点测速筛选：TCP / TLS / UDP 探测并按延迟选择输出节点。
- 预设配置保留三个内置选项；不提供模板管理和共享功能。

## 部署

需要 Docker、Docker Compose v2 和 Docker Buildx。PostgreSQL 会由随附的 Compose 栈自动启动。

```bash
git clone https://github.com/ddv12138/subboost.git
cd subboost/local
```

在 `local/.env` 中设置以下变量。请使用足够长的随机值；不要将此文件提交到 Git。

```dotenv
SUBBOOST_DATA_DIR=./data
DATABASE_URL=file:/data/subboost.db
ENCRYPTION_KEY=replace-with-a-long-random-secret
JWT_SECRET=replace-with-a-long-random-secret

# 可选：默认 http://localhost:3000
SUBBOOST_PORT=3000
APP_URL=https://subboost.example.com
```

首次启动前创建 SQLite 数据目录并交给容器使用的 `lk` UID/GID（1000:1000）：

```bash
mkdir -p data
sudo chown 1000:1000 data
```

构建并启动：

```bash
COMPOSE_BAKE=true docker compose up -d --build
```

已有 PostgreSQL 安装需要先迁移数据，再切换 `DATABASE_URL`；系统不会自动转换 PostgreSQL 数据。请按[迁移指南](docs/postgresql-to-sqlite.md)操作。

打开 `APP_URL`（或 `http://服务器地址:SUBBOOST_PORT`），按页面提示完成本地管理员初始化。

常用运维命令：

```bash
# 查看状态和日志
docker compose ps
docker compose logs -f app

# 更新到最新代码并重新构建
git pull
COMPOSE_BAKE=true docker compose up -d --build
```

首次构建需要下载 npm 依赖和基础镜像，耗时会更长。后续在 `package.json`、锁文件和 Dockerfile 未变化时，Docker 会复用依赖层缓存。

## 开发与校验

```bash
npm ci
npm run lint
npx vitest run
npm --prefix local run typecheck
```

## 不包含的能力

- 公共在线版或多人共享。
- 模板上传、模板库及模板配额。
- 下载 YAML 文件按钮；请使用订阅链接在客户端中添加订阅。
- 单独的账户设置页；退出登录可直接通过右上角用户菜单完成。

## 许可证与免责声明

本项目以 [GNU Affero General Public License v3.0 only](./LICENSE) 发布。项目不提供代理服务，也不对第三方订阅内容的可用性或合法性作出保证。
