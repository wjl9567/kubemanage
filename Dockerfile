# ============================================================
# KubeManage v1.0 Docker 构建文件
# 构建命令: docker build -t kubemanage:v1.0 .
# 必须在项目根目录执行（包含 backend/ 和 frontend/ 的目录）
# ============================================================

# ===== Backend Build =====
FROM golang:1.22-alpine AS backend-builder
WORKDIR /build
ENV GOPROXY=https://goproxy.cn,direct
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /kubemanage-server ./cmd/apiserver/

# ===== Frontend Build =====
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --registry=https://registry.npmmirror.com || npm install --registry=https://registry.npmmirror.com
COPY frontend/ ./
RUN npm run build

# ===== Final Image =====
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata curl
ENV TZ=Asia/Shanghai

WORKDIR /app

# 后端二进制
COPY --from=backend-builder /kubemanage-server .

# 前端静态文件
COPY --from=frontend-builder /build/dist ./web

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/healthz || exit 1

ENTRYPOINT ["./kubemanage-server"]
