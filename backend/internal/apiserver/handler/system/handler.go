package system

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

// Get 获取全部系统配置（按 category 分组）
func (h *Handler) Get(c *gin.Context) {
	var list []model.SystemConfig
	h.db.Order("category, key").Find(&list)
	// 转为 map[key]value 便于前端使用
	m := make(map[string]string)
	for _, c := range list {
		m[c.Key] = c.Value
	}
	response.Success(c, m)
}

// Update 批量更新系统配置
func (h *Handler) Update(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	for k, v := range req {
		var one model.SystemConfig
		if h.db.Where("key = ?", k).First(&one).Error != nil {
			h.db.Create(&model.SystemConfig{Key: k, Value: v})
		} else {
			h.db.Model(&one).Update("value", v)
		}
	}
	response.SuccessMessage(c, "保存成功")
}
