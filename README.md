<!-- markdownlint-disable MD033 MD041 -->
<div align="center">
  <h1>SubBoost</h1>
  <p>A personal, self-hosted Clash / Mihomo subscription manager and configuration generator.</p>
  <p>
    <img src="https://img.shields.io/badge/platform-Linux%20%2B%20Docker-lightgrey.svg" alt="Platform: Linux + Docker">
    <img src="https://img.shields.io/badge/mode-personal%20self--hosted-blue.svg" alt="Personal self-hosted">
  </p>
  <p><strong><a href="README.md">English</a> | <a href="README-CN.md">中文</a></strong></p>
</div>
<!-- markdownlint-enable MD033 MD041 -->

## Purpose

This fork is a **single-administrator, personal-use** deployment. After signing in, you manage your own subscriptions and generated configurations directly. It does not provide a public online service, shared users, a template marketplace, or quota management.

The interface intentionally uses a restrained light theme. The subscription list is the entry page, while the editor retains quick mode, advanced mode, and YAML / visual previews.

## Features

- Import subscription URLs, YAML configurations, and node links; generate Clash / Mihomo subscriptions.
- Manage subscriptions: edit, refresh, copy the subscription URL, clone, and delete.
- Scheduled subscription refresh with optional smart node matching.
- Advanced settings for node filtering, relay proxy groups, rules, DNS, and listener ports.
- Node speed testing using TCP / TLS / UDP probes and latency-based output filtering.
- Three built-in presets are retained; template management and sharing are intentionally omitted.

## Deployment

Docker, Docker Compose v2, and Docker Buildx are required. The included Compose stack stores data in a SQLite file under `./data`.

```bash
git clone https://github.com/ddv12138/subboost.git
cd subboost/local
```

Create `local/.env` with the following values. Use long random secrets and do not commit this file.

```dotenv
SUBBOOST_DATA_DIR=./data
DATABASE_URL=file:/data/subboost.db
ENCRYPTION_KEY=replace-with-a-long-random-secret
JWT_SECRET=replace-with-a-long-random-secret
CRON_SECRET=replace-with-a-long-random-secret

# Optional; default is http://localhost:3000
SUBBOOST_PORT=3000
APP_URL=https://subboost.example.com
```

Build and start the stack:

```bash
mkdir -p data
sudo chown 1000:1000 data
COMPOSE_BAKE=true docker compose up -d --build
```

Existing PostgreSQL installations must migrate their records before changing `DATABASE_URL`; follow [the migration guide](docs/postgresql-to-sqlite.md). The original PostgreSQL files are not converted automatically.

Open `APP_URL` (or `http://server-address:SUBBOOST_PORT`) and complete local administrator setup when prompted.

Useful operations:

```bash
# Inspect status and application logs
docker compose ps
docker compose logs -f app

# Update source and rebuild
git pull
COMPOSE_BAKE=true docker compose up -d --build
```

The first build downloads base images and npm dependencies, so it naturally takes longer. Later builds reuse Docker's dependency layer as long as package manifests and the Dockerfile do not change.

## Development and verification

```bash
npm ci
npm run lint
npx vitest run
npm --prefix local run typecheck
```

## Intentionally excluded

- Public online hosting and multi-user sharing.
- Template upload, template library, and template quotas.
- YAML download actions; add the subscription URL to your client instead.
- A separate account settings page; log out from the user menu directly.

## License and disclaimer

The project is licensed under [GNU Affero General Public License v3.0 only](./LICENSE). It does not provide any proxy service and makes no guarantees about the availability or legality of third-party subscription content.
