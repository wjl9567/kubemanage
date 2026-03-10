package backup

import (
	"context"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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

func getBackupDir() string { return os.Getenv("BACKUP_DIR") }
func getDatabaseURL() string { return os.Getenv("DATABASE_URL") }
func getSQLitePath() string {
	if p := os.Getenv("SQLITE_PATH"); p != "" {
		return p
	}
	return "kubemanage.db"
}

// List 备份记录列表
func (h *Handler) List(c *gin.Context) {
	var list []model.Backup
	h.db.Order("id DESC").Limit(100).Find(&list)
	response.Success(c, gin.H{"list": list, "total": len(list)})
}

// Create 创建备份：若配置 BACKUP_DIR 则执行真实导出（PostgreSQL pg_dump 或 SQLite 文件复制），并写入 FilePath/Size
func (h *Handler) Create(c *gin.Context) {
	username, _ := c.Get("username")
	name := time.Now().Format("backup-20060102-150405")
	scope := c.DefaultQuery("scope", "full")
	rec := model.Backup{
		Name:      name,
		Type:      "manual",
		Scope:     scope,
		Status:    "running",
		Duration:  0,
		CreatedBy: username.(string),
	}
	if err := h.db.Create(&rec).Error; err != nil {
		response.ServerError(c, "创建备份记录失败")
		return
	}

	backupDir := getBackupDir()
	if backupDir != "" {
		start := time.Now()
		var filePath string
		var size int64
		dsn := getDatabaseURL()
		if dsn != "" {
			filePath, size = exportPostgres(c.Request.Context(), backupDir, name, dsn)
		} else {
			filePath, size = exportSQLite(backupDir, name)
		}
		rec.Status = "success"
		rec.FilePath = filePath
		rec.Size = size
		rec.Duration = int(time.Since(start).Seconds())
		if filePath == "" {
			rec.Status = "failed"
		}
		h.db.Model(&rec).Updates(map[string]interface{}{
			"status": rec.Status, "file_path": rec.FilePath, "size": rec.Size, "duration": rec.Duration,
		})
	} else {
		rec.Status = "success"
		h.db.Model(&rec).Update("status", "success")
	}

	response.Success(c, gin.H{"message": "备份任务已创建", "record": rec})
}

func exportPostgres(ctx context.Context, backupDir, name, dsn string) (outPath string, size int64) {
	outPath = filepath.Join(backupDir, name+".sql")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", 0
	}
	// 使用 pg_dump：支持 URI 或 libpq 键值形式
	cmd := execCommand(ctx, dsn, outPath)
	if cmd == nil {
		return "", 0
	}
	if err := cmd.Run(); err != nil {
		_ = os.Remove(outPath)
		return "", 0
	}
	info, _ := os.Stat(outPath)
	if info != nil {
		size = info.Size()
	}
	return outPath, size
}

func exportSQLite(backupDir, name string) (outPath string, size int64) {
	src := getSQLitePath()
	outPath = filepath.Join(backupDir, name+".db")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", 0
	}
	f, err := os.Open(src)
	if err != nil {
		return "", 0
	}
	defer f.Close()
	info, _ := f.Stat()
	if info != nil {
		size = info.Size()
	}
	dest, err := os.Create(outPath)
	if err != nil {
		return "", 0
	}
	defer dest.Close()
	if _, err := io.Copy(dest, f); err != nil {
		_ = os.Remove(outPath)
		return "", 0
	}
	return outPath, size
}

func execCommand(ctx context.Context, dsn, outPath string) *exec.Cmd {
	// 若为 postgresql:// 或 postgres:// 则直接作为 URI 传参
	if strings.HasPrefix(dsn, "postgresql://") || strings.HasPrefix(dsn, "postgres://") {
		cmd := exec.CommandContext(ctx, "pg_dump", "-f", outPath, dsn)
		return cmd
	}
	// 解析 host= user= password= dbname= port= 并设置环境变量后执行 pg_dump dbname
	env := parseDSNEnv(dsn)
	dbname := env["PGDATABASE"]
	if dbname == "" {
		return nil
	}
	cmd := exec.CommandContext(ctx, "pg_dump", "-f", outPath, dbname)
	for k, v := range env {
		cmd.Env = append(os.Environ(), k+"="+v)
	}
	return cmd
}

func parseDSNEnv(dsn string) map[string]string {
	m := make(map[string]string)
	for _, part := range strings.Fields(dsn) {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		k := strings.TrimSpace(strings.ToUpper(kv[0]))
		v := strings.TrimSpace(kv[1])
		switch k {
		case "HOST":
			m["PGHOST"] = v
		case "USER":
			m["PGUSER"] = v
		case "PASSWORD":
			m["PGPASSWORD"] = v
		case "DBNAME":
			m["PGDATABASE"] = v
		case "PORT":
			m["PGPORT"] = v
		}
	}
	return m
}

// Download 下载备份文件：仅当记录存在且 FilePath 在 BACKUP_DIR 内时返回文件流
func (h *Handler) Download(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil || id == 0 {
		response.BadRequest(c, "无效的备份 ID")
		return
	}
	var rec model.Backup
	if err := h.db.First(&rec, id).Error; err != nil || rec.ID == 0 {
		response.Error(c, response.ErrCodeResourceNotFound, "备份记录不存在")
		return
	}
	if rec.FilePath == "" {
		response.Error(c, response.ErrCodeResourceNotFound, "该备份无文件可下载")
		return
	}
	backupDir := getBackupDir()
	if backupDir == "" {
		response.ServerError(c, "未配置 BACKUP_DIR")
		return
	}
	abs, err := filepath.Abs(rec.FilePath)
	if err != nil {
		response.ServerError(c, "路径无效")
		return
	}
	base, err := filepath.Abs(backupDir)
	if err != nil {
		response.ServerError(c, "BACKUP_DIR 无效")
		return
	}
	rel, err := filepath.Rel(base, abs)
	if err != nil || strings.HasPrefix(rel, "..") {
		response.BadRequest(c, "不允许访问该路径")
		return
	}
	if _, err := os.Stat(abs); err != nil {
		response.Error(c, response.ErrCodeResourceNotFound, "备份文件不存在")
		return
	}
	c.Header("Content-Disposition", "attachment; filename="+filepath.Base(rec.FilePath))
	c.File(abs)
}
