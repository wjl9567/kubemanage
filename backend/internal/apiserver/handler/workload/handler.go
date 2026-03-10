package workload

import (
	"strconv"

	"github.com/gin-gonic/gin"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

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

func (h *Handler) getSvc(c *gin.Context) (*resource.ResourceService, error) {
	cid, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if cid == 0 {
		cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	cl, err := h.k8sMgr.GetClient(uint(cid))
	if err != nil {
		return nil, err
	}
	return resource.NewResourceService(cl.Clientset), nil
}

func getImages(containers []corev1.Container) []string {
	imgs := make([]string, 0, len(containers))
	for _, c := range containers {
		imgs = append(imgs, c.Image)
	}
	return imgs
}

// ==================== Namespaces ====================

func (h *Handler) ListNamespaces(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	list, err := svc.ListNamespaces(c.Request.Context())
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, ns := range list.Items {
		items = append(items, gin.H{"name": ns.Name, "status": string(ns.Status.Phase), "created_at": ns.CreationTimestamp})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// ==================== Deployments ====================

func (h *Handler) ListDeployments(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	list, err := svc.ListDeployments(c.Request.Context(), c.Query("namespace"))
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, d := range list.Items {
		items = append(items, gin.H{
			"name": d.Name, "namespace": d.Namespace,
			"replicas": d.Status.Replicas, "ready": d.Status.ReadyReplicas,
			"available": d.Status.AvailableReplicas, "updated": d.Status.UpdatedReplicas,
			"strategy": d.Spec.Strategy.Type, "images": getImages(d.Spec.Template.Spec.Containers),
			"labels": d.Labels, "created_at": d.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetDeployment(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	d, err := svc.GetDeployment(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, d)
}

func (h *Handler) ScaleDeployment(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	var req struct { Replicas int32 `json:"replicas"` }
	if err := c.ShouldBindJSON(&req); err != nil { response.BadRequest(c, "参数错误"); return }
	if err := svc.ScaleDeployment(c.Request.Context(), c.Query("namespace"), c.Param("name"), req.Replicas); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "扩缩容成功")
}

func (h *Handler) RestartDeployment(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.RestartDeployment(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "重启成功")
}

func (h *Handler) DeleteDeployment(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteDeployment(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "删除成功")
}

// ==================== StatefulSets ====================

func (h *Handler) ListStatefulSets(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListStatefulSets(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, s := range list.Items {
		items = append(items, gin.H{
			"name": s.Name, "namespace": s.Namespace, "replicas": s.Status.Replicas,
			"ready": s.Status.ReadyReplicas, "images": getImages(s.Spec.Template.Spec.Containers),
			"labels": s.Labels, "created_at": s.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// ==================== DaemonSets ====================

func (h *Handler) ListDaemonSets(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListDaemonSets(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, d := range list.Items {
		items = append(items, gin.H{
			"name": d.Name, "namespace": d.Namespace, "desired": d.Status.DesiredNumberScheduled,
			"current": d.Status.CurrentNumberScheduled, "ready": d.Status.NumberReady,
			"images": getImages(d.Spec.Template.Spec.Containers),
			"labels": d.Labels, "created_at": d.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// ==================== Pods ====================

func (h *Handler) ListPods(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	opts := metav1.ListOptions{}
	if label := c.Query("label_selector"); label != "" { opts.LabelSelector = label }
	pods, err := svc.ListPods(c.Request.Context(), c.Query("namespace"), opts)
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(pods.Items))
	for _, p := range pods.Items {
		var restarts int32
		for _, cs := range p.Status.ContainerStatuses { restarts += cs.RestartCount }
		cts := make([]gin.H, 0)
		for _, ct := range p.Spec.Containers {
			cts = append(cts, gin.H{"name": ct.Name, "image": ct.Image})
		}
		items = append(items, gin.H{
			"name": p.Name, "namespace": p.Namespace, "status": string(p.Status.Phase),
			"ip": p.Status.PodIP, "node": p.Spec.NodeName, "containers": cts,
			"restarts": restarts, "labels": p.Labels, "created_at": p.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetPod(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	pod, err := svc.GetPod(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, pod)
}

func (h *Handler) DeletePod(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeletePod(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "Pod已删除")
}
