# KubeManage 运维手册

> 面向运维人员：日常启停、扩缩容、日志、备份与恢复、健康检查与常见问题。

---

## 1. 启动 / 停止 / 重启

### Docker Compose（推荐）

```bash
# 启动（后台）
docker compose up -d

# 停止
docker compose stop

# 重启 KubeManage 服务
docker compose restart kubemanage

# 查看状态
docker compose ps
docker compose logs -f kubemanage
```

### 若使用 systemd 管理二进制

```bash
sudo systemctl start kubemanage
sudo systemctl stop kubemanage
sudo systemctl restart kubemanage
sudo systemctl status kubemanage
```

---

## 2. 扩缩容

- **Compose**：修改 `docker-compose.yml` 中 `kubemanage` 的 `replicas`（若使用 compose scale）或改为多副本 + 负载均衡。
- **K8s 部署**：调整 Deployment 的 `replicas` 或 HPA。
- 注意：多副本时会话与 JWT 无状态；若使用内存/本地 SQLite，需改为共享 PostgreSQL，并避免多实例同时写同一 SQLite 文件。

---

## 3. 日志位置与级别

- **Docker**：`docker compose logs kubemanage` 或 `docker logs <container_id>`
- **输出**：标准输出（JSON 或文本，取决于启动配置），无默认写盘路径；需集中日志时可挂载卷或使用日志驱动。
- **级别**：当前为生产模式（GIN_MODE=release）；调试可临时设置 `GIN_MODE=debug`（不建议生产长期使用）。

---

## 4. 备份与恢复

### 4.1 备份（导出）

- **条件**：配置环境变量 `BACKUP_DIR`（如 `/data/backups`），并确保进程对该目录有写权限。
- **PostgreSQL**：同时配置 `DATABASE_URL`。创建备份时会调用 `pg_dump` 生成 `BACKUP_DIR/backup-20060102-150405.sql`。**宿主机需安装 `pg_dump`**（与 PostgreSQL 版本兼容）。
- **SQLite**：未配置 `DATABASE_URL` 时使用 SQLite；备份为复制 `kubemanage.db`（或 `SQLITE_PATH`）到 `BACKUP_DIR/backup-20060102-150405.db`。
- **操作**：管理台「系统设置 → 数据备份」中点击「全量备份」，完成后在备份记录中可「下载」备份文件。

### 4.2 恢复（仅文档说明，不在界面执行）

**PostgreSQL：**

1. 停止 KubeManage 服务（避免连接占用）。
2. 使用 `psql` 或 `pg_restore` 恢复（示例）：
   ```bash
   # 若为 plain SQL（pg_dump 默认）
   psql -h <host> -U kubemanage -d kubemanage -f /path/to/backup-20060102-150405.sql
   ```
3. 启动 KubeManage，验证登录与数据。

**SQLite：**

1. 停止 KubeManage 服务。
2. 用备份的 `.db` 文件覆盖当前 `kubemanage.db`（或 `SQLITE_PATH` 指向的路径）。
3. 启动 KubeManage，验证登录与数据。

---

## 5. 健康检查

- **HTTP**：`GET http://<host>:8080/healthz`，正常返回 `200` 且 body `{"status":"ok"}`。
- **Docker**：可在 `docker-compose.yml` 中为 `kubemanage` 增加：
  ```yaml
  healthcheck:
    test: ["CMD", "wget", "-q", "-O", "-", "http://localhost:8080/healthz"]
    interval: 30s
    timeout: 10s
    retries: 3
  ```
- **K8s**：Deployment 的 `livenessProbe` / `readinessProbe` 使用同一 URL。

---

## 6. 常见问题与排查

| 现象 | 可能原因 | 处理建议 |
|------|----------|----------|
| 无法登录 / Token 无效 | JWT_SECRET 变更或未配置 | 固定并统一配置 JWT_SECRET；重新登录 |
| 集群连接失败 | KubeConfig/Token 错误或集群不可达 | 检查集群 API 地址、网络、证书；重新添加或更新凭证 |
| 备份创建成功但无文件/下载失败 | 未配置 BACKUP_DIR 或路径无写权限；PostgreSQL 未装 pg_dump | 配置 BACKUP_DIR、检查权限；PostgreSQL 场景在镜像或宿主机安装 pg_dump |
| 监控页无曲线 | 未配置 PROMETHEUS_URL 或 Prometheus 不可达 | 配置 PROMETHEUS_URL；确认 Prometheus 与 node_exporter 等数据源正常 |
| 前端白屏 / 404 | 静态资源未挂载或 WEB_ROOT 错误 | 确认构建产物在 `web/` 或 WEB_ROOT 指向目录，且存在 index.html |
| 跨域报错 | CORS_ORIGIN 与前端实际域名不一致 | 设置 CORS_ORIGIN 为前端访问的域名（如 https://kubemanage.example.com） |

---

## 7. 安全与密钥轮换

- 更换 **JWT_SECRET** 或 **ENCRYPT_KEY** 后，所有用户需重新登录；已存储的 KubeConfig/Token 需重新保存以便用新密钥加密。
- 生产环境务必使用强随机值，且不将密钥提交到代码库。
