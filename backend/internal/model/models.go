package model

import (
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID        uint           `json:"id" gorm:"primarykey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
	Username  string         `json:"username" gorm:"uniqueIndex;size:64;not null"`
	Password  string         `json:"-" gorm:"size:256;not null"`
	Nickname  string         `json:"nickname" gorm:"size:64"`
	Email     string         `json:"email" gorm:"size:128"`
	Phone     string         `json:"phone" gorm:"size:20"`
	Avatar    string         `json:"avatar" gorm:"size:512"`
	Role      string         `json:"role" gorm:"size:32;default:viewer"` // admin, operator, developer, viewer
	Status    int            `json:"status" gorm:"default:1"`            // 1=active, 0=disabled
	LastLogin *time.Time     `json:"last_login"`
	MFASecret string         `json:"-" gorm:"size:128"`
}

// Cluster 集群模型
type Cluster struct {
	ID          uint           `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Name        string         `json:"name" gorm:"uniqueIndex;size:128;not null"`
	DisplayName string         `json:"display_name" gorm:"size:128"`
	Description string         `json:"description" gorm:"size:512"`
	Type        string         `json:"type" gorm:"size:32;not null"` // self-hosted, ack, tke, eks, cce
	Provider    string         `json:"provider" gorm:"size:32"`      // aliyun, tencent, aws, huawei, custom
	Region      string         `json:"region" gorm:"size:64"`
	Version     string         `json:"version" gorm:"size:32"`
	APIServer   string         `json:"api_server" gorm:"size:512;not null"`
	KubeConfig  string         `json:"-" gorm:"type:text"`
	CACert      string         `json:"-" gorm:"type:text"`
	Token       string         `json:"-" gorm:"type:text"`
	Status      string         `json:"status" gorm:"size:32;default:active"` // active, inactive, error
	NodeCount   int            `json:"node_count" gorm:"default:0"`
	PodCount    int            `json:"pod_count" gorm:"default:0"`
	TenantID    uint           `json:"tenant_id" gorm:"index"`
}

// Tenant 租户模型
type Tenant struct {
	ID          uint           `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Name        string         `json:"name" gorm:"uniqueIndex;size:128;not null"`
	DisplayName string         `json:"display_name" gorm:"size:128"`
	Description string         `json:"description" gorm:"size:512"`
	Status      int            `json:"status" gorm:"default:1"`
}

// AlertRule 告警规则
type AlertRule struct {
	ID          uint           `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Name        string         `json:"name" gorm:"size:128;not null"`
	ClusterID   uint           `json:"cluster_id" gorm:"index"`
	Namespace   string         `json:"namespace" gorm:"size:128"`
	ResourceType string        `json:"resource_type" gorm:"size:64"` // pod, node, service, etc.
	Metric      string         `json:"metric" gorm:"size:256"`
	Condition   string         `json:"condition" gorm:"size:32"`   // gt, lt, eq, gte, lte
	Threshold   float64        `json:"threshold"`
	Duration    string         `json:"duration" gorm:"size:32"`    // 5m, 10m, 30m
	Severity    string         `json:"severity" gorm:"size:16"`    // critical, warning, info
	Enabled     bool           `json:"enabled" gorm:"default:true"`
	SilencedUntil *time.Time   `json:"silenced_until"`
	AutoHeal    bool           `json:"auto_heal" gorm:"default:false"`
	HealAction  string         `json:"heal_action" gorm:"size:64"` // restart_pod, scale_up, etc.
	Channels    string         `json:"channels" gorm:"type:text"`  // JSON array of channel IDs
}

