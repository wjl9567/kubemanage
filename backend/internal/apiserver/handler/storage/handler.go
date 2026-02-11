package storage

import (
	"strconv"

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

func (h *Handler) getSvc(c *gin.Context) (*resource.ResourceService, error) {
	cid, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if cid == 0 { cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64) }
	cl, err := h.k8sMgr.GetClient(uint(cid))
	if err != nil { return nil, err }
	return resource.NewResourceService(cl.Clientset), nil
}

// ListStorageClasses 存储类列表
func (h *Handler) ListStorageClasses(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListStorageClasses(c.Request.Context())
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, sc := range list.Items {
		items = append(items, gin.H{
			"name": sc.Name, "provisioner": sc.Provisioner,
			"reclaim_policy":       sc.ReclaimPolicy,
			"volume_binding_mode":  sc.VolumeBindingMode,
			"allow_expansion":      sc.AllowVolumeExpansion,
			"labels": sc.Labels, "created_at": sc.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetStorageClass(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	sc, err := svc.GetStorageClass(c.Request.Context(), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, sc)
}

// ListPVCs PVC列表
func (h *Handler) ListPVCs(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListPVCs(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, pvc := range list.Items {
		capacity := ""
		if pvc.Status.Capacity != nil {
			if storage, ok := pvc.Status.Capacity["storage"]; ok {
				capacity = storage.String()
			}
		}
		items = append(items, gin.H{
			"name": pvc.Name, "namespace": pvc.Namespace,
			"status":        string(pvc.Status.Phase),
			"capacity":      capacity,
			"access_modes":  pvc.Spec.AccessModes,
			"storage_class": pvc.Spec.StorageClassName,
			"volume_name":   pvc.Spec.VolumeName,
			"labels": pvc.Labels, "created_at": pvc.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetPVC(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	pvc, err := svc.GetPVC(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, pvc)
}

func (h *Handler) DeletePVC(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeletePVC(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "PVC已删除")
}
