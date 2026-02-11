package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kubemanage/backend/internal/pkg/auth"
	"github.com/kubemanage/backend/internal/pkg/response"
)

// JWTAuth JWT认证中间件
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			response.Unauthorized(c, "未提供认证令牌")
			return
		}

		// 支持 Bearer token 格式
		if strings.HasPrefix(token, "Bearer ") {
			token = token[7:]
		}

		claims, err := auth.ParseToken(token)
		if err != nil {
			response.Unauthorized(c, "认证令牌无效或已过期")
			return
		}

		// 将用户信息存入上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

// RoleAuth 角色权限中间件
func RoleAuth(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			response.Forbidden(c, "无法获取用户角色")
			return
		}

		roleStr, ok := role.(string)
		if !ok {
			response.Forbidden(c, "用户角色格式错误")
			return
		}

		// admin 拥有所有权限
		if roleStr == "admin" {
			c.Next()
			return
		}

		for _, allowed := range allowedRoles {
			if roleStr == allowed {
				c.Next()
				return
			}
		}

		response.Forbidden(c, "权限不足，需要角色："+strings.Join(allowedRoles, "/"))
	}
}
