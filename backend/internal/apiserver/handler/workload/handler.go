package workload

import (
	"strconv"

	"github.com/gin-gonic/gin"
	batchv1 "k8s.io/api/batch/v1"
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

func (h *Handler) CreateNamespace(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	var req struct {
		Name   string            `json:"name" binding:"required"`
		Labels map[string]string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	ns := &corev1.Namespace{}
	ns.Name = req.Name
	if req.Labels != nil {
		ns.Labels = req.Labels
	}
	result, err := svc.CreateNamespace(c.Request.Context(), ns)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *Handler) DeleteNamespace(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	name := c.Param("name")
	if name == "" {
		response.BadRequest(c, "缺少命名空间名称")
		return
	}
	if err := svc.DeleteNamespace(c.Request.Context(), name); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.SuccessMessage(c, "命名空间已删除")
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

// ==================== Jobs ====================

func (h *Handler) ListJobs(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListJobs(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, j := range list.Items {
		suc := int32(0)
		if j.Status.Succeeded > 0 { suc = j.Status.Succeeded }
		fail := int32(0)
		if j.Status.Failed > 0 { fail = j.Status.Failed }
		items = append(items, gin.H{
			"name": j.Name, "namespace": j.Namespace,
			"completions": j.Status.Succeeded, "succeeded": suc, "failed": fail,
			"active": j.Status.Active, "images": getImages(j.Spec.Template.Spec.Containers),
			"created_at": j.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetJob(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	j, err := svc.GetJob(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, j)
}

func (h *Handler) CreateJob(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	var job batchv1.Job
	if err := c.ShouldBindJSON(&job); err != nil {
		response.BadRequest(c, "请求体无效: "+err.Error()); return
	}
	ns := job.Namespace
	if ns == "" { ns = "default" }
	result, err := svc.CreateJob(c.Request.Context(), ns, &job)
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	response.Success(c, result)
}

func (h *Handler) DeleteJob(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteJob(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "Job已删除")
}

// ==================== CronJobs ====================

func (h *Handler) ListCronJobs(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListCronJobs(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, cj := range list.Items {
		items = append(items, gin.H{
			"name": cj.Name, "namespace": cj.Namespace, "schedule": cj.Spec.Schedule,
			"suspend": cj.Spec.Suspend != nil && *cj.Spec.Suspend,
			"last_schedule": cj.Status.LastSuccessfulTime, "active": len(cj.Status.Active),
			"created_at": cj.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetCronJob(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	cj, err := svc.GetCronJob(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, cj)
}

func (h *Handler) CreateCronJob(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	var cj batchv1.CronJob
	if err := c.ShouldBindJSON(&cj); err != nil {
		response.BadRequest(c, "请求体无效: "+err.Error()); return
	}
	ns := cj.Namespace
	if ns == "" { ns = "default" }
	result, err := svc.CreateCronJob(c.Request.Context(), ns, &cj)
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	response.Success(c, result)
}

func (h *Handler) DeleteCronJob(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteCronJob(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "CronJob已删除")
}
