# SubBoost v2.4.0

## 中文

### 初始发布

这是 SubBoost 的首次公开发布。这个版本提供一个可以自行部署的 SubBoost 包，适合希望在自己的服务器上运行 SubBoost，并管理订阅转换、模板和规则配置的用户。

### 包含内容

- 一键部署脚本和 Docker Compose 配置，用于在 Linux 服务器上安装 SubBoost。
- 本地 Web 管理界面，用于创建管理员账号，并管理订阅、模板和规则。
- 共享的订阅解析、订阅生成、模板处理和规则处理能力。
- GitHub Release 资产：`install.sh`、`release.json`、`docker-compose.image.yml` 和 `subboost-manager`。
- 基于 AGPL-3.0-only 许可证发布的公开源码。

### 安装和更新

- 这是首次发布，新安装不需要人工迁移。
- 安装后，后续版本可以继续使用 `subboost update` 更新。
- 建议妥善保存 `/opt/subboost/.env` 和数据库备份，方便以后迁移或恢复。

## English

### Initial Release

This is the first public release of SubBoost. This version provides a self-hostable SubBoost package for users who want to run SubBoost on their own server and manage subscription conversion, templates, and rule configuration.

### What's Included

- A one-click deployment script and Docker Compose configuration for installing SubBoost on a Linux server.
- A local web management interface for creating an administrator account and managing subscriptions, templates, and rules.
- Shared subscription parsing, subscription generation, template processing, and rule processing capabilities.
- GitHub Release assets: `install.sh`, `release.json`, `docker-compose.image.yml`, and `subboost-manager`.
- Public source code released under the AGPL-3.0-only license.

### Installation and Updates

- This is the first release, so new installations do not require manual migration.
- After installation, future versions can continue to be updated with `subboost update`.
- Keep `/opt/subboost/.env` and database backups safe so future migration or recovery is easier.
