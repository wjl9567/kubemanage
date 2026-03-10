# KubeManage 交付清单

> 版本：v1.0 | 更新日期：按发布版本填写

---

## 1. 交付物列表

| 交付物 | 说明 | 位置/版本 |
|--------|------|-----------|
| 后端 API 服务 | Go + Gin，多集群 K8s、用户/审计/备份/监控/CRD 等 | `backend/`，见 `RELEASE.md` |
| 前端 SPA | React + Ant Design，管理台界面 | `frontend/`，构建产物置于 `backend/web` 或镜像内 `web/` |
| Docker 镜像 | 前后端一体镜像（可选单独前端静态资源） | 使用 `backend/deploy/docker/Dockerfile` 或项目根目录 `Dockerfile` 构建 |
| Docker Compose | 含 PostgreSQL、Redis、KubeManage 服务 | 项目根目录 `docker-compose.yml` 或 `backend/deploy/docker/docker-compose.yml` |
| 环境变量示例 | 生产必配与可选项 | 见 `DEPLOY-GUIDE.md` 与下方「环境变量」 |
| 部署手册 | 环境要求、快速部署、生产配置 | `DEPLOY-GUIDE.md` |
| 运维手册 | 启停、扩缩容、日志、备份与恢复、健康检查、常见问题 | `OPS-MANUAL.md` |
| 发布说明 | 功能边界、升级与兼容 | `RELEASE.md` |

---

## 2. 环境变量（生产必配与可选）

| 变量 | 必配 | 说明 |
|------|------|------|
| `JWT_SECRET` | 是 | JWT 签名密钥 |
| `ENCRYPT_KEY` | 是 | AES-256 密钥，**必须 32 字符**（加密 KubeConfig/Token） |
| `CORS_ORIGIN` | 推荐 | 前端允许来源，如 `https://kubemanage.example.com` |
| `DATABASE_URL` | 生产推荐 | PostgreSQL 连接串；不设则使用 SQLite 本地文件 |
| `REDIS_URL` | 可选 | Redis 连接，如 `redis://redis:6379` |
| `BACKUP_DIR` | 可选 | 备份文件目录；配置后「创建备份」会真实导出 DB 并支持下载 |
| `PROMETHEUS_URL` | 可选 | Prometheus 地址，如 `http://prometheus:9090`，用于监控图表 |
| `SQLITE_PATH` | 可选 | 未配置 DATABASE_URL 时 SQLite 文件路径，默认 `kubemanage.db` |
| `WEB_ROOT` | 可选 | 前端静态资源目录，默认 `web` |
| `PORT` | 可选 | 服务监听端口，默认 `8080` |

---

## 3. 版本与联系方式

- **版本号**：以 `RELEASE.md` 或 Git Tag 为准（如 v1.0）。
- **支持/反馈**：见项目 README 或内部约定（仓库 Issue、邮件等）。

---

## 4. 验收建议

- 部署完成后访问 `http://<host>:8080`，使用管理员账号登录。
- 调用 `GET /healthz` 返回 `{"status":"ok"}`。
- 添加至少一个集群（KubeConfig 或 Token），可查看节点、命名空间、工作负载。
- 若配置 `BACKUP_DIR` 与 `DATABASE_URL` 或 SQLite：创建备份后可在「系统设置-数据备份」中下载备份文件。
- 若配置 `PROMETHEUS_URL`：监控页可展示 CPU/内存/网络等曲线。
