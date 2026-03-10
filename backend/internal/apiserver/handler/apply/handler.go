package apply

import (
	"bytes"
	"encoding/json"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/discovery"
	"k8s.io/client-go/restmapper"
	"sigs.k8s.io/yaml"

	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/pkg/response"
)

type Handler struct {
	k8sMgr *k8sclient.Manager
}

func NewHandler(k8sMgr *k8sclient.Manager) *Handler {
	return &Handler{k8sMgr: k8sMgr}
}

func (h *Handler) getClient(c *gin.Context) (*k8sclient.ClusterClient, error) {
	cid, _ := strconv.ParseUint(c.GetHeader("X-Cluster-ID"), 10, 64)
	if cid == 0 {
		cid, _ = strconv.ParseUint(c.Query("cluster_id"), 10, 64)
	}
	return h.k8sMgr.GetClient(uint(cid))
}

// Apply 接收 YAML 或 JSON 的单个资源，执行 Create 或 Update（存在则 Update，否则 Create）
func (h *Handler) Apply(c *gin.Context) {
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}

	body, err := c.GetRawData()
	if err != nil || len(body) == 0 {
		response.BadRequest(c, "请求体为空")
		return
	}

	// 支持 YAML 或 JSON
	body = bytes.TrimSpace(body)
	var raw map[string]interface{}
	if body[0] == '{' {
		if err := json.Unmarshal(body, &raw); err != nil {
			response.BadRequest(c, "JSON 解析失败: "+err.Error())
			return
		}
	} else {
		if err := yaml.Unmarshal(body, &raw); err != nil {
			response.BadRequest(c, "YAML 解析失败: "+err.Error())
			return
		}
	}

	obj := &unstructured.Unstructured{Object: raw}
	gvk := obj.GroupVersionKind()
	name := obj.GetName()
	namespace := obj.GetNamespace()
	if name == "" {
		response.BadRequest(c, "资源缺少 metadata.name")
		return
	}

	// RESTMapper 解析 GVR
	dc, err := discovery.NewDiscoveryClientForConfig(cl.Config)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "创建 Discovery 失败: "+err.Error())
		return
	}
	gr, err := restmapper.GetAPIGroupResources(dc)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "获取 API 资源失败: "+err.Error())
		return
	}
	mapper := restmapper.NewDiscoveryRESTMapper(gr)
	mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "无法解析资源类型: "+err.Error())
		return
	}

	gvr := mapping.Resource
	ctx := c.Request.Context()
	ns := mapping.Scope.Name()
	if ns == "namespace" {
		if namespace == "" {
			namespace = "default"
		}
	}

	res := cl.DynamicClient.Resource(gvr)
	var result *unstructured.Unstructured
	if ns == "namespace" {
		existing, err := res.Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
		if err == nil {
			obj.SetResourceVersion(existing.GetResourceVersion())
			result, err = res.Namespace(namespace).Update(ctx, obj, metav1.UpdateOptions{})
		} else {
			result, err = res.Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
		}
	} else {
		existing, err := res.Get(ctx, name, metav1.GetOptions{})
		if err == nil {
			obj.SetResourceVersion(existing.GetResourceVersion())
			result, err = res.Update(ctx, obj, metav1.UpdateOptions{})
		} else {
			result, err = res.Create(ctx, obj, metav1.CreateOptions{})
		}
	}
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.Success(c, result.Object)
}

// GetRaw 按 kind/apiVersion/namespace/name 获取资源，返回 JSON（前端可转 YAML 编辑）
func (h *Handler) GetRaw(c *gin.Context) {
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	kind := c.Query("kind")
	apiVersion := c.Query("apiVersion")
	namespace := c.Query("namespace")
	name := c.Query("name")
	if kind == "" || apiVersion == "" || name == "" {
		response.BadRequest(c, "缺少 kind、apiVersion 或 name")
		return
	}
	parts := strings.SplitN(apiVersion, "/", 2)
	version := parts[0]
	group := ""
	if len(parts) == 2 {
		group, version = parts[0], parts[1]
	}
	gvk := schema.GroupVersionKind{Group: group, Version: version, Kind: kind}

	dc, err := discovery.NewDiscoveryClientForConfig(cl.Config)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "创建 Discovery 失败: "+err.Error())
		return
	}
	gr, err := restmapper.GetAPIGroupResources(dc)
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "获取 API 资源失败: "+err.Error())
		return
	}
	mapper := restmapper.NewDiscoveryRESTMapper(gr)
	mapping, err := mapper.RESTMapping(gvk.GroupKind(), gvk.Version)
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, "无法解析资源类型: "+err.Error())
		return
	}
	gvr := mapping.Resource
	ctx := c.Request.Context()
	res := cl.DynamicClient.Resource(gvr)
	var obj *unstructured.Unstructured
	if mapping.Scope.Name() == "namespace" {
		if namespace == "" {
			namespace = "default"
		}
		obj, err = res.Namespace(namespace).Get(ctx, name, metav1.GetOptions{})
	} else {
		obj, err = res.Get(ctx, name, metav1.GetOptions{})
	}
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, obj.Object)
}
