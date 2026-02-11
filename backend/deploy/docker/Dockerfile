# ============ Backend Build ============
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /kubemanage-server ./cmd/apiserver/

# ============ Frontend Build ============
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ============ Final Image ============
FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app

# 后端二进制
COPY --from=backend-builder /kubemanage-server .

# 前端静态文件
COPY --from=frontend-builder /app/dist ./web

EXPOSE 8080

ENTRYPOINT ["./kubemanage-server"]
