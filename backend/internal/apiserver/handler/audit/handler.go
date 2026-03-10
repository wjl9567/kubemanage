package audit

import (
	"fmt"

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

// List 分页查询审计日志
func (h *Handler) List(c *gin.Context) {
	page, _ := c.GetQuery("page")
	pageSize, _ := c.GetQuery("page_size")
	if page == "" {
		page = "1"
	}
	if pageSize == "" {
		pageSize = "20"
	}
	var pageInt, pageSizeInt int
	if _, err := fmt.Sscanf(page, "%d", &pageInt); err != nil || pageInt < 1 {
		pageInt = 1
	}
	if _, err := fmt.Sscanf(pageSize, "%d", &pageSizeInt); err != nil || pageSizeInt < 1 || pageSizeInt > 100 {
		pageSizeInt = 20
	}
	offset := (pageInt - 1) * pageSizeInt

	var total int64
	h.db.Model(&model.AuditLog{}).Count(&total)
	var list []model.AuditLog
	h.db.Order("id DESC").Offset(offset).Limit(pageSizeInt).Find(&list)
	response.Success(c, gin.H{"list": list, "total": total, "page": pageInt, "page_size": pageSizeInt})
}
