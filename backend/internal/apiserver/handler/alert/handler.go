package alert

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

func (h *Handler) ListChannels(c *gin.Context) {
	var list []model.AlertChannel
	h.db.Order("priority DESC, id").Find(&list)
	response.Success(c, gin.H{"list": list, "total": len(list)})
}

func (h *Handler) CreateChannel(c *gin.Context) {
	var body model.AlertChannel
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	if body.Name == "" || body.Type == "" {
		response.BadRequest(c, "name 和 type 必填")
		return
	}
	if err := h.db.Create(&body).Error; err != nil {
		response.Error(c, response.ErrCodeResourceExists, "创建失败")
		return
	}
	response.Success(c, body)
}

func (h *Handler) UpdateChannel(c *gin.Context) {
	var body model.AlertChannel
	if err := c.ShouldBindJSON(&body); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	h.db.Model(&model.AlertChannel{}).Where("id = ?", c.Param("id")).Updates(map[string]interface{}{
		"name": body.Name, "type": body.Type, "config": body.Config, "enabled": body.Enabled, "priority": body.Priority,
	})
	response.SuccessMessage(c, "更新成功")
}

func (h *Handler) DeleteChannel(c *gin.Context) {
	h.db.Delete(&model.AlertChannel{}, c.Param("id"))
	response.SuccessMessage(c, "删除成功")
}
