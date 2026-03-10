package router

import (
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"

	k8sclient "github.com/kubemanage/backend/internal/k8s/client"
	"github.com/kubemanage/backend/internal/apiserver/handler/alert"
	"github.com/kubemanage/backend/internal/apiserver/handler/apply"
	"github.com/kubemanage/backend/internal/apiserver/handler/audit"
	"github.com/kubemanage/backend/internal/apiserver/handler/auth"
	"github.com/kubemanage/backend/internal/apiserver/handler/backup"
	"github.com/kubemanage/backend/internal/apiserver/handler/cluster"
	"github.com/kubemanage/backend/internal/apiserver/handler/config"
	"github.com/kubemanage/backend/internal/apiserver/handler/crd"
	"github.com/kubemanage/backend/internal/apiserver/handler/hpa"
	"github.com/kubemanage/backend/internal/apiserver/handler/network"
	"github.com/kubemanage/backend/internal/apiserver/handler/node"
	"github.com/kubemanage/backend/internal/apiserver/handler/rbac"
	"github.com/kubemanage/backend/internal/apiserver/handler/storage"
	"github.com/kubemanage/backend/internal/apiserver/handler/system"
	"github.com/kubemanage/backend/internal/apiserver/handler/monitor"
	"github.com/kubemanage/backend/internal/apiserver/handler/template"
	"github.com/kubemanage/backend/internal/apiserver/handler/workload"
	"github.com/kubemanage/backend/internal/apiserver/middleware"
)

