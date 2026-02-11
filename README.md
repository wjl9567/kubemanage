# KubeManage - 企业级 Kubernetes 可视化管理平台

> 可视化、一体化、智能化的 Kubernetes 管理平台

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite + ECharts |
| 后端 | Go 1.22 + Gin + client-go + GORM |
| 数据库 | PostgreSQL 15 + Redis 7 |
| 监控 | Prometheus + Grafana + Loki |
| 部署 | Docker + Helm + Kubernetes |

## 功能模块

- **多集群管理** - 集群注册/纳管/总览/跨集群操作
- **集群总览** - 实时状态/资源使用率/告警/微服务拓扑
- **节点管理** - 节点列表/监控/事件/运维
- **工作负载** - Deployment/StatefulSet/DaemonSet/Pod 管理
- **配置管理** - ConfigMap/Secret 增删改查/版本对比
- **存储管理** - StorageClass/PVC 管理
- **网络资源** - Service/Ingress 管理
- **监控告警** - Prometheus集成/告警规则/通知渠道
- **日志分析** - Loki集成/多条件检索/日志联动
- **系统设置** - 认证/审计/全局配置/数据备份

## 快速启动

### Docker Compose 启动（推荐）

```bash
cd backend/deploy/docker
docker-compose up -d
```

访问 http://localhost:8080，默认账号：`admin` / `admin123`

### 开发环境

**后端：**
```bash
cd backend
go mod tidy
go run cmd/apiserver/main.go
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

前端访问 http://localhost:3000，自动代理 API 到 http://localhost:8080

## 项目结构

```
kube_calc_manage/
├── backend/                    # Go 后端
│   ├── cmd/apiserver/          # 主入口
│   ├── internal/
│   │   ├── apiserver/          # API处理层
│   │   │   ├── handler/        # 各模块Handler
│   │   │   ├── middleware/     # 中间件（JWT/RBAC/审计）
│   │   │   └── router/        # 路由注册
│   │   ├── k8s/               # K8s交互层
│   │   │   ├── client/        # 多集群客户端管理
│   │   │   └── resource/      # 资源操作封装
│   │   ├── model/             # 数据模型
│   │   └── pkg/               # 公共工具
│   └── deploy/                # 部署配置
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── app/               # 路由/布局
│   │   ├── modules/           # 功能模块页面
│   │   ├── components/        # 通用组件
│   │   ├── services/          # API服务
│   │   ├── stores/            # 状态管理
│   │   └── styles/            # 全局样式
│   └── package.json
└── README.md
```

## 默认端口

| 服务 | 端口 |
|------|------|
| 前端开发服务器 | 3000 |
| 后端 API | 8080 |
| PostgreSQL | 5432 |
| Redis | 6379 |

## License

MIT
