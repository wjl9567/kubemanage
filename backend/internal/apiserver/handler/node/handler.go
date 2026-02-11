package node

import (
	"strconv"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/gin-gonic/gin"
	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/k8s/resource"
	"github.com/kubemanage/backend/internal/pkg/response"
)

type Handler struct {
	k8sMgr *k8sclient.Manager
}

func NewHandler(k8sMgr *k8sclient.Manager) *Handler {
	return &Handler{k8sMgr: k8sMgr}
}

func (h *Handler) getResourceSvc(c *gin.Context) (*resource.ResourceService, error) {
	clusterID, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if clusterID == 0 {
		clusterID, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	client, err := h.k8sMgr.GetClient(uint(clusterID))
	if err != nil {
		return nil, err
	}
	return resource.NewResourceService(client.Clientset), nil
}

// List 节点列表
func (h *Handler) List(c *gin.Context) {
	svc, err := h.getResourceSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}

	nodes, err := svc.ListNodes(c.Request.Context())
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "获取节点列表失败: "+err.Error())
		return
	}

	items := make([]gin.H, 0, len(nodes.Items))
	for _, n := range nodes.Items {
		ready := "NotReady"
		for _, cond := range n.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				ready = "Ready"
			}
		}

		roles := "worker"
		for label := range n.Labels {
			if label == "node-role.kubernetes.io/master" || label == "node-role.kubernetes.io/control-plane" {
				roles = "master"
			}
		}

		items = append(items, gin.H{
			"name":              n.Name,
			"status":            ready,
			"roles":             roles,
			"ip":                n.Status.Addresses,
			"os":                n.Status.NodeInfo.OSImage,
			"kernel":            n.Status.NodeInfo.KernelVersion,
			"container_runtime": n.Status.NodeInfo.ContainerRuntimeVersion,
			"k8s_version":       n.Status.NodeInfo.KubeletVersion,
			"cpu_capacity":      n.Status.Capacity.Cpu().String(),
			"memory_capacity":   n.Status.Capacity.Memory().String(),
			"labels":            n.Labels,
			"taints":            n.Spec.Taints,
			"created_at":        n.CreationTimestamp,
			"conditions":        n.Status.Conditions,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// Get 节点详情
func (h *Handler) Get(c *gin.Context) {
	svc, err := h.getResourceSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}

	n, err := svc.GetNode(c.Request.Context(), c.Param("name"))
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, "节点不存在: "+err.Error())
		return
	}
	response.Success(c, n)
}

// Pods 节点上的Pod列表
func (h *Handler) Pods(c *gin.Context) {
	svc, err := h.getResourceSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}

	nodeName := c.Param("name")
	opts := metav1.ListOptions{FieldSelector: "spec.nodeName=" + nodeName}
	pods, err := svc.ListPods(c.Request.Context(), "", opts)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}

	items := make([]gin.H, 0, len(pods.Items))
	for _, pod := range pods.Items {
		var restarts int32
		for _, cs := range pod.Status.ContainerStatuses {
			restarts += cs.RestartCount
		}
		items = append(items, gin.H{
			"name":       pod.Name,
			"namespace":  pod.Namespace,
			"status":     string(pod.Status.Phase),
			"ip":         pod.Status.PodIP,
			"node":       pod.Spec.NodeName,
			"containers": len(pod.Spec.Containers),
			"restarts":   restarts,
			"created_at": pod.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// Events 节点事件
func (h *Handler) Events(c *gin.Context) {
	svc, err := h.getResourceSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}

	events, err := svc.ListEvents(c.Request.Context(), "")
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}

	nodeName := c.Param("name")
	items := make([]gin.H, 0)
	for _, ev := range events.Items {
		if ev.InvolvedObject.Kind == "Node" && ev.InvolvedObject.Name == nodeName {
			items = append(items, gin.H{
				"type":       ev.Type,
				"reason":     ev.Reason,
				"message":    ev.Message,
				"count":      ev.Count,
				"first_time": ev.FirstTimestamp,
				"last_time":  ev.LastTimestamp,
				"source":     ev.Source.Component,
			})
		}
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}
