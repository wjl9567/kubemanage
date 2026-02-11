package workload

import (
	"strconv"

	"github.com/gin-gonic/gin"
	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/pkg/ws"
)

// PodLogs WebSocket 实时 Pod 日志
// GET /api/v1/pods/:name/logs?namespace=xxx&container=xxx&tail=100&follow=true
func (h *Handler) PodLogs(c *gin.Context) {
	conn, err := ws.UpgradeWebSocket(c.Writer, c.Request)
	if err != nil {
		return
	}

	cid, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if cid == 0 {
		cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	client, err := h.k8sMgr.GetClient(uint(cid))
	if err != nil {
		conn.Close()
		return
	}

	podName := c.Param("name")
	namespace := c.DefaultQuery("namespace", "default")
	container := c.Query("container")
	tailStr := c.DefaultQuery("tail", "200")
	followStr := c.DefaultQuery("follow", "true")

	tail, _ := strconv.ParseInt(tailStr, 10, 64)
	if tail <= 0 {
		tail = 200
	}
	follow := followStr == "true"

	ws.StreamPodLogs(conn, client.Clientset, namespace, podName, container, tail, follow)
}

// PodExec WebSocket Pod 终端
// GET /api/v1/pods/:name/exec?namespace=xxx&container=xxx
func (h *Handler) PodExec(c *gin.Context) {
	conn, err := ws.UpgradeWebSocket(c.Writer, c.Request)
	if err != nil {
		return
	}

	cid, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if cid == 0 {
		cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	client, err := h.k8sMgr.GetClient(uint(cid))
	if err != nil {
		conn.Close()
		return
	}

	podName := c.Param("name")
	namespace := c.DefaultQuery("namespace", "default")
	container := c.Query("container")

	ws.ExecInPod(conn, client.Clientset, client.Config, namespace, podName, container)
}

// getClusterClient 获取集群客户端的辅助函数
func getClusterClient(c *gin.Context, mgr *k8sclient.Manager) (*k8sclient.ClusterClient, error) {
	cid, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if cid == 0 {
		cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	return mgr.GetClient(uint(cid))
}
