package crd

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/pkg/response"
)

var crdGVR = schema.GroupVersionResource{
	Group: "apiextensions.k8s.io", Version: "v1", Resource: "customresourcedefinitions",
}

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

// List 列出集群内所有 CRD
func (h *Handler) List(c *gin.Context) {
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ctx := c.Request.Context()
	list, err := cl.DynamicClient.Resource(crdGVR).List(ctx, metav1.ListOptions{})
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	items := make([]gin.H, 0, len(list.Items))
	for _, item := range list.Items {
		spec, _, _ := unstructured.NestedMap(item.Object, "spec")
		names, _, _ := unstructured.NestedMap(spec, "names")
		group, _ := spec["group"].(string)
		scope, _ := spec["scope"].(string)
		plural, _ := names["plural"].(string)
		kind, _ := names["kind"].(string)
		version := ""
		if vers, ok := spec["versions"].([]interface{}); ok && len(vers) > 0 {
			if v, ok := vers[0].(map[string]interface{}); ok {
				version, _ = v["name"].(string)
			}
		}
		items = append(items, gin.H{
			"name":       item.GetName(),
			"group":      group,
			"version":    version,
			"kind":       kind,
			"plural":     plural,
			"scope":      scope,
			"created_at": item.GetCreationTimestamp(),
		})
	}
	response.Success(c, gin.H{"list": items, "total": len(items)})
}

// ListInstances 列出指定 CRD 的实例（通过 CRD name 查 GVR 再 list）
func (h *Handler) ListInstances(c *gin.Context) {
	crdName := c.Param("name")
	if crdName == "" {
		response.BadRequest(c, "缺少 CRD 名称")
		return
	}
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ctx := c.Request.Context()
	// 先取 CRD 定义
	obj, err := cl.DynamicClient.Resource(crdGVR).Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	spec, _, _ := unstructured.NestedMap(obj.Object, "spec")
	names, _, _ := unstructured.NestedMap(spec, "names")
	group, _ := spec["group"].(string)
	plural, _ := names["plural"].(string)
	kind, _ := names["kind"].(string)
	scope, _ := spec["scope"].(string)
	version := ""
	if vers, ok := spec["versions"].([]interface{}); ok && len(vers) > 0 {
		if v, ok := vers[0].(map[string]interface{}); ok {
			version, _ = v["name"].(string)
		}
	}
	if version == "" {
		response.Error(c, response.ErrCodeK8sApiFail, "CRD 无可用 version")
		return
	}
	gvr := schema.GroupVersionResource{Group: group, Version: version, Resource: plural}
	namespace := c.Query("namespace")
	var list *unstructured.UnstructuredList
	if scope == "Namespaced" && namespace != "" {
		list, err = cl.DynamicClient.Resource(gvr).Namespace(namespace).List(ctx, metav1.ListOptions{})
	} else if scope == "Namespaced" {
		list, err = cl.DynamicClient.Resource(gvr).List(ctx, metav1.ListOptions{})
	} else {
		list, err = cl.DynamicClient.Resource(gvr).List(ctx, metav1.ListOptions{})
	}
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	instances := make([]gin.H, 0, len(list.Items))
	for _, item := range list.Items {
		instances = append(instances, gin.H{
			"name":       item.GetName(),
			"namespace":  item.GetNamespace(),
			"kind":       kind,
			"created_at": item.GetCreationTimestamp(),
		})
	}
	response.Success(c, gin.H{"list": instances, "total": len(instances), "crd_name": crdName})
}

// getGVR 根据 CRD 名称解析出 GVR
func (h *Handler) getGVR(ctx context.Context, cl *k8sclient.ClusterClient, crdName string) (gvr schema.GroupVersionResource, scope string, err error) {
	obj, err := cl.DynamicClient.Resource(crdGVR).Get(ctx, crdName, metav1.GetOptions{})
	if err != nil {
		return gvr, "", err
	}
	spec, _, _ := unstructured.NestedMap(obj.Object, "spec")
	names, _, _ := unstructured.NestedMap(spec, "names")
	group, _ := spec["group"].(string)
	plural, _ := names["plural"].(string)
	scope, _ = spec["scope"].(string)
	version := ""
	if vers, ok := spec["versions"].([]interface{}); ok && len(vers) > 0 {
		if v, ok := vers[0].(map[string]interface{}); ok {
			version, _ = v["name"].(string)
		}
	}
	if version == "" {
		return gvr, "", nil
	}
	return schema.GroupVersionResource{Group: group, Version: version, Resource: plural}, scope, nil
}

