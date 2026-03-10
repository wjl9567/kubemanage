package hpa

import (
	"strconv"

	"github.com/gin-gonic/gin"
	autoscalingv2 "k8s.io/api/autoscaling/v2"

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

func (h *Handler) List(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	list, err := svc.ListHPAs(c.Request.Context(), c.Query("namespace"))
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, hpa := range list.Items {
		minR, maxR := int32(0), int32(0)
		if hpa.Spec.MinReplicas != nil {
			minR = *hpa.Spec.MinReplicas
		}
		maxR = hpa.Spec.MaxReplicas
		refKind := ""
		refName := ""
		if hpa.Spec.ScaleTargetRef.Kind != "" {
			refKind = hpa.Spec.ScaleTargetRef.Kind
			refName = hpa.Spec.ScaleTargetRef.Name
		}
		items = append(items, gin.H{
			"name": hpa.Name, "namespace": hpa.Namespace,
			"min_replicas": minR, "max_replicas": maxR,
			"target_kind": refKind, "target_name": refName,
			"current_replicas": hpa.Status.CurrentReplicas, "desired_replicas": hpa.Status.DesiredReplicas,
			"created_at": hpa.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) Get(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	hpa, err := svc.GetHPA(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, hpa)
}

func (h *Handler) Create(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	var obj autoscalingv2.HorizontalPodAutoscaler
	if err := c.ShouldBindJSON(&obj); err != nil {
		response.BadRequest(c, "请求体无效: "+err.Error())
		return
	}
	ns := obj.Namespace
	if ns == "" {
		ns = "default"
	}
	result, err := svc.CreateHPA(c.Request.Context(), ns, &obj)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *Handler) Update(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	namespace := c.Query("namespace")
	name := c.Param("name")
	if namespace == "" {
		namespace = "default"
	}
	existing, err := svc.GetHPA(c.Request.Context(), namespace, name)
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	var obj autoscalingv2.HorizontalPodAutoscaler
	if err := c.ShouldBindJSON(&obj); err != nil {
		response.BadRequest(c, "请求体无效: "+err.Error())
		return
	}
	obj.ResourceVersion = existing.ResourceVersion
	obj.UID = existing.UID
	if obj.Namespace == "" {
		obj.Namespace = namespace
	}
	if obj.Name == "" {
		obj.Name = name
	}
	result, err := svc.UpdateHPA(c.Request.Context(), namespace, &obj)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.Success(c, result)
}

func (h *Handler) Delete(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	if err := svc.DeleteHPA(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.SuccessMessage(c, "HPA已删除")
}
