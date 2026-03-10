package rbac

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
	if cid == 0 {
		cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	cl, err := h.k8sMgr.GetClient(uint(cid))
	if err != nil {
		return nil, err
	}
	return resource.NewResourceService(cl.Clientset), nil
}

func (h *Handler) ListRoles(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ns := c.DefaultQuery("namespace", "")
	list, err := svc.ListRoles(c.Request.Context(), ns)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, r := range list.Items {
		items = append(items, gin.H{
			"name": r.Name, "namespace": r.Namespace,
			"rules_count": len(r.Rules), "created_at": r.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetRole(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ns := c.DefaultQuery("namespace", "default")
	r, err := svc.GetRole(c.Request.Context(), ns, c.Param("name"))
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, r)
}

func (h *Handler) ListClusterRoles(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	list, err := svc.ListClusterRoles(c.Request.Context())
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, r := range list.Items {
		items = append(items, gin.H{
			"name": r.Name, "rules_count": len(r.Rules),
			"created_at": r.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetClusterRole(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	r, err := svc.GetClusterRole(c.Request.Context(), c.Param("name"))
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, r)
}

func (h *Handler) ListRoleBindings(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ns := c.DefaultQuery("namespace", "")
	list, err := svc.ListRoleBindings(c.Request.Context(), ns)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, rb := range list.Items {
		items = append(items, gin.H{
			"name": rb.Name, "namespace": rb.Namespace,
			"role_ref": rb.RoleRef, "subjects": rb.Subjects,
			"created_at": rb.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetRoleBinding(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ns := c.DefaultQuery("namespace", "default")
	rb, err := svc.GetRoleBinding(c.Request.Context(), ns, c.Param("name"))
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, rb)
}

func (h *Handler) ListClusterRoleBindings(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	list, err := svc.ListClusterRoleBindings(c.Request.Context())
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, rb := range list.Items {
		items = append(items, gin.H{
			"name": rb.Name, "role_ref": rb.RoleRef, "subjects": rb.Subjects,
			"created_at": rb.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetClusterRoleBinding(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	rb, err := svc.GetClusterRoleBinding(c.Request.Context(), c.Param("name"))
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, rb)
}
