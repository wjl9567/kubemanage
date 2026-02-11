package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PageResult 分页结果
type PageResult struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data:    data,
	})
}

// SuccessPage 分页成功响应
func SuccessPage(c *gin.Context, list interface{}, total int64, page, pageSize int) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "success",
		Data: PageResult{
			List:     list,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		},
	})
}

// SuccessMessage 成功消息
func SuccessMessage(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: msg,
	})
}

// Error 错误响应
func Error(c *gin.Context, code int, msg string) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: msg,
	})
}

// Unauthorized 未授权
func Unauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusUnauthorized, Response{
		Code:    401,
		Message: msg,
	})
	c.Abort()
}

// Forbidden 禁止访问
func Forbidden(c *gin.Context, msg string) {
	c.JSON(http.StatusForbidden, Response{
		Code:    403,
		Message: msg,
	})
	c.Abort()
}

// BadRequest 请求错误
func BadRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, Response{
		Code:    400,
		Message: msg,
	})
}

// ServerError 服务器错误
func ServerError(c *gin.Context, msg string) {
	c.JSON(http.StatusInternalServerError, Response{
		Code:    500,
		Message: msg,
	})
}

// 业务错误码
const (
	ErrCodeParamInvalid    = 10001 // 参数错误
	ErrCodeUserNotFound    = 10002 // 用户不存在
	ErrCodePasswordWrong   = 10003 // 密码错误
	ErrCodeTokenInvalid    = 10004 // Token无效
	ErrCodeTokenExpired    = 10005 // Token过期
	ErrCodePermDenied      = 10006 // 权限不足
	ErrCodeClusterNotFound = 20001 // 集群不存在
	ErrCodeClusterConnFail = 20002 // 集群连接失败
	ErrCodeK8sApiFail      = 20003 // K8s API调用失败
	ErrCodeResourceExists  = 20004 // 资源已存在
	ErrCodeResourceNotFound = 20005 // 资源不存在
)
