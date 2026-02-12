# KubeManage v1.0 部署手册

> 本文档面向技术部署人员，指导如何在 Linux 服务器上部署 KubeManage 平台。

---

## 一、环境要求

### 服务器配置

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 4核 | 8核 |
| 内存 | 8GB | 16GB |
| 磁盘 | 100GB SSD | 200GB SSD |
| 操作系统 | CentOS 7.6+ / Ubuntu 18.04+ / Rocky Linux 8+ | Ubuntu 22.04 LTS |
| 网络 | 千兆网卡 | 千兆网卡 |

### 端口要求

| 端口 | 用途 | 说明 |
|------|------|------|
| 8080 | KubeManage 平台 | 对外访问端口（可配置） |
| 5432 | PostgreSQL | 仅本机访问 |
| 6379 | Redis | 仅本机访问 |

### 前置依赖

- Docker 20.10+
- Docker Compose 2.0+
- 可访问目标 K8s 集群的 APIServer

> 部署脚本会自动检测并安装 Docker，无需手动安装。

---

## 二、快速部署（推荐）

### 方式一：一键脚本部署

```bash
# 1. 克隆代码
git clone https://github.com/wjl9567/kubemanage.git
cd kubemanage

# 2. 执行一键部署
chmod +x deploy.sh
sudo ./deploy.sh
```

部署完成后会显示访问地址和管理账号。

### 方式二：Docker Compose 手动部署

```bash
# 1. 克隆代码
git clone https://github.com/wjl9567/kubemanage.git
cd kubemanage

# 2. 进入部署目录
cd backend/deploy/docker

# 3. 启动全部服务
docker-compose up -d

# 4. 查看状态
docker-compose ps
```

---

## 三、部署后配置

### 3.1 首次登录

1. 浏览器打开 `http://服务器IP:8080`
2. 使用默认账号登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. **登录后请立即修改密码**（系统设置 → 个人信息 → 修改密码）

### 3.2 注册 K8s 集群

1. 进入「多集群管理」页面
2. 点击「注册集群」
3. 填写集群信息：
   - 集群名称：如 `prod-cluster`
   - 集群类型：自建集群 / ACK / TKE / CCE / EKS
   - KubeConfig：粘贴目标集群的 kubeconfig 内容

```bash
# 获取 kubeconfig（在 K8s master 节点执行）
cat ~/.kube/config
```

4. 保存后，平台会自动连接集群并采集数据

### 3.3 配置告警渠道（可选）

进入「系统设置 → 告警渠道」，配置：
- 邮件通知：SMTP 服务器地址和发件人
- 钉钉机器人：Webhook URL
- 企业微信：Webhook URL

---

## 四、日常运维

### 4.1 管理脚本

部署完成后，使用 `/opt/kubemanage/manage.sh` 管理平台：

```bash
cd /opt/kubemanage

./manage.sh status    # 查看服务状态
./manage.sh logs      # 查看平台日志
./manage.sh restart   # 重启平台
./manage.sh stop      # 停止平台
./manage.sh start     # 启动平台
./manage.sh backup    # 备份数据库
./manage.sh restore backup_20260211.sql.gz  # 恢复数据库
```

### 4.2 查看日志

```bash
# 查看平台日志
./manage.sh logs kubemanage

# 查看数据库日志
./manage.sh logs postgres

# 查看 Redis 日志
./manage.sh logs redis
```

### 4.3 数据备份

```bash
# 手动备份
./manage.sh backup
# 输出：备份完成: /opt/kubemanage/backup/backup_20260211_103000.sql.gz

# 设置每日自动备份（添加 crontab）
echo "0 2 * * * /opt/kubemanage/manage.sh backup" | crontab -
```

### 4.4 版本升级

```bash
cd /opt/kubemanage

# 拉取最新代码
git pull origin master

# 重新构建并重启
docker-compose build --no-cache
docker-compose up -d

# 验证
./manage.sh status
```

---

## 五、目录结构

```
/opt/kubemanage/
├── docker-compose.yml    # Docker 编排文件
├── Dockerfile            # 镜像构建文件
├── .env                  # 环境变量（密码、密钥等）
├── manage.sh             # 运维管理脚本
├── backend/              # Go 后端源码
├── frontend/             # React 前端源码
├── config/               # 自定义配置
├── logs/                 # 平台运行日志
├── backup/               # 数据库备份
└── data/
    ├── postgres/         # PostgreSQL 数据
    └── redis/            # Redis 数据
```

---

## 六、常见问题

### Q1: 端口被占用怎么办？

修改 `.env` 文件中的 `PLATFORM_PORT` 后重启：

```bash
vim /opt/kubemanage/.env
# 修改 PLATFORM_PORT=9090

./manage.sh restart
```

### Q2: 忘记管理员密码

```bash
# 进入数据库重置密码
docker-compose exec postgres psql -U kubemanage -d kubemanage

# 执行 SQL（密码重置为 admin123）
UPDATE users SET password = '$2a$10$...' WHERE username = 'admin';
```

或者删除数据库重新初始化（数据会丢失）：
```bash
./manage.sh stop
rm -rf /opt/kubemanage/data/postgres/*
./manage.sh start
```

### Q3: 集群连接失败

1. 确认服务器能访问 K8s APIServer：
```bash
curl -k https://K8S_API_SERVER:6443/healthz
```

2. 确认 kubeconfig 中的 server 地址服务器可达
3. 确认 token/证书未过期

### Q4: 如何配置 HTTPS？

在前端加一层 Nginx 反向代理：

```nginx
server {
    listen 443 ssl;
    server_name kubemanage.example.com;

    ssl_certificate     /etc/ssl/kubemanage.crt;
    ssl_certificate_key /etc/ssl/kubemanage.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持（Pod 日志/终端）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 七、技术支持

| 渠道 | 信息 |
|------|------|
| 代码仓库 | https://github.com/wjl9567/kubemanage |
| 问题反馈 | GitHub Issues |

---

**KubeManage v1.0** | 企业级 Kubernetes 可视化管理平台