// Setup 注册所有路由
func Setup(r *gin.Engine, db *gorm.DB, k8sMgr *k8sclient.Manager, logger *zap.Logger) {
	// 中间件
	r.Use(middleware.CORS())
	r.Use(middleware.AuditLog(logger, db))

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
	authed.GET("/users/:id/clusters", middleware.RoleAuth("admin"), authHandler.ListUserClusters)
	authed.PUT("/users/:id/clusters", middleware.RoleAuth("admin"), authHandler.SetUserClusters)
	authed.GET("/users/:id/namespaces", middleware.RoleAuth("admin"), authHandler.ListUserNamespaces)
	authed.PUT("/users/:id/namespaces", middleware.RoleAuth("admin"), authHandler.SetUserNamespaces)

	// 集群管理
	clusterHandler := cluster.NewHandler(db, k8sMgr)
	authed.GET("/clusters", clusterHandler.List)
	authed.GET("/clusters/:id", clusterHandler.Get)
	authed.POST("/clusters", middleware.RoleAuth("admin", "operator"), clusterHandler.Create)
	authed.DELETE("/clusters/:id", middleware.RoleAuth("admin"), clusterHandler.Delete)
	authed.PUT("/clusters/:id/status", middleware.RoleAuth("admin"), clusterHandler.ToggleStatus)
	authed.GET("/clusters/:id/overview", clusterHandler.Overview)
	authed.GET("/clusters/overview", clusterHandler.MultiOverview)

	// 通用 YAML Apply 与原始资源获取（编辑 YAML 用）
	applyHandler := apply.NewHandler(k8sMgr)
	authed.POST("/apply", middleware.RoleAuth("admin", "operator"), applyHandler.Apply)
	authed.GET("/raw", applyHandler.GetRaw)

	// 命名空间（按集群）
	workloadHandler := workload.NewHandler(k8sMgr)
	authed.GET("/namespaces", workloadHandler.ListNamespaces)
	authed.POST("/namespaces", middleware.RoleAuth("admin", "operator"), workloadHandler.CreateNamespace)
	authed.DELETE("/namespaces/:name", middleware.RoleAuth("admin"), workloadHandler.DeleteNamespace)

	// 节点管理
	nodeHandler := node.NewHandler(k8sMgr)
	authed.GET("/nodes", nodeHandler.List)
	authed.GET("/nodes/:name", nodeHandler.Get)
	authed.PUT("/nodes/:name", middleware.RoleAuth("admin", "operator"), nodeHandler.Update)
	authed.GET("/nodes/:name/pods", nodeHandler.Pods)
	authed.GET("/nodes/:name/events", nodeHandler.Events)

	// 工作负载
	// Deployments
	authed.GET("/deployments", workloadHandler.ListDeployments)
	authed.GET("/deployments/:name", workloadHandler.GetDeployment)
	authed.PUT("/deployments/:name/scale", middleware.RoleAuth("admin", "operator"), workloadHandler.ScaleDeployment)
	authed.PUT("/deployments/:name/restart", middleware.RoleAuth("admin", "operator"), workloadHandler.RestartDeployment)
	authed.DELETE("/deployments/:name", middleware.RoleAuth("admin", "operator"), workloadHandler.DeleteDeployment)
	// StatefulSets
	authed.GET("/statefulsets", workloadHandler.ListStatefulSets)
	// DaemonSets
	authed.GET("/daemonsets", workloadHandler.ListDaemonSets)
	// Pods
	authed.GET("/pods", workloadHandler.ListPods)
	authed.GET("/pods/:name", workloadHandler.GetPod)
	authed.DELETE("/pods/:name", middleware.RoleAuth("admin", "operator"), workloadHandler.DeletePod)
	// Jobs
	authed.GET("/jobs", workloadHandler.ListJobs)
	authed.GET("/jobs/:name", workloadHandler.GetJob)
	authed.POST("/jobs", middleware.RoleAuth("admin", "operator"), workloadHandler.CreateJob)
	authed.DELETE("/jobs/:name", middleware.RoleAuth("admin", "operator"), workloadHandler.DeleteJob)
	// CronJobs
	authed.GET("/cronjobs", workloadHandler.ListCronJobs)
	authed.GET("/cronjobs/:name", workloadHandler.GetCronJob)
	authed.POST("/cronjobs", middleware.RoleAuth("admin", "operator"), workloadHandler.CreateCronJob)
	authed.DELETE("/cronjobs/:name", middleware.RoleAuth("admin", "operator"), workloadHandler.DeleteCronJob)
	// Pod WebSocket：日志 + 终端
	authed.GET("/pods/:name/logs", workloadHandler.PodLogs)
	authed.GET("/pods/:name/exec", workloadHandler.PodExec)

	// 配置管理
	configHandler := config.NewHandler(k8sMgr)
	authed.GET("/configmaps", configHandler.ListConfigMaps)
	authed.GET("/configmaps/:name", configHandler.GetConfigMap)
	authed.POST("/configmaps", middleware.RoleAuth("admin", "operator"), configHandler.CreateConfigMap)
	authed.PUT("/configmaps/:name", middleware.RoleAuth("admin", "operator"), configHandler.UpdateConfigMap)
	authed.DELETE("/configmaps/:name", middleware.RoleAuth("admin", "operator"), configHandler.DeleteConfigMap)
	authed.GET("/secrets", configHandler.ListSecrets)
	authed.GET("/secrets/:name", configHandler.GetSecret)
	authed.POST("/secrets", middleware.RoleAuth("admin", "operator"), configHandler.CreateSecret)
	authed.PUT("/secrets/:name", middleware.RoleAuth("admin", "operator"), configHandler.UpdateSecret)
	authed.DELETE("/secrets/:name", middleware.RoleAuth("admin", "operator"), configHandler.DeleteSecret)

	// 存储管理
	storageHandler := storage.NewHandler(k8sMgr)
	authed.GET("/storageclasses", storageHandler.ListStorageClasses)
	authed.GET("/storageclasses/:name", storageHandler.GetStorageClass)
	authed.GET("/pvs", storageHandler.ListPVs)
	authed.GET("/pvs/:name", storageHandler.GetPV)
	authed.GET("/pvcs", storageHandler.ListPVCs)
	authed.GET("/pvcs/:name", storageHandler.GetPVC)
	authed.DELETE("/pvcs/:name", middleware.RoleAuth("admin", "operator"), storageHandler.DeletePVC)

	// 网络资源
	networkHandler := network.NewHandler(k8sMgr)
	authed.GET("/services", networkHandler.ListServices)
	authed.GET("/services/:name", networkHandler.GetService)
	authed.POST("/services", middleware.RoleAuth("admin", "operator"), networkHandler.CreateService)
	authed.PUT("/services/:name", middleware.RoleAuth("admin", "operator"), networkHandler.UpdateService)
	authed.DELETE("/services/:name", middleware.RoleAuth("admin", "operator"), networkHandler.DeleteService)
	authed.GET("/ingresses", networkHandler.ListIngresses)
	authed.GET("/ingresses/:name", networkHandler.GetIngress)
	authed.POST("/ingresses", middleware.RoleAuth("admin", "operator"), networkHandler.CreateIngress)
	authed.PUT("/ingresses/:name", middleware.RoleAuth("admin", "operator"), networkHandler.UpdateIngress)
	authed.DELETE("/ingresses/:name", middleware.RoleAuth("admin", "operator"), networkHandler.DeleteIngress)

	// Prometheus 监控代理（需配置 PROMETHEUS_URL）
	monitorHandler := monitor.NewHandler()
	authed.GET("/monitor/prometheus/query", monitorHandler.Query)
	authed.GET("/monitor/prometheus/query_range", monitorHandler.QueryRange)

	// HPA
	hpaHandler := hpa.NewHandler(k8sMgr)
	authed.GET("/hpas", hpaHandler.List)
	authed.GET("/hpas/:name", hpaHandler.Get)
	authed.POST("/hpas", middleware.RoleAuth("admin", "operator"), hpaHandler.Create)
	authed.PUT("/hpas/:name", middleware.RoleAuth("admin", "operator"), hpaHandler.Update)
	authed.DELETE("/hpas/:name", middleware.RoleAuth("admin", "operator"), hpaHandler.Delete)

	// K8s RBAC（Role/ClusterRole/RoleBinding/ClusterRoleBinding）
	rbacHandler := rbac.NewHandler(k8sMgr)
	authed.GET("/rbac/roles", rbacHandler.ListRoles)
	authed.GET("/rbac/roles/:name", rbacHandler.GetRole)
	authed.GET("/rbac/clusterroles", rbacHandler.ListClusterRoles)
	authed.GET("/rbac/clusterroles/:name", rbacHandler.GetClusterRole)
	authed.GET("/rbac/rolebindings", rbacHandler.ListRoleBindings)
	authed.GET("/rbac/rolebindings/:name", rbacHandler.GetRoleBinding)
	authed.GET("/rbac/clusterrolebindings", rbacHandler.ListClusterRoleBindings)
	authed.GET("/rbac/clusterrolebindings/:name", rbacHandler.GetClusterRoleBinding)

	// CRD 列表与实例（按集群）
	crdHandler := crd.NewHandler(k8sMgr)
	authed.GET("/crds", crdHandler.List)
	authed.GET("/crds/:name/instances", crdHandler.ListInstances)
	authed.GET("/crds/:name/instances/:iname", crdHandler.GetInstance)
	authed.POST("/crds/:name/instances", middleware.RoleAuth("admin", "operator"), crdHandler.CreateInstance)
	authed.PUT("/crds/:name/instances/:iname", middleware.RoleAuth("admin", "operator"), crdHandler.UpdateInstance)
	authed.DELETE("/crds/:name/instances/:iname", middleware.RoleAuth("admin", "operator"), crdHandler.DeleteInstance)

	// 审计、系统配置、告警、备份、模板（生产级）
	auditHandler := audit.NewHandler(db)
	authed.GET("/audit/logs", middleware.RoleAuth("admin"), auditHandler.List)
	systemHandler := system.NewHandler(db)
	authed.GET("/system/config", systemHandler.Get)
	authed.PUT("/system/config", middleware.RoleAuth("admin"), systemHandler.Update)
	alertHandler := alert.NewHandler(db)
	authed.GET("/alert-channels", alertHandler.ListChannels)
	authed.POST("/alert-channels", middleware.RoleAuth("admin"), alertHandler.CreateChannel)
	authed.PUT("/alert-channels/:id", middleware.RoleAuth("admin"), alertHandler.UpdateChannel)
	authed.DELETE("/alert-channels/:id", middleware.RoleAuth("admin"), alertHandler.DeleteChannel)
	backupHandler := backup.NewHandler(db)
	authed.GET("/backups", backupHandler.List)
	authed.POST("/backups", middleware.RoleAuth("admin"), backupHandler.Create)
	authed.GET("/backups/:id/download", middleware.RoleAuth("admin"), backupHandler.Download)
	templateHandler := template.NewHandler(db)
	authed.GET("/templates", templateHandler.List)
	authed.GET("/templates/:id", templateHandler.Get)
	authed.POST("/templates", middleware.RoleAuth("admin", "operator"), templateHandler.Create)
	authed.PUT("/templates/:id", middleware.RoleAuth("admin", "operator"), templateHandler.Update)
	authed.DELETE("/templates/:id", middleware.RoleAuth("admin", "operator"), templateHandler.Delete)

	// 前端静态资源与 SPA 回退（Docker 镜像内 ./web 为前端构建产物）
	webRoot := "web"
	if v := os.Getenv("WEB_ROOT"); v != "" {
		webRoot = v
	}
	indexPath := filepath.Join(webRoot, "index.html")
	if fi, err := os.Stat(indexPath); err == nil && !fi.IsDir() {
		assetsDir := filepath.Join(webRoot, "assets")
		if _, err := os.Stat(assetsDir); err == nil {
			r.Static("/assets", assetsDir)
		}
		favicon := filepath.Join(webRoot, "favicon.ico")
		if _, err := os.Stat(favicon); err == nil {
			r.StaticFile("/favicon.ico", favicon)
		}
		r.NoRoute(func(c *gin.Context) {
			c.File(indexPath)
		})
		logger.Info("已挂载前端静态资源", zap.String("web_root", webRoot))
	}
}
