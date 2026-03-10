package client

import (
	"fmt"
	"sync"
	"time"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	metricsv "k8s.io/metrics/pkg/client/clientset/versioned"
)

// ClusterClient 单个集群的客户端集合
type ClusterClient struct {
	ID            uint
	Name          string
	Config        *rest.Config
	Clientset     *kubernetes.Clientset
	DynamicClient dynamic.Interface
	MetricsClient *metricsv.Clientset
}

// Manager 多集群客户端管理器
type Manager struct {
	mu      sync.RWMutex
	clients map[uint]*ClusterClient
}

// NewManager 创建管理器
func NewManager() *Manager {
	return &Manager{
		clients: make(map[uint]*ClusterClient),
	}
}

// AddCluster 添加集群连接
func (m *Manager) AddCluster(id uint, name, kubeconfig string) error {
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
	if err != nil {
		return fmt.Errorf("解析kubeconfig失败: %w", err)
	}

	// 配置连接参数
	config.QPS = 100
	config.Burst = 200
	config.Timeout = 30 * time.Second

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("创建K8s客户端失败: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("创建动态客户端失败: %w", err)
	}

	metricsClient, err := metricsv.NewForConfig(config)
	if err != nil {
		// metrics可能不可用，不作为致命错误
		metricsClient = nil
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if old, ok := m.clients[id]; ok {
		_ = old // 释放旧引用，便于 GC
	}
	delete(m.clients, id)
	m.clients[id] = &ClusterClient{
		ID:            id,
		Name:          name,
		Config:        config,
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		MetricsClient: metricsClient,
	}

	return nil
}

// AddClusterFromToken 使用Token添加集群
func (m *Manager) AddClusterFromToken(id uint, name, apiServer, token, caCert string) error {
	config := &rest.Config{
		Host:        apiServer,
		BearerToken: token,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: caCert == "",
		},
	}
	if caCert != "" {
		config.TLSClientConfig.CAData = []byte(caCert)
	}
	config.QPS = 100
	config.Burst = 200
	config.Timeout = 30 * time.Second

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("创建K8s客户端失败: %w", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("创建动态客户端失败: %w", err)
	}

	metricsClient, err := metricsv.NewForConfig(config)
	if err != nil {
		metricsClient = nil
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if old, ok := m.clients[id]; ok {
		_ = old
	}
	delete(m.clients, id)
	m.clients[id] = &ClusterClient{
		ID:            id,
		Name:          name,
		Config:        config,
		Clientset:     clientset,
		DynamicClient: dynamicClient,
		MetricsClient: metricsClient,
	}

	return nil
}

// GetClient 获取集群客户端
func (m *Manager) GetClient(clusterID uint) (*ClusterClient, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	client, ok := m.clients[clusterID]
	if !ok {
		return nil, fmt.Errorf("集群 %d 不存在或未连接", clusterID)
	}
	return client, nil
}

// RemoveCluster 移除集群
func (m *Manager) RemoveCluster(clusterID uint) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.clients, clusterID)
}

// ListClusters 列出所有已连接集群
func (m *Manager) ListClusters() []uint {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ids := make([]uint, 0, len(m.clients))
	for id := range m.clients {
		ids = append(ids, id)
	}
	return ids
}
