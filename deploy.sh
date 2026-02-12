#!/bin/bash
#============================================================
# KubeManage v1.0 一键部署脚本
# 使用方式: chmod +x deploy.sh && ./deploy.sh
# 支持系统: CentOS 7+, Ubuntu 18.04+, Rocky Linux 8+
#============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}========== $1 ==========${NC}"; }

# 配置变量（可按需修改）
INSTALL_DIR="/opt/kubemanage"
DATA_DIR="/opt/kubemanage/data"
DB_PASSWORD="KubeManage@2026"
REDIS_PASSWORD="KubeManage@Redis2026"
PLATFORM_PORT=8080
JWT_SECRET="kubemanage-jwt-$(openssl rand -hex 16)"
ENCRYPT_KEY="$(openssl rand -hex 16)"  # 32 bytes for AES-256

#============================================================
log_step "1/6 环境检查"
#============================================================

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 root 用户或 sudo 执行此脚本"
    exit 1
fi

# 检查 Docker
if ! command -v docker &>/dev/null; then
    log_warn "Docker 未安装，正在自动安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker && systemctl start docker
    log_info "Docker 安装完成"
else
    log_info "Docker 已安装: $(docker --version)"
fi

# 检查 docker-compose
if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null; then
    log_warn "Docker Compose 未安装，正在安装..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_info "Docker Compose 安装完成"
else
    log_info "Docker Compose 已就绪"
fi

#============================================================
log_step "2/6 创建目录结构"
#============================================================

mkdir -p ${INSTALL_DIR}/{config,logs,backup}
mkdir -p ${DATA_DIR}/{postgres,redis,minio}
log_info "目录创建完成: ${INSTALL_DIR}"

#============================================================
log_step "3/6 生成配置文件"
#============================================================

# 生成 docker-compose.yml
cat > ${INSTALL_DIR}/docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  # ============ PostgreSQL 数据库 ============
  postgres:
    image: postgres:15-alpine
    container_name: kubemanage-postgres
    restart: always
    environment:
      POSTGRES_DB: kubemanage
      POSTGRES_USER: kubemanage
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - ${DATA_DIR}/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kubemanage"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============ Redis 缓存 ============
  redis:
    image: redis:7-alpine
    container_name: kubemanage-redis
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "127.0.0.1:6379:6379"
    volumes:
      - ${DATA_DIR}/redis:/data

  # ============ KubeManage 平台 ============
  kubemanage:
    image: kubemanage/platform:v1.0
    build:
      context: .
      dockerfile: Dockerfile
    container_name: kubemanage-server
    restart: always
    environment:
      DATABASE_URL: "host=postgres user=kubemanage password=${DB_PASSWORD} dbname=kubemanage port=5432 sslmode=disable"
      REDIS_URL: "redis://:${REDIS_PASSWORD}@redis:6379"
      GIN_MODE: release
      PORT: "8080"
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPT_KEY: ${ENCRYPT_KEY}
    ports:
      - "${PLATFORM_PORT}:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ${INSTALL_DIR}/logs:/app/logs
      - ${INSTALL_DIR}/backup:/app/backup
      - ${INSTALL_DIR}/config:/app/config

volumes:
  postgres_data:
  redis_data:
COMPOSE_EOF

# 替换变量
sed -i "s|\${DB_PASSWORD}|${DB_PASSWORD}|g" ${INSTALL_DIR}/docker-compose.yml
sed -i "s|\${REDIS_PASSWORD}|${REDIS_PASSWORD}|g" ${INSTALL_DIR}/docker-compose.yml
sed -i "s|\${DATA_DIR}|${DATA_DIR}|g" ${INSTALL_DIR}/docker-compose.yml
sed -i "s|\${PLATFORM_PORT}|${PLATFORM_PORT}|g" ${INSTALL_DIR}/docker-compose.yml
sed -i "s|\${JWT_SECRET}|${JWT_SECRET}|g" ${INSTALL_DIR}/docker-compose.yml
sed -i "s|\${ENCRYPT_KEY}|${ENCRYPT_KEY}|g" ${INSTALL_DIR}/docker-compose.yml
sed -i "s|\${INSTALL_DIR}|${INSTALL_DIR}|g" ${INSTALL_DIR}/docker-compose.yml

# 生成 Dockerfile（多阶段构建）
cat > ${INSTALL_DIR}/Dockerfile << 'DOCKERFILE_EOF'
# ===== Backend Build =====
FROM golang:1.22-alpine AS backend
WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /kubemanage-server ./cmd/apiserver/

# ===== Frontend Build =====
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --registry=https://registry.npmmirror.com
COPY frontend/ .
RUN npm run build

# ===== Final Image =====
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata curl
ENV TZ=Asia/Shanghai
WORKDIR /app
COPY --from=backend /kubemanage-server .
COPY --from=frontend /app/dist ./web
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/healthz || exit 1
ENTRYPOINT ["./kubemanage-server"]
DOCKERFILE_EOF

