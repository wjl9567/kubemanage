package middleware

import (
	"bytes"
	"io"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/kubemanage/backend/internal/model"
)

// AuditLog 审计日志中间件（logger 必填，db 可选；db 非空时持久化到 audit_log 表）
func AuditLog(logger *zap.Logger, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// 读取请求体
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// 处理请求
		c.Next()

		duration := time.Since(start)
		statusCode := c.Writer.Status()

		usernameVal, _ := c.Get("username")
		userIDVal, _ := c.Get("user_id")
		username, _ := usernameVal.(string)
		userID := uint(0)
		if uid, ok := userIDVal.(uint); ok {
			userID = uid
		}

		logger.Info("API Audit",
			zap.Any("user_id", userID),
			zap.Any("username", username),
			zap.String("method", method),
			zap.String("path", path),
			zap.String("ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.Int("status", statusCode),
			zap.Duration("duration", duration),
			zap.String("query", c.Request.URL.RawQuery),
		)

		if db != nil {
			clusterID := uint(0)
			if idStr := c.GetHeader("X-Cluster-ID"); idStr != "" {
				if id, _ := strconv.ParseUint(idStr, 10, 32); id > 0 {
					clusterID = uint(id)
				}
			}
			result := "success"
			if statusCode >= 400 {
				result = "failure"
			}
			_ = db.Create(&model.AuditLog{
				UserID:    userID,
				Username:  username,
				ClusterID: clusterID,
				Action:    method,
				Resource:  path,
				Result:    result,
				IP:        c.ClientIP(),
				UserAgent: c.Request.UserAgent(),
			}).Error
		}
	}
}

// CORS 跨域中间件（生产环境建议设置 CORS_ORIGIN 为具体域名，如 https://kubemanage.example.com）
func CORS() gin.HandlerFunc {
	origin := os.Getenv("CORS_ORIGIN")
	if origin == "" {
		origin = "*"
	}
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", origin)
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Cluster-ID")
		c.Header("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

