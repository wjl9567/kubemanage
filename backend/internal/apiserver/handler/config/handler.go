package config

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
	if cid == 0 { cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64) }
	cl, err := h.k8sMgr.GetClient(uint(cid))
	if err != nil { return nil, err }
	return resource.NewResourceService(cl.Clientset), nil
}

// ==================== ConfigMap ====================

func (h *Handler) ListConfigMaps(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListConfigMaps(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, cm := range list.Items {
		items = append(items, gin.H{
			"name": cm.Name, "namespace": cm.Namespace,
			"data_count": len(cm.Data), "labels": cm.Labels,
			"created_at": cm.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetConfigMap(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	cm, err := svc.GetConfigMap(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, cm)
}

func (h *Handler) CreateConfigMap(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	var req struct {
		Name      string            `json:"name" binding:"required"`
		Namespace string            `json:"namespace" binding:"required"`
		Data      map[string]string `json:"data"`
		Labels    map[string]string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.BadRequest(c, err.Error()); return }
	cm := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: req.Name, Namespace: req.Namespace, Labels: req.Labels},
		Data:       req.Data,
	}
	result, err := svc.CreateConfigMap(c.Request.Context(), req.Namespace, cm)
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	response.Success(c, result)
}

func (h *Handler) UpdateConfigMap(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	var req struct {
		Data   map[string]string `json:"data"`
		Labels map[string]string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.BadRequest(c, err.Error()); return }
	ns := c.Query("namespace")
	name := c.Param("name")
	cm, err := svc.GetConfigMap(c.Request.Context(), ns, name)
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	cm.Data = req.Data
	if req.Labels != nil { cm.Labels = req.Labels }
	result, err := svc.UpdateConfigMap(c.Request.Context(), ns, cm)
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	response.Success(c, result)
}

func (h *Handler) DeleteConfigMap(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteConfigMap(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "ConfigMap已删除")
}

// ==================== Secret ====================

func (h *Handler) ListSecrets(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListSecrets(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, s := range list.Items {
		items = append(items, gin.H{
			"name": s.Name, "namespace": s.Namespace, "type": string(s.Type),
			"data_count": len(s.Data), "labels": s.Labels, "created_at": s.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetSecret(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	s, err := svc.GetSecret(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	// 默认脱敏，仅显示key不显示value
	maskedData := make(map[string]string)
	for k := range s.Data { maskedData[k] = "***" }
	response.Success(c, gin.H{
		"name": s.Name, "namespace": s.Namespace, "type": string(s.Type),
		"data": maskedData, "labels": s.Labels, "created_at": s.CreationTimestamp,
	})
}

func (h *Handler) DeleteSecret(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteSecret(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "Secret已删除")
}

func (h *Handler) CreateSecret(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	var req struct {
		Name      string            `json:"name" binding:"required"`
		Namespace string            `json:"namespace"`
		Type      string            `json:"type"` // Opaque, kubernetes.io/tls, etc.
		Data      map[string]string `json:"data"`   // base64 编码的 value
		StringData map[string]string `json:"string_data"` // 明文，服务端转 base64
		Labels    map[string]string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error()); return
	}
	ns := req.Namespace
	if ns == "" { ns = "default" }
	secretType := corev1.SecretType(req.Type)
	if secretType == "" { secretType = corev1.SecretTypeOpaque }
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: req.Name, Namespace: ns, Labels: req.Labels},
		Type:       secretType,
	}
	if len(req.StringData) > 0 {
		secret.StringData = req.StringData
	} else if len(req.Data) > 0 {
		secret.Data = make(map[string][]byte)
		for k, v := range req.Data {
			secret.Data[k] = []byte(v) // 前端可传 base64 字符串或后端按 base64 解码
		}
	}
	result, err := svc.CreateSecret(c.Request.Context(), ns, secret)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	masked := make(map[string]string)
	for k := range result.Data { masked[k] = "***" }
	response.Success(c, gin.H{"name": result.Name, "namespace": result.Namespace, "data": masked})
}

func (h *Handler) UpdateSecret(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	ns := c.Query("namespace")
	name := c.Param("name")
	if ns == "" { ns = "default" }
	existing, err := svc.GetSecret(c.Request.Context(), ns, name)
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	var req struct {
		Data      map[string]string `json:"data"`
		StringData map[string]string `json:"string_data"`
		Labels    map[string]string `json:"labels"`
	}
	if err := c.ShouldBindJSON(&req); err != nil { response.BadRequest(c, err.Error()); return }
	if req.StringData != nil {
		existing.StringData = req.StringData
		existing.Data = nil
	} else if req.Data != nil {
		existing.Data = make(map[string][]byte)
		for k, v := range req.Data { existing.Data[k] = []byte(v) }
		existing.StringData = nil
	}
	if req.Labels != nil { existing.Labels = req.Labels }
	result, err := svc.UpdateSecret(c.Request.Context(), ns, existing)
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	masked := make(map[string]string)
	for k := range result.Data { masked[k] = "***" }
	response.Success(c, gin.H{"name": result.Name, "namespace": result.Namespace, "data": masked})
}
