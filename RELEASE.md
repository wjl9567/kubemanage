# KubeManage 生产级/商业发布说明

## v1.0 生产就绪能力（当前版本）

- **多集群管理**：KubeConfig / Token 添加集群，重启自动解密重连
- **工作负载**：Deployment / StatefulSet / DaemonSet / Pod 查看与操作，命名空间从当前集群动态拉取
- **配置与存储**：ConfigMap / Secret / PVC / StorageClass 完整 CRUD
- **网络**：Service / Ingress 查看与删除
- **Pod 日志与终端**：WebSocket 实时日志、终端 Exec，URL 携带 Token 鉴权
- **用户与权限**：JWT 鉴权、角色（admin/operator/developer/viewer）、写操作 RoleAuth、CreateUser 角色白名单
- **审计**：API 请求落库（audit_log），设置页审计列表分页查询
- **系统设置**：全局配置（key-value）读写、告警渠道列表、手动备份创建与记录、修改密码真实 API
- **资源模板**：模板 CRUD、详情 YAML、复制到剪贴板
- **安全**：JWT_SECRET / ENCRYPT_KEY / CORS_ORIGIN 环境变量配置；KubeConfig/Token 加密存储

## 部署要求（生产环境）

1. **必配环境变量**（见 `DEPLOY-GUIDE.md`）：
   - `JWT_SECRET`：JWT 签名密钥
   - `ENCRYPT_KEY`：32 字符 AES-256 密钥
   - `CORS_ORIGIN`：前端来源（建议限制为具体域名）

2. **推荐**：使用项目根目录 `docker-compose.yml` + `Dockerfile` 构建一体镜像，PostgreSQL/Redis 仅本机访问。

## 功能边界说明

- **监控告警**：监控图表需对接 Prometheus 后展示；告警渠道在系统设置中配置，规则对接后生效。
- **日志分析**：当前按 Pod 在工作负载中查看实时日志；聚合日志需对接 EFK/Loki 等。
- **CRD 管理**：当前为示例数据；集群 CRD 列表可后续通过 K8s Dynamic Client 对接。

## 升级与兼容

- 数据库：GORM AutoMigrate，新增表/字段自动迁移。
- 密钥轮换：更换 `JWT_SECRET` / `ENCRYPT_KEY` 后需重新登录；已存 KubeConfig/Token 需重新保存以用新密钥加密。