# 生成 .env 文件
cat > ${INSTALL_DIR}/.env << EOF
# KubeManage 环境配置
# 修改后执行: docker-compose up -d 重启生效

# 数据库密码
DB_PASSWORD=${DB_PASSWORD}

# Redis 密码
REDIS_PASSWORD=${REDIS_PASSWORD}

# 平台访问端口
PLATFORM_PORT=${PLATFORM_PORT}

# JWT 密钥（请勿泄露）
JWT_SECRET=${JWT_SECRET}

# AES-256 加密密钥（请勿泄露）
ENCRYPT_KEY=${ENCRYPT_KEY}
EOF

chmod 600 ${INSTALL_DIR}/.env

log_info "配置文件已生成"

#============================================================
log_step "4/6 复制项目文件"
#============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cp -r ${SCRIPT_DIR}/backend ${INSTALL_DIR}/
cp -r ${SCRIPT_DIR}/frontend ${INSTALL_DIR}/
log_info "项目文件已复制到 ${INSTALL_DIR}"

#============================================================
log_step "5/6 构建并启动服务"
#============================================================

cd ${INSTALL_DIR}
docker-compose build --no-cache
docker-compose up -d

log_info "等待服务启动..."
sleep 10

# 检查服务状态
if curl -sf http://localhost:${PLATFORM_PORT}/healthz > /dev/null 2>&1; then
    log_info "平台启动成功！"
else
    log_warn "平台可能还在启动中，请稍等片刻后访问"
fi

#============================================================
log_step "6/6 生成运维管理脚本"
#============================================================

cat > ${INSTALL_DIR}/manage.sh << 'MANAGE_EOF'
#!/bin/bash
# KubeManage 运维管理脚本
cd /opt/kubemanage

case "$1" in
  start)
    echo "启动 KubeManage..."
    docker-compose up -d
    echo "启动完成"
    ;;
  stop)
    echo "停止 KubeManage..."
    docker-compose down
    echo "已停止"
    ;;
  restart)
    echo "重启 KubeManage..."
    docker-compose restart
    echo "重启完成"
    ;;
  status)
    docker-compose ps
    ;;
  logs)
    docker-compose logs -f --tail=100 ${2:-kubemanage}
    ;;
  backup)
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="/opt/kubemanage/backup/backup_${TIMESTAMP}.sql"
    docker-compose exec -T postgres pg_dump -U kubemanage kubemanage > ${BACKUP_FILE}
    gzip ${BACKUP_FILE}
    echo "备份完成: ${BACKUP_FILE}.gz"
    ;;
  restore)
    if [ -z "$2" ]; then echo "用法: ./manage.sh restore <备份文件.sql.gz>"; exit 1; fi
    gunzip -c $2 | docker-compose exec -T postgres psql -U kubemanage kubemanage
    echo "恢复完成"
    ;;
  upgrade)
    echo "升级 KubeManage..."
    docker-compose pull
    docker-compose up -d
    echo "升级完成"
    ;;
  *)
    echo "KubeManage 运维管理"
    echo ""
    echo "用法: ./manage.sh <命令>"
    echo ""
    echo "命令:"
    echo "  start     启动平台"
    echo "  stop      停止平台"
    echo "  restart   重启平台"
    echo "  status    查看状态"
    echo "  logs      查看日志 (可选参数: postgres/redis/kubemanage)"
    echo "  backup    备份数据库"
    echo "  restore   恢复数据库"
    echo "  upgrade   升级平台"
    ;;
esac
MANAGE_EOF

chmod +x ${INSTALL_DIR}/manage.sh

#============================================================
# 完成
#============================================================

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       KubeManage v1.0 部署成功！                    ║${NC}"
echo -e "${GREEN}╠══════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  访问地址: ${YELLOW}http://${SERVER_IP}:${PLATFORM_PORT}${GREEN}                  ║${NC}"
echo -e "${GREEN}║  管理账号: ${YELLOW}admin${GREEN}                                    ║${NC}"
echo -e "${GREEN}║  管理密码: ${YELLOW}admin123${GREEN} (请登录后立即修改)            ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  安装目录: ${NC}/opt/kubemanage${GREEN}                         ║${NC}"
echo -e "${GREEN}║  管理脚本: ${NC}/opt/kubemanage/manage.sh${GREEN}               ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}║  常用命令:                                            ║${NC}"
echo -e "${GREEN}║    ./manage.sh status   查看服务状态                  ║${NC}"
echo -e "${GREEN}║    ./manage.sh logs     查看平台日志                  ║${NC}"
echo -e "${GREEN}║    ./manage.sh backup   备份数据库                    ║${NC}"
echo -e "${GREEN}║    ./manage.sh restart  重启平台                      ║${NC}"
echo -e "${GREEN}║                                                      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
