package router

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"

	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/apiserver/handler/auth"
	"github.com/kubemanage/backend/internal/apiserver/handler/cluster"
	"github.com/kubemanage/backend/internal/apiserver/handler/config"
	"github.com/kubemanage/backend/internal/apiserver/handler/network"
	"github.com/kubemanage/backend/internal/apiserver/handler/node"
	"github.com/kubemanage/backend/internal/apiserver/handler/storage"
	"github.com/kubemanage/backend/internal/apiserver/handler/workload"
	"github.com/kubemanage/backend/internal/apiserver/middleware"
)

// Setup 注册所有路由
func Setup(r *gin.Engine, db *gorm.DB, k8sMgr *k8sclient.Manager, logger *zap.Logger) {
	// 中间件
	r.Use(middleware.CORS())
	r.Use(middleware.AuditLog(logger))

	// 健康检查
	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })

	// API v1
	v1 := r.Group("/api/v1")

	// 认证 - 无需登录
	authHandler := auth.NewHandler(db)
	v1.POST("/auth/login", authHandler.Login)

	// 需要认证的路由
	authed := v1.Group("")
	authed.Use(middleware.JWTAuth())

	// 用户
	authed.GET("/auth/userinfo", authHandler.GetUserInfo)
	authed.PUT("/auth/password", authHandler.UpdatePassword)
	authed.GET("/users", middleware.RoleAuth("admin"), authHandler.ListUsers)
	authed.POST("/users", middleware.RoleAuth("admin"), authHandler.CreateUser)

	// 集群管理
	clusterHandler := cluster.NewHandler(db, k8sMgr)
	authed.GET("/clusters", clusterHandler.List)
	authed.GET("/clusters/:id", clusterHandler.Get)
	authed.POST("/clusters", middleware.RoleAuth("admin", "operator"), clusterHandler.Create)
	authed.DELETE("/clusters/:id", middleware.RoleAuth("admin"), clusterHandler.Delete)
	authed.PUT("/clusters/:id/status", middleware.RoleAuth("admin"), clusterHandler.ToggleStatus)
	authed.GET("/clusters/:id/overview", clusterHandler.Overview)
	authed.GET("/clusters/overview", clusterHandler.MultiOverview)

	// 节点管理
	nodeHandler := node.NewHandler(k8sMgr)
	authed.GET("/nodes", nodeHandler.List)
	authed.GET("/nodes/:name", nodeHandler.Get)
	authed.GET("/nodes/:name/pods", nodeHandler.Pods)
	authed.GET("/nodes/:name/events", nodeHandler.Events)

	// 工作负载
	workloadHandler := workload.NewHandler(k8sMgr)
	// Deployments
	authed.GET("/deployments", workloadHandler.ListDeployments)
	authed.GET("/deployments/:name", workloadHandler.GetDeployment)
	authed.PUT("/deployments/:name/scale", workloadHandler.ScaleDeployment)
	authed.PUT("/deployments/:name/restart", workloadHandler.RestartDeployment)
	authed.DELETE("/deployments/:name", workloadHandler.DeleteDeployment)
	// StatefulSets
	authed.GET("/statefulsets", workloadHandler.ListStatefulSets)
	// DaemonSets
	authed.GET("/daemonsets", workloadHandler.ListDaemonSets)
	// Pods
	authed.GET("/pods", workloadHandler.ListPods)
	authed.GET("/pods/:name", workloadHandler.GetPod)
	authed.DELETE("/pods/:name", workloadHandler.DeletePod)
	// Pod WebSocket：日志 + 终端
	authed.GET("/pods/:name/logs", workloadHandler.PodLogs)
	authed.GET("/pods/:name/exec", workloadHandler.PodExec)

	// 配置管理
	configHandler := config.NewHandler(k8sMgr)
	authed.GET("/configmaps", configHandler.ListConfigMaps)
	authed.GET("/configmaps/:name", configHandler.GetConfigMap)
	authed.POST("/configmaps", configHandler.CreateConfigMap)
	authed.PUT("/configmaps/:name", configHandler.UpdateConfigMap)
	authed.DELETE("/configmaps/:name", configHandler.DeleteConfigMap)
	authed.GET("/secrets", configHandler.ListSecrets)
	authed.GET("/secrets/:name", configHandler.GetSecret)
	authed.DELETE("/secrets/:name", configHandler.DeleteSecret)

	// 存储管理
	storageHandler := storage.NewHandler(k8sMgr)
	authed.GET("/storageclasses", storageHandler.ListStorageClasses)
	authed.GET("/storageclasses/:name", storageHandler.GetStorageClass)
	authed.GET("/pvcs", storageHandler.ListPVCs)
	authed.GET("/pvcs/:name", storageHandler.GetPVC)
	authed.DELETE("/pvcs/:name", storageHandler.DeletePVC)

	// 网络资源
	networkHandler := network.NewHandler(k8sMgr)
	authed.GET("/services", networkHandler.ListServices)
	authed.GET("/services/:name", networkHandler.GetService)
	authed.DELETE("/services/:name", networkHandler.DeleteService)
	authed.GET("/ingresses", networkHandler.ListIngresses)
	authed.GET("/ingresses/:name", networkHandler.GetIngress)
	authed.DELETE("/ingresses/:name", networkHandler.DeleteIngress)
}