// AlertHistory 告警历史
type AlertHistory struct {
	ID           uint      `json:"id" gorm:"primarykey"`
	CreatedAt    time.Time `json:"created_at"`
	AlertRuleID  uint      `json:"alert_rule_id" gorm:"index"`
	ClusterID    uint      `json:"cluster_id" gorm:"index"`
	Namespace    string    `json:"namespace" gorm:"size:128"`
	Resource     string    `json:"resource" gorm:"size:256"`
	Message      string    `json:"message" gorm:"type:text"`
	Severity     string    `json:"severity" gorm:"size:16"`
	Status       string    `json:"status" gorm:"size:32"` // firing, resolved, silenced
	ResolvedAt   *time.Time `json:"resolved_at"`
	ResolvedBy   string    `json:"resolved_by" gorm:"size:64"`
	Value        float64   `json:"value"`
}

// AlertChannel 告警渠道
type AlertChannel struct {
	ID          uint           `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Name        string         `json:"name" gorm:"size:128;not null"`
	Type        string         `json:"type" gorm:"size:32;not null"` // email, dingtalk, wechat, sms, slack
	Config      string         `json:"config" gorm:"type:text"`      // JSON config
	Enabled     bool           `json:"enabled" gorm:"default:true"`
	Priority    int            `json:"priority" gorm:"default:0"`
}

// AuditLog 审计日志
type AuditLog struct {
	ID         uint      `json:"id" gorm:"primarykey"`
	CreatedAt  time.Time `json:"created_at" gorm:"index"`
	UserID     uint      `json:"user_id" gorm:"index"`
	Username   string    `json:"username" gorm:"size:64"`
	ClusterID  uint      `json:"cluster_id" gorm:"index"`
	Action     string    `json:"action" gorm:"size:32"`     // create, update, delete, exec
	Resource   string    `json:"resource" gorm:"size:64"`    // pod, deployment, configmap, etc.
	Name       string    `json:"name" gorm:"size:256"`
	Namespace  string    `json:"namespace" gorm:"size:128"`
	Detail     string    `json:"detail" gorm:"type:text"`
	Before     string    `json:"before" gorm:"type:text"`    // JSON before change
	After      string    `json:"after" gorm:"type:text"`     // JSON after change
	Result     string    `json:"result" gorm:"size:16"`      // success, failure
	IP         string    `json:"ip" gorm:"size:64"`
	UserAgent  string    `json:"user_agent" gorm:"size:512"`
}

// ResourceTemplate 资源模板
type ResourceTemplate struct {
	ID          uint           `json:"id" gorm:"primarykey"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`
	Name        string         `json:"name" gorm:"size:128;not null"`
	DisplayName string         `json:"display_name" gorm:"size:128"`
	Description string         `json:"description" gorm:"size:512"`
	Type        string         `json:"type" gorm:"size:64;not null"` // deployment, configmap, secret, ingress, crd
	Category    string         `json:"category" gorm:"size:32"`      // production, testing, general
	Content     string         `json:"content" gorm:"type:text;not null"` // YAML content
	Version     int            `json:"version" gorm:"default:1"`
	Tags        string         `json:"tags" gorm:"size:512"`
	Enabled     bool           `json:"enabled" gorm:"default:true"`
	CreatedBy   uint           `json:"created_by"`
}

// SystemConfig 系统配置
type SystemConfig struct {
	ID        uint           `json:"id" gorm:"primarykey"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	Key       string         `json:"key" gorm:"uniqueIndex;size:128;not null"`
	Value     string         `json:"value" gorm:"type:text"`
	Category  string         `json:"category" gorm:"size:64"`
}

// Backup 备份记录
type Backup struct {
	ID        uint      `json:"id" gorm:"primarykey"`
	CreatedAt time.Time `json:"created_at"`
	Name      string    `json:"name" gorm:"size:256;not null"`
	Type      string    `json:"type" gorm:"size:32"` // auto, manual
	Scope     string    `json:"scope" gorm:"size:32"` // full, incremental
	Size      int64     `json:"size"`
	FilePath  string    `json:"file_path" gorm:"size:512"`
	Status    string    `json:"status" gorm:"size:32"` // running, success, failed
	Duration  int       `json:"duration"`               // seconds
	CreatedBy string    `json:"created_by" gorm:"size:64"`
}
