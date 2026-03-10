package monitor

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kubemanage/backend/internal/pkg/response"
)

// Prometheus 查询代理：转发到配置的 Prometheus 地址，用于前端拉取监控曲线
// 环境变量 PROMETHEUS_URL 如 http://prometheus:9090

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func prometheusURL() string {
	return os.Getenv("PROMETHEUS_URL")
}

// Query 即时查询 PromQL，GET /api/v1/query?query=...
func (h *Handler) Query(c *gin.Context) {
	base := prometheusURL()
	if base == "" {
		response.BadRequest(c, "未配置 PROMETHEUS_URL")
		return
	}
	q := c.Query("query")
	if q == "" {
		response.BadRequest(c, "缺少 query 参数")
		return
	}
	req, _ := http.NewRequest(http.MethodGet, base+"/api/v1/query", nil)
	req.URL.RawQuery = c.Request.URL.RawQuery
	req.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		response.ServerError(c, "请求 Prometheus 失败: "+err.Error())
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result interface{}
	if json.Unmarshal(body, &result) != nil {
		c.Data(resp.StatusCode, "application/json", body)
		return
	}
	c.JSON(200, result)
}

// QueryRange 范围查询 PromQL，GET /api/v1/query_range?query=...&start=...&end=...&step=...
func (h *Handler) QueryRange(c *gin.Context) {
	base := prometheusURL()
	if base == "" {
		response.BadRequest(c, "未配置 PROMETHEUS_URL")
		return
	}
	q := c.Query("query")
	if q == "" {
		response.BadRequest(c, "缺少 query 参数")
		return
	}
	req, _ := http.NewRequest(http.MethodGet, base+"/api/v1/query_range", nil)
	req.URL.RawQuery = c.Request.URL.RawQuery
	req.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		response.ServerError(c, "请求 Prometheus 失败: "+err.Error())
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result interface{}
	if json.Unmarshal(body, &result) != nil {
		c.Data(resp.StatusCode, "application/json", body)
		return
	}
	c.JSON(200, result)
}
