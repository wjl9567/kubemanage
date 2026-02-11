# KubeManage v1.0 正式发布检查清单

## 一、环境准备（必须）

### 1. 安装 Go 语言环境
```powershell
# Windows 下载安装：
# 访问 https://go.dev/dl/ 下载 go1.22+.windows-amd64.msi
# 安装后验证：
go version
```

### 2. 安装 Docker Desktop
```powershell
# 访问 https://www.docker.com/products/docker-desktop/ 下载安装
# 安装后验证：
docker version
docker-compose version
```

### 3. 一键启动依赖服务（PostgreSQL + Redis）
```bash
cd backend/deploy/docker
docker-compose up -d postgres redis
```

## 二、后端编译与启动（必须）

```bash
cd backend
go mod tidy          # 下载依赖
go build -o kubemanage-server ./cmd/apiserver/   # 编译
./kubemanage-server  # 启动（自动创建数据库表和默认管理员）
```

## 三、连接真实 K8s 集群（必须）

登录平台后，在"多集群管理"页面：
1. 点击"注册集群"
2. 填写集群名称
3. 粘贴你的 kubeconfig 内容（从 ~/.kube/config 获取）
4. 保存

验证：集群总览页应该显示真实的节点数、Pod数等。

## 四、前端生产构建（必须）

```bash
cd frontend
npm run build   # 生产构建，输出到 dist/
```

构建产物部署到 Nginx 或由后端静态托管。

## 五、安全加固（正式发布前必须）

- [ ] 修改默认管理员密码（admin/admin123 → 强密码）
- [ ] 配置 JWT 密钥（环境变量 JWT_SECRET）
- [ ] 配置 AES-256 加密密钥（环境变量 ENCRYPT_KEY）
- [ ] 启用 HTTPS（配置 TLS 证书）
- [ ] 配置 CORS 白名单（限制访问来源）
- [ ] 关闭 Gin debug 模式（GIN_MODE=release）

## 六、监控组件部署（推荐）

```bash
# 部署 Prometheus（监控指标）
helm install prometheus prometheus-community/kube-prometheus-stack

# 部署 Loki（日志采集）
helm install loki grafana/loki-stack

# 部署 Grafana（可视化仪表盘）
# 通常包含在 kube-prometheus-stack 中
```

## 七、Docker 一键发布（推荐方式）

```bash
# 在项目根目录
cd backend/deploy/docker
docker-compose up -d   # 启动全部服务（PostgreSQL + Redis + KubeManage）
```

访问 http://your-server:8080

## 八、验收检查

- [ ] 能正常登录
- [ ] 能看到真实集群的节点、Pod、Deployment 数据
- [ ] 能对 Deployment 执行扩缩容
- [ ] 能查看 Pod 实时日志
- [ ] 能进入 Pod 终端执行命令
- [ ] 告警规则能正常触发
- [ ] 暗黑模式正常
- [ ] 操作审计日志有记录
