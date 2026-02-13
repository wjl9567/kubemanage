# KubeManage 对接真实 K8s 集群指南

> 本文档记录对接真实 Kubernetes 集群所需的前置准备和操作步骤。

---

## 一、你需要提供的信息

对接前请准备以下内容：

| 序号 | 项目 | 说明 | 示例 |
|------|------|------|------|
| 1 | **KubeConfig 文件** | K8s 集群的访问凭证 | `~/.kube/config` |
| 2 | **APIServer 地址** | 集群 API 入口 | `https://10.0.1.10:6443` |
| 3 | **集群类型** | 自建 / 云托管 | 自建 / ACK / TKE / CCE / EKS |
| 4 | **集群版本** | K8s 版本 | v1.28.3 |
| 5 | **网络连通性** | 部署 KubeManage 的机器能否访问 APIServer | 能 / 需 VPN |

### 获取 KubeConfig

在 K8s **master 节点**上执行：

```bash
# 查看当前 kubeconfig
cat ~/.kube/config

# 或导出为文件
kubectl config view --raw > kubeconfig.yaml
```

### 云厂商托管集群获取方式

| 云厂商 | 获取方法 |
|--------|---------|
| **阿里云 ACK** | 容器服务控制台 → 集群列表 → 连接信息 → 复制 KubeConfig |
| **腾讯云 TKE** | 容器服务控制台 → 集群 → 基本信息 → Kubeconfig |
| **华为云 CCE** | 云容器引擎 → 集群管理 → kubectl 配置 |
| **AWS EKS** | `aws eks update-kubeconfig --name <cluster-name>` |

---

## 二、对接步骤（平台内操作）

### 步骤 1：登录平台

访问 `http://localhost:3100`，使用 admin / admin123 登录。

### 步骤 2：注册集群

1. 点击左侧菜单「**多集群管理**」
2. 点击右上角「**注册集群**」按钮
3. 填写表单：
   - **集群名称**：如 `prod-cluster`（英文，唯一标识）
   - **集群类型**：选择对应类型
   - **API Server 地址**：如 `https://10.0.1.10:6443`
   - **KubeConfig**：粘贴完整的 kubeconfig 内容
4. 点击确认

### 步骤 3：验证连接

注册成功后：
- 「集群总览」页面应显示真实的节点数、Pod数、资源使用率
- 「节点管理」页面应列出所有真实节点
- 「工作负载 → Pods」应显示集群中运行的所有 Pod

---

## 三、已就绪的后端能力

以下功能在对接真实集群后**立即可用**（代码已完成）：

| 功能 | 后端文件 | 说明 |
|------|---------|------|
| 多集群连接管理 | `k8s/client/manager.go` | client-go 连接池，支持同时管理多个集群 |
| 集群总览统计 | `k8s/resource/resource.go` → `GetClusterOverview()` | 实时统计节点/Pod/Deployment/Service/PVC 数量和状态 |
| 节点管理 | `handler/node/handler.go` | 列表/详情/Pod列表/事件，含 CPU/内存/状态信息 |
| Deployment 操作 | `handler/workload/handler.go` | 列表/详情/扩缩容/重启/删除 |
| Pod 操作 | `handler/workload/handler.go` | 列表/详情/删除，按命名空间/标签筛选 |
| Pod 实时日志 | `handler/workload/ws_handler.go` + `pkg/ws/` | WebSocket 流式传输，支持 follow/tail/容器切换 |
| Pod 终端 | `handler/workload/ws_handler.go` + `pkg/ws/` | WebSocket + SPDY exec，交互式 shell |
| ConfigMap/Secret | `handler/config/handler.go` | 增删改查，Secret 脱敏展示 |
| Service/Ingress | `handler/network/handler.go` | 列表/详情/删除 |
| StorageClass/PVC | `handler/storage/handler.go` | 列表/详情/删除 |
| 集群状态切换 | `handler/cluster/handler.go` | 启用/禁用/移除集群 |
| 加密存储 | `pkg/encrypt/aes.go` | KubeConfig 和 Token 使用 AES-256 加密存储 |
| JWT 认证 | `pkg/auth/jwt.go` | 真实 JWT 签发和校验 |
| RBAC 权限 | `middleware/auth.go` | 角色权限校验（admin/operator/developer/viewer） |
| 审计日志 | `middleware/audit.go` | 记录所有 API 调用（用户/IP/操作/时间） |

---

## 四、对接后需要进一步完善的功能

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P1 | **Prometheus 监控对接** | 从真实 Prometheus 拉取 CPU/内存/网络指标，替换 ECharts 模拟数据 |
| P1 | **Loki 日志对接** | 从真实 Loki 查询日志，替换模拟日志数据 |
| P2 | **Grafana 嵌入** | 嵌入 Grafana 仪表盘到监控页面 |
| P2 | **告警规则同步** | 将平台告警规则同步到 Prometheus AlertManager |
| P2 | **Jaeger 链路追踪** | 对接 Jaeger 展示微服务调用链路 |
| P3 | **Helm 应用市场** | 支持 Helm Chart 一键安装组件 |
| P3 | **YAML 资源创建** | 通过 YAML 编辑器直接创建 K8s 资源（apply） |

---

## 五、网络与安全检查清单

对接前确认：

- [ ] KubeManage 服务器能 ping 通 K8s APIServer IP
- [ ] 防火墙放行 6443 端口（或自定义 APIServer 端口）
- [ ] KubeConfig 中的 `server` 地址从 KubeManage 服务器可达
- [ ] ServiceAccount Token 未过期
- [ ] 如使用证书认证，CA 证书有效
- [ ] 如集群在内网，确认 VPN/专线已打通

### 快速验证网络连通

```bash
# 在 KubeManage 服务器上执行
curl -k https://<APISERVER_IP>:6443/healthz
# 应返回：ok
```

---

## 六、预期效果

对接成功后，平台将展示：

- **集群总览**：真实的节点数、Pod数、CPU/内存使用率、告警
- **节点管理**：所有真实节点的 IP、操作系统、K8s 版本、状态
- **工作负载**：真实的 Deployment/StatefulSet/DaemonSet 及其副本状态
- **Pod 运维**：所有真实 Pod，可查看实时日志、进入终端执行命令
- **配置管理**：真实的 ConfigMap/Secret（Secret 脱敏）
- **网络资源**：真实的 Service/Ingress 及端口映射
- **存储管理**：真实的 StorageClass/PVC 及挂载状态

---

**准备好 KubeConfig 后告诉我，我来帮你对接。**
