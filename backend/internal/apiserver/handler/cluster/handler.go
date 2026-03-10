package cluster

import (
	"strconv"

	"github.com/gin-gonic/gin"
	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/k8s/resource"
	"github.com/kubemanage/backend/internal/model"
	"github.com/kubemanage/backend/internal/pkg/encrypt"
	"github.com/kubemanage/backend/internal/pkg/response"
	"gorm.io/gorm"
)

func getUserID(c *gin.Context) uint {
	v, _ := c.Get("user_id")
	if u, ok := v.(uint); ok {
		return u
	}
	if f, ok := v.(float64); ok {
		return uint(f)
	}
	return 0
}

type Handler struct {
	db        *gorm.DB
	k8sMgr    *k8sclient.Manager
}

func NewHandler(db *gorm.DB, k8sMgr *k8sclient.Manager) *Handler {
	return &Handler{db: db, k8sMgr: k8sMgr}
}

// List 集群列表（非 admin 用户仅返回已授权集群）
func (h *Handler) List(c *gin.Context) {
	roleVal, _ := c.Get("role")
	role, _ := roleVal.(string)
	userID := getUserID(c)

	var clusters []model.Cluster
	var total int64
	query := h.db.Model(&model.Cluster{})

	if role != "admin" && userID > 0 {
		var allowedIDs []uint
		h.db.Model(&model.UserCluster{}).Where("user_id = ?", userID).Pluck("cluster_id", &allowedIDs)
		if len(allowedIDs) == 0 {
			response.Success(c, gin.H{"list": []model.Cluster{}, "total": 0})
			return
		}
		query = query.Where("id IN ?", allowedIDs)
	}
	if t := c.Query("type"); t != "" {
		query = query.Where("type = ?", t)
	}
	if s := c.Query("status"); s != "" {
		query = query.Where("status = ?", s)
	}
	if name := c.Query("name"); name != "" {
		query = query.Where("name LIKE ?", "%"+name+"%")
	}

	query.Count(&total)
	query.Order("id desc").Find(&clusters)
	response.Success(c, gin.H{"list": clusters, "total": total})
}

// Get 获取单个集群详情
func (h *Handler) Get(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var cluster model.Cluster
	if err := h.db.First(&cluster, id).Error; err != nil {
		response.Error(c, response.ErrCodeClusterNotFound, "集群不存在")
		return
	}
	response.Success(c, cluster)
}

// Create 注册集群
func (h *Handler) Create(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		DisplayName string `json:"display_name"`
		Description string `json:"description"`
		Type        string `json:"type" binding:"required"`
		Provider    string `json:"provider"`
		Region      string `json:"region"`
		APIServer   string `json:"api_server"`
		KubeConfig  string `json:"kube_config"`
		Token       string `json:"token"`
		CACert      string `json:"ca_cert"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误："+err.Error())
		return
	}

	// 加密存储敏感信息
	encKubeConfig, _ := encrypt.Encrypt(req.KubeConfig)
	encToken, _ := encrypt.Encrypt(req.Token)

	cluster := model.Cluster{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Type:        req.Type,
		Provider:    req.Provider,
		Region:      req.Region,
		APIServer:   req.APIServer,
		KubeConfig:  encKubeConfig,
		Token:       encToken,
		CACert:      req.CACert,
		Status:      "active",
	}

	if err := h.db.Create(&cluster).Error; err != nil {
		response.Error(c, response.ErrCodeResourceExists, "集群名称已存在")
		return
	}

	// 尝试连接集群
	if req.KubeConfig != "" {
		if err := h.k8sMgr.AddCluster(cluster.ID, cluster.Name, req.KubeConfig); err != nil {
			h.db.Model(&cluster).Update("status", "error")
			response.Success(c, gin.H{"cluster": cluster, "warning": "集群已注册但连接失败: " + err.Error()})
			return
		}
	} else if req.Token != "" {
		if err := h.k8sMgr.AddClusterFromToken(cluster.ID, cluster.Name, req.APIServer, req.Token, req.CACert); err != nil {
			h.db.Model(&cluster).Update("status", "error")
		}
	}

	response.Success(c, cluster)
}

// Delete 移除集群
func (h *Handler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	h.k8sMgr.RemoveCluster(uint(id))
	h.db.Delete(&model.Cluster{}, id)
	response.SuccessMessage(c, "集群已移除")
}

// Overview 集群总览
func (h *Handler) Overview(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	client, err := h.k8sMgr.GetClient(uint(id))
	if err != nil {
		response.Error(c, response.ErrCodeClusterConnFail, "集群未连接: "+err.Error())
		return
	}

	svc := resource.NewResourceService(client.Clientset)
	overview, err := svc.GetClusterOverview(c.Request.Context())
	if err != nil {
		response.Error(c, response.ErrCodeK8sApiFail, "获取集群概览失败: "+err.Error())
		return
	}
	response.Success(c, overview)
}

// MultiOverview 多集群总览
func (h *Handler) MultiOverview(c *gin.Context) {
	var clusters []model.Cluster
	h.db.Where("status = ?", "active").Find(&clusters)

	result := make([]gin.H, 0, len(clusters))
	for _, cls := range clusters {
		item := gin.H{
			"id":     cls.ID,
			"name":   cls.Name,
			"type":   cls.Type,
			"status": cls.Status,
			"region": cls.Region,
		}

		client, err := h.k8sMgr.GetClient(cls.ID)
		if err == nil {
			svc := resource.NewResourceService(client.Clientset)
			if overview, err := svc.GetClusterOverview(c.Request.Context()); err == nil {
				item["overview"] = overview
			}
		}
		result = append(result, item)
	}
	response.Success(c, result)
}

// ToggleStatus 切换集群启用/禁用
func (h *Handler) ToggleStatus(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 64)
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	h.db.Model(&model.Cluster{}).Where("id = ?", id).Update("status", req.Status)
	if req.Status == "inactive" {
		h.k8sMgr.RemoveCluster(uint(id))
	}
	response.SuccessMessage(c, "集群状态已更新")
}
