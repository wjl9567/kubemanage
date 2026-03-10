package template

import (
	"github.com/gin-gonic/gin"
	"github.com/kubemanage/backend/internal/model"
	"github.com/kubemanage/backend/internal/pkg/response"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

// List 资源模板列表
func (h *Handler) List(c *gin.Context) {
	var list []model.ResourceTemplate
	h.db.Where("enabled = ?", true).Order("category, name").Find(&list)
	response.Success(c, gin.H{"list": list, "total": len(list)})
}

// Get 模板详情
func (h *Handler) Get(c *gin.Context) {
	var t model.ResourceTemplate
	if err := h.db.First(&t, c.Param("id")).Error; err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, "模板不存在")
		return
	}
	response.Success(c, t)
}

// Create 创建模板
func (h *Handler) Create(c *gin.Context) {
	var req model.ResourceTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	if req.Name == "" || req.Content == "" {
		response.BadRequest(c, "name 和 content 必填")
		return
	}
	userID, _ := c.Get("user_id")
	req.CreatedBy = userID.(uint)
	if err := h.db.Create(&req).Error; err != nil {
		response.Error(c, response.ErrCodeResourceExists, "创建失败")
		return
	}
	response.Success(c, req)
}

// Update 更新模板
func (h *Handler) Update(c *gin.Context) {
	var req model.ResourceTemplate
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	if err := h.db.Model(&model.ResourceTemplate{}).Where("id = ?", c.Param("id")).Updates(map[string]interface{}{
		"name": req.Name, "display_name": req.DisplayName, "description": req.Description,
		"type": req.Type, "category": req.Category, "content": req.Content, "tags": req.Tags, "enabled": req.Enabled,
	}).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessMessage(c, "更新成功")
}

// Delete 删除模板
func (h *Handler) Delete(c *gin.Context) {
	if err := h.db.Delete(&model.ResourceTemplate{}, c.Param("id")).Error; err != nil {
		response.ServerError(c, "删除失败")
		return
	}
	response.SuccessMessage(c, "删除成功")
}
