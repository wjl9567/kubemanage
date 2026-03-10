package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/apiserver/router"
	"github.com/kubemanage/backend/internal/model"
	"github.com/kubemanage/backend/internal/pkg/auth"
	"github.com/kubemanage/backend/internal/pkg/encrypt"
)

func main() {
	// 初始化日志
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// 数据库连接
	dsn := getEnv("DATABASE_URL", "")
	var db *gorm.DB
	var err error

	if dsn != "" {
		// 有 DATABASE_URL 时连接 PostgreSQL
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Fatalf("数据库连接失败: %v", err)
		}
		logger.Info("已连接 PostgreSQL 数据库")
	} else {
		// 无数据库时使用 SQLite 内存模式（开发/演示用）
		log.Println("⚠️  未配置 DATABASE_URL，使用 SQLite 内存数据库（数据重启后丢失）")
		db, err = gorm.Open(sqlite.Open("kubemanage.db"), &gorm.Config{})
		if err != nil {
			log.Fatalf("SQLite 初始化失败: %v", err)
		}
		logger.Info("使用 SQLite 本地数据库: kubemanage.db")
	}

	// 安全配置：从环境变量读取密钥，生产环境必须设置
	if s := os.Getenv("JWT_SECRET"); s != "" {
		auth.SetJWTSecret(s)
	}
	if s := os.Getenv("ENCRYPT_KEY"); len(s) == 32 {
		encrypt.SetEncryptionKey(s)
	}

	// 自动迁移
	db.AutoMigrate(
		&model.User{},
		&model.Cluster{},
		&model.Tenant{},
		&model.AlertRule{},
		&model.AlertHistory{},
		&model.AlertChannel{},
		&model.AuditLog{},
		&model.ResourceTemplate{},
		&model.SystemConfig{},
		&model.Backup{},
		&model.UserCluster{},
		&model.UserNamespace{},
	)

	// 创建默认管理员
	initDefaultAdmin(db)

	// K8s 多集群管理器
	k8sMgr := k8sclient.NewManager()

	// 加载已注册的集群
	loadRegisteredClusters(db, k8sMgr, logger)

	// 创建 Gin 引擎
	mode := getEnv("GIN_MODE", "debug")
	gin.SetMode(mode)
	r := gin.New()
	r.Use(gin.Recovery())

	// 注册路由
	router.Setup(r, db, k8sMgr, logger)

	// 启动服务
	port := getEnv("PORT", "8080")
	logger.Info("KubeManage API Server 启动", zap.String("port", port))
	fmt.Printf("\n🚀 KubeManage API Server running on http://0.0.0.0:%s\n\n", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

func initDefaultAdmin(db *gorm.DB) {
	var count int64
	db.Model(&model.User{}).Count(&count)
	if count == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("默认管理员密码哈希失败: %v", err)
		}
		db.Create(&model.User{
			Username: "admin",
			Password: string(hash),
			Nickname: "系统管理员",
			Role:     "admin",
			Status:   1,
		})
		log.Println("✅ 默认管理员已创建: admin / admin123")
	}
}

func loadRegisteredClusters(db *gorm.DB, mgr *k8sclient.Manager, logger *zap.Logger) {
	var clusters []model.Cluster
	db.Where("status = ?", "active").Find(&clusters)
	for _, c := range clusters {
		if c.KubeConfig != "" {
			kubeConfig, err := encrypt.Decrypt(c.KubeConfig)
			if err != nil {
				logger.Warn("集群 KubeConfig 解密失败，跳过", zap.String("name", c.Name), zap.Error(err))
				continue
			}
			if err := mgr.AddCluster(c.ID, c.Name, kubeConfig); err != nil {
				logger.Warn("集群连接失败", zap.String("name", c.Name), zap.Error(err))
			} else {
				logger.Info("集群已连接", zap.String("name", c.Name))
			}
		} else if c.Token != "" && c.APIServer != "" {
			token, err := encrypt.Decrypt(c.Token)
			if err != nil {
				logger.Warn("集群 Token 解密失败，跳过", zap.String("name", c.Name), zap.Error(err))
				continue
			}
			caCert := c.CACert
			if caCert != "" {
				if dec, err := encrypt.Decrypt(caCert); err == nil {
					caCert = dec
				}
			}
			if err := mgr.AddClusterFromToken(c.ID, c.Name, c.APIServer, token, caCert); err != nil {
				logger.Warn("集群(Token)连接失败", zap.String("name", c.Name), zap.Error(err))
			} else {
				logger.Info("集群已连接", zap.String("name", c.Name))
			}
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