// GetInstance 获取单个 CR 实例
func (h *Handler) GetInstance(c *gin.Context) {
	crdName := c.Param("name")
	instanceName := c.Param("iname")
	if crdName == "" || instanceName == "" {
		response.BadRequest(c, "缺少 CRD 名称或实例名称")
		return
	}
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ctx := c.Request.Context()
	gvr, scope, err := h.getGVR(ctx, cl, crdName)
	if err != nil || gvr.Resource == "" {
		response.Error(c, response.ErrCodeResourceNotFound, "CRD 不存在或无可用 version")
		return
	}
	res := cl.DynamicClient.Resource(gvr)
	namespace := c.Query("namespace")
	if scope == "Namespaced" {
		if namespace == "" {
			namespace = "default"
		}
		obj, err := res.Namespace(namespace).Get(ctx, instanceName, metav1.GetOptions{})
		if err != nil {
			response.Error(c, response.ErrCodeResourceNotFound, err.Error())
			return
		}
		response.Success(c, obj.Object)
		return
	}
	obj, err := res.Get(ctx, instanceName, metav1.GetOptions{})
	if err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, err.Error())
		return
	}
	response.Success(c, obj.Object)
}

// CreateInstance 创建 CR 实例（body 为 JSON 对象）
func (h *Handler) CreateInstance(c *gin.Context) {
	crdName := c.Param("name")
	if crdName == "" {
		response.BadRequest(c, "缺少 CRD 名称")
		return
	}
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ctx := c.Request.Context()
	gvr, scope, err := h.getGVR(ctx, cl, crdName)
	if err != nil || gvr.Resource == "" {
		response.Error(c, response.ErrCodeResourceNotFound, "CRD 不存在或无可用 version")
		return
	}
	var raw map[string]interface{}
	if err := c.ShouldBindJSON(&raw); err != nil {
		response.BadRequest(c, "请求体无效: "+err.Error())
		return
	}
	obj := &unstructured.Unstructured{Object: raw}
	res := cl.DynamicClient.Resource(gvr)
	namespace := obj.GetNamespace()
	if scope == "Namespaced" && namespace == "" {
		namespace = "default"
	}
	var result *unstructured.Unstructured
	if scope == "Namespaced" {
		result, err = res.Namespace(namespace).Create(ctx, obj, metav1.CreateOptions{})
	} else {
		result, err = res.Create(ctx, obj, metav1.CreateOptions{})
	}
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.Success(c, result.Object)
}

// UpdateInstance 更新 CR 实例
func (h *Handler) UpdateInstance(c *gin.Context) {
	crdName := c.Param("name")
	instanceName := c.Param("iname")
	if crdName == "" || instanceName == "" {
		response.BadRequest(c, "缺少 CRD 名称或实例名称")
		return
	}
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ctx := c.Request.Context()
	gvr, scope, err := h.getGVR(ctx, cl, crdName)
	if err != nil || gvr.Resource == "" {
		response.Error(c, response.ErrCodeResourceNotFound, "CRD 不存在或无可用 version")
		return
	}
	var raw map[string]interface{}
	if err := c.ShouldBindJSON(&raw); err != nil {
		response.BadRequest(c, "请求体无效: "+err.Error())
		return
	}
	obj := &unstructured.Unstructured{Object: raw}
	res := cl.DynamicClient.Resource(gvr)
	namespace := c.Query("namespace")
	if scope == "Namespaced" && namespace == "" {
		namespace = "default"
	}
	var result *unstructured.Unstructured
	if scope == "Namespaced" {
		existing, err := res.Namespace(namespace).Get(ctx, instanceName, metav1.GetOptions{})
		if err != nil {
			response.Error(c, response.ErrCodeResourceNotFound, err.Error())
			return
		}
		obj.SetResourceVersion(existing.GetResourceVersion())
		result, err = res.Namespace(namespace).Update(ctx, obj, metav1.UpdateOptions{})
	} else {
		existing, err := res.Get(ctx, instanceName, metav1.GetOptions{})
		if err != nil {
			response.Error(c, response.ErrCodeResourceNotFound, err.Error())
			return
		}
		obj.SetResourceVersion(existing.GetResourceVersion())
		result, err = res.Update(ctx, obj, metav1.UpdateOptions{})
	}
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.Success(c, result.Object)
}

// DeleteInstance 删除 CR 实例
func (h *Handler) DeleteInstance(c *gin.Context) {
	crdName := c.Param("name")
	instanceName := c.Param("iname")
	if crdName == "" || instanceName == "" {
		response.BadRequest(c, "缺少 CRD 名称或实例名称")
		return
	}
	cl, err := h.getClient(c)
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, err.Error())
		return
	}
	ctx := c.Request.Context()
	gvr, scope, err := h.getGVR(ctx, cl, crdName)
	if err != nil || gvr.Resource == "" {
		response.Error(c, response.ErrCodeResourceNotFound, "CRD 不存在或无可用 version")
		return
	}
	res := cl.DynamicClient.Resource(gvr)
	namespace := c.Query("namespace")
	if scope == "Namespaced" && namespace == "" {
		namespace = "default"
	}
	if scope == "Namespaced" {
		err = res.Namespace(namespace).Delete(ctx, instanceName, metav1.DeleteOptions{})
	} else {
		err = res.Delete(ctx, instanceName, metav1.DeleteOptions{})
	}
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, err.Error())
		return
	}
	response.SuccessMessage(c, "已删除")
}
