package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/kubemanage/backend/internal/model"
	"github.com/kubemanage/backend/internal/pkg/auth"
	"github.com/kubemanage/backend/internal/pkg/response"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct {
	db *gorm.DB
}

func NewHandler(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token    string      `json:"token"`
	UserInfo model.User  `json:"user_info"`
}

// Login 用户登录
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请输入用户名和密码")
		return
	}

	var user model.User
	if err := h.db.Where("username = ? AND status = 1", req.Username).First(&user).Error; err != nil {
		response.Error(c, response.ErrCodeUserNotFound, "用户不存在或已被禁用")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		response.Error(c, response.ErrCodePasswordWrong, "密码错误")
		return
	}

	token, err := auth.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		response.ServerError(c, "生成令牌失败")
		return
	}

	// 更新最后登录时间
	h.db.Model(&user).Update("last_login", gorm.Expr("NOW()"))

	response.Success(c, LoginResponse{
		Token:    token,
		UserInfo: user,
	})
}

// GetUserInfo 获取当前用户信息
func (h *Handler) GetUserInfo(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user model.User
	if err := h.db.First(&user, userID).Error; err != nil {
		response.Error(c, response.ErrCodeUserNotFound, "用户不存在")
		return
	}
	response.Success(c, user)
}

// ListUsers 用户列表
func (h *Handler) ListUsers(c *gin.Context) {
	var users []model.User
	var total int64
	h.db.Model(&model.User{}).Count(&total)
	h.db.Order("id desc").Find(&users)
	response.Success(c, gin.H{"list": users, "total": total})
}

var allowedRoles = []string{"admin", "operator", "developer", "viewer"}

// CreateUser 创建用户
func (h *Handler) CreateUser(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required,min=6"`
		Nickname string `json:"nickname"`
		Email    string `json:"email"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	// 角色白名单，防止越权创建 admin
	roleOK := false
	for _, r := range allowedRoles {
		if req.Role == r {
			roleOK = true
			break
		}
	}
	if !roleOK {
		response.BadRequest(c, "角色必须是 admin/operator/developer/viewer 之一")
		return
	}
	currentRole, _ := c.Get("role")
	if cr, ok := currentRole.(string); ok && cr == "operator" && req.Role == "admin" {
		response.Forbidden(c, "operator 不能创建 admin 用户")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.ServerError(c, "密码加密失败")
		return
	}
	user := model.User{
		Username: req.Username,
		Password: string(hash),
		Nickname: req.Nickname,
		Email:    req.Email,
		Role:     req.Role,
		Status:   1,
	}

	if err := h.db.Create(&user).Error; err != nil {
		response.Error(c, response.ErrCodeResourceExists, "用户名已存在")
		return
	}
	response.Success(c, user)
}

// UpdatePassword 修改密码
func (h *Handler) UpdatePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	var user model.User
	h.db.First(&user, userID)
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		response.Error(c, response.ErrCodePasswordWrong, "原密码错误")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response.ServerError(c, "密码加密失败")
		return
	}
	h.db.Model(&user).Update("password", string(hash))
	response.SuccessMessage(c, "密码修改成功")
}
