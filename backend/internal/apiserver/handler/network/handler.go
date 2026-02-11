package network

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

// ==================== Service ====================

func (h *Handler) ListServices(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListServices(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, s := range list.Items {
		ports := make([]gin.H, 0)
		for _, p := range s.Spec.Ports {
			ports = append(ports, gin.H{
				"name": p.Name, "port": p.Port, "target_port": p.TargetPort.String(),
				"protocol": string(p.Protocol), "node_port": p.NodePort,
			})
		}
		items = append(items, gin.H{
			"name": s.Name, "namespace": s.Namespace, "type": string(s.Spec.Type),
			"cluster_ip": s.Spec.ClusterIP, "external_ips": s.Spec.ExternalIPs,
			"ports": ports, "selector": s.Spec.Selector,
			"labels": s.Labels, "created_at": s.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetService(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	s, err := svc.GetService(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, s)
}

func (h *Handler) DeleteService(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteService(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "Service已删除")
}

// ==================== Ingress ====================

func (h *Handler) ListIngresses(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	list, err := svc.ListIngresses(c.Request.Context(), c.Query("namespace"))
	if err != nil { response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return }
	items := make([]gin.H, 0, len(list.Items))
	for _, ing := range list.Items {
		rules := make([]gin.H, 0)
		for _, r := range ing.Spec.Rules {
			paths := make([]gin.H, 0)
			if r.HTTP != nil {
				for _, p := range r.HTTP.Paths {
					paths = append(paths, gin.H{
						"path": p.Path, "path_type": p.PathType,
						"backend_service": p.Backend.Service.Name,
						"backend_port":    p.Backend.Service.Port.Number,
					})
				}
			}
			rules = append(rules, gin.H{"host": r.Host, "paths": paths})
		}
		items = append(items, gin.H{
			"name": ing.Name, "namespace": ing.Namespace,
			"ingress_class": ing.Spec.IngressClassName,
			"rules": rules, "tls": ing.Spec.TLS,
			"labels": ing.Labels, "created_at": ing.CreationTimestamp,
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

func (h *Handler) GetIngress(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	ing, err := svc.GetIngress(c.Request.Context(), c.Query("namespace"), c.Param("name"))
	if err != nil { response.Error(c, response.ErrCodeResourceNotFound, err.Error()); return }
	response.Success(c, ing)
}

func (h *Handler) DeleteIngress(c *gin.Context) {
	svc, err := h.getSvc(c)
	if err != nil { response.Error(c, response.ErrCodeClusterConnFail, err.Error()); return }
	if err := svc.DeleteIngress(c.Request.Context(), c.Query("namespace"), c.Param("name")); err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error()); return
	}
	response.SuccessMessage(c, "Ingress已删除")
}
