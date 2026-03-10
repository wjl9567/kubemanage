package resource

import (
	"context"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	storagev1 "k8s.io/api/storage/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
)

// ResourceService K8s资源操作服务
type ResourceService struct {
	clientset *kubernetes.Clientset
}

// NewResourceService 创建资源服务
func NewResourceService(clientset *kubernetes.Clientset) *ResourceService {
	return &ResourceService{clientset: clientset}
}

// ==================== Node 操作 ====================

func (s *ResourceService) ListNodes(ctx context.Context) (*corev1.NodeList, error) {
	return s.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetNode(ctx context.Context, name string) (*corev1.Node, error) {
	return s.clientset.CoreV1().Nodes().Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) UpdateNode(ctx context.Context, node *corev1.Node) (*corev1.Node, error) {
	return s.clientset.CoreV1().Nodes().Update(ctx, node, metav1.UpdateOptions{})
}

// ==================== Namespace 操作 ====================

func (s *ResourceService) ListNamespaces(ctx context.Context) (*corev1.NamespaceList, error) {
	return s.clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetNamespace(ctx context.Context, name string) (*corev1.Namespace, error) {
	return s.clientset.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateNamespace(ctx context.Context, ns *corev1.Namespace) (*corev1.Namespace, error) {
	return s.clientset.CoreV1().Namespaces().Create(ctx, ns, metav1.CreateOptions{})
}

func (s *ResourceService) DeleteNamespace(ctx context.Context, name string) error {
	return s.clientset.CoreV1().Namespaces().Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== Pod 操作 ====================

func (s *ResourceService) ListPods(ctx context.Context, namespace string, opts metav1.ListOptions) (*corev1.PodList, error) {
	if namespace == "" {
		return s.clientset.CoreV1().Pods("").List(ctx, opts)
	}
	return s.clientset.CoreV1().Pods(namespace).List(ctx, opts)
}

func (s *ResourceService) GetPod(ctx context.Context, namespace, name string) (*corev1.Pod, error) {
	return s.clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) DeletePod(ctx context.Context, namespace, name string) error {
	return s.clientset.CoreV1().Pods(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== Deployment 操作 ====================

func (s *ResourceService) ListDeployments(ctx context.Context, namespace string) (*appsv1.DeploymentList, error) {
	if namespace == "" {
		return s.clientset.AppsV1().Deployments("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetDeployment(ctx context.Context, namespace, name string) (*appsv1.Deployment, error) {
	return s.clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) UpdateDeployment(ctx context.Context, namespace string, deploy *appsv1.Deployment) (*appsv1.Deployment, error) {
	return s.clientset.AppsV1().Deployments(namespace).Update(ctx, deploy, metav1.UpdateOptions{})
}

func (s *ResourceService) ScaleDeployment(ctx context.Context, namespace, name string, replicas int32) error {
	scale, err := s.clientset.AppsV1().Deployments(namespace).GetScale(ctx, name, metav1.GetOptions{})
	if err != nil {
		return err
	}
	scale.Spec.Replicas = replicas
	_, err = s.clientset.AppsV1().Deployments(namespace).UpdateScale(ctx, name, scale, metav1.UpdateOptions{})
	return err
}

func (s *ResourceService) RestartDeployment(ctx context.Context, namespace, name string) error {
	deploy, err := s.GetDeployment(ctx, namespace, name)
	if err != nil {
		return err
	}
	if deploy.Spec.Template.Annotations == nil {
		deploy.Spec.Template.Annotations = make(map[string]string)
	}
	deploy.Spec.Template.Annotations["kubectl.kubernetes.io/restartedAt"] = metav1.Now().Format("2006-01-02T15:04:05Z")
	_, err = s.UpdateDeployment(ctx, namespace, deploy)
	return err
}

func (s *ResourceService) DeleteDeployment(ctx context.Context, namespace, name string) error {
	return s.clientset.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== StatefulSet 操作 ====================

func (s *ResourceService) ListStatefulSets(ctx context.Context, namespace string) (*appsv1.StatefulSetList, error) {
	if namespace == "" {
		return s.clientset.AppsV1().StatefulSets("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.AppsV1().StatefulSets(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetStatefulSet(ctx context.Context, namespace, name string) (*appsv1.StatefulSet, error) {
	return s.clientset.AppsV1().StatefulSets(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) DeleteStatefulSet(ctx context.Context, namespace, name string) error {
	return s.clientset.AppsV1().StatefulSets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== DaemonSet 操作 ====================

func (s *ResourceService) ListDaemonSets(ctx context.Context, namespace string) (*appsv1.DaemonSetList, error) {
	if namespace == "" {
		return s.clientset.AppsV1().DaemonSets("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.AppsV1().DaemonSets(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetDaemonSet(ctx context.Context, namespace, name string) (*appsv1.DaemonSet, error) {
	return s.clientset.AppsV1().DaemonSets(namespace).Get(ctx, name, metav1.GetOptions{})
}

// ==================== Service 操作 ====================

func (s *ResourceService) ListServices(ctx context.Context, namespace string) (*corev1.ServiceList, error) {
	if namespace == "" {
		return s.clientset.CoreV1().Services("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetService(ctx context.Context, namespace, name string) (*corev1.Service, error) {
	return s.clientset.CoreV1().Services(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateService(ctx context.Context, namespace string, svc *corev1.Service) (*corev1.Service, error) {
	return s.clientset.CoreV1().Services(namespace).Create(ctx, svc, metav1.CreateOptions{})
}

func (s *ResourceService) UpdateService(ctx context.Context, namespace string, svc *corev1.Service) (*corev1.Service, error) {
	return s.clientset.CoreV1().Services(namespace).Update(ctx, svc, metav1.UpdateOptions{})
}

func (s *ResourceService) DeleteService(ctx context.Context, namespace, name string) error {
	return s.clientset.CoreV1().Services(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== Ingress 操作 ====================

func (s *ResourceService) ListIngresses(ctx context.Context, namespace string) (*networkingv1.IngressList, error) {
	if namespace == "" {
		return s.clientset.NetworkingV1().Ingresses("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.NetworkingV1().Ingresses(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetIngress(ctx context.Context, namespace, name string) (*networkingv1.Ingress, error) {
	return s.clientset.NetworkingV1().Ingresses(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateIngress(ctx context.Context, namespace string, ing *networkingv1.Ingress) (*networkingv1.Ingress, error) {
	return s.clientset.NetworkingV1().Ingresses(namespace).Create(ctx, ing, metav1.CreateOptions{})
}

func (s *ResourceService) UpdateIngress(ctx context.Context, namespace string, ing *networkingv1.Ingress) (*networkingv1.Ingress, error) {
	return s.clientset.NetworkingV1().Ingresses(namespace).Update(ctx, ing, metav1.UpdateOptions{})
}

func (s *ResourceService) DeleteIngress(ctx context.Context, namespace, name string) error {
	return s.clientset.NetworkingV1().Ingresses(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== ConfigMap 操作 ====================

func (s *ResourceService) ListConfigMaps(ctx context.Context, namespace string) (*corev1.ConfigMapList, error) {
	return s.clientset.CoreV1().ConfigMaps(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetConfigMap(ctx context.Context, namespace, name string) (*corev1.ConfigMap, error) {
	return s.clientset.CoreV1().ConfigMaps(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	return s.clientset.CoreV1().ConfigMaps(namespace).Create(ctx, cm, metav1.CreateOptions{})
}

func (s *ResourceService) UpdateConfigMap(ctx context.Context, namespace string, cm *corev1.ConfigMap) (*corev1.ConfigMap, error) {
	return s.clientset.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
}

func (s *ResourceService) DeleteConfigMap(ctx context.Context, namespace, name string) error {
	return s.clientset.CoreV1().ConfigMaps(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== Secret 操作 ====================

func (s *ResourceService) ListSecrets(ctx context.Context, namespace string) (*corev1.SecretList, error) {
	return s.clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetSecret(ctx context.Context, namespace, name string) (*corev1.Secret, error) {
	return s.clientset.CoreV1().Secrets(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateSecret(ctx context.Context, namespace string, secret *corev1.Secret) (*corev1.Secret, error) {
	return s.clientset.CoreV1().Secrets(namespace).Create(ctx, secret, metav1.CreateOptions{})
}

func (s *ResourceService) UpdateSecret(ctx context.Context, namespace string, secret *corev1.Secret) (*corev1.Secret, error) {
	return s.clientset.CoreV1().Secrets(namespace).Update(ctx, secret, metav1.UpdateOptions{})
}

func (s *ResourceService) DeleteSecret(ctx context.Context, namespace, name string) error {
	return s.clientset.CoreV1().Secrets(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== PVC 操作 ====================

func (s *ResourceService) ListPVCs(ctx context.Context, namespace string) (*corev1.PersistentVolumeClaimList, error) {
	return s.clientset.CoreV1().PersistentVolumeClaims(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetPVC(ctx context.Context, namespace, name string) (*corev1.PersistentVolumeClaim, error) {
	return s.clientset.CoreV1().PersistentVolumeClaims(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) DeletePVC(ctx context.Context, namespace, name string) error {
	return s.clientset.CoreV1().PersistentVolumeClaims(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== Job 操作 ====================

func (s *ResourceService) ListJobs(ctx context.Context, namespace string) (*batchv1.JobList, error) {
	if namespace == "" {
		return s.clientset.BatchV1().Jobs("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetJob(ctx context.Context, namespace, name string) (*batchv1.Job, error) {
	return s.clientset.BatchV1().Jobs(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateJob(ctx context.Context, namespace string, job *batchv1.Job) (*batchv1.Job, error) {
	return s.clientset.BatchV1().Jobs(namespace).Create(ctx, job, metav1.CreateOptions{})
}

func (s *ResourceService) DeleteJob(ctx context.Context, namespace, name string) error {
	return s.clientset.BatchV1().Jobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== CronJob 操作 ====================

func (s *ResourceService) ListCronJobs(ctx context.Context, namespace string) (*batchv1.CronJobList, error) {
	if namespace == "" {
		return s.clientset.BatchV1().CronJobs("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.BatchV1().CronJobs(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetCronJob(ctx context.Context, namespace, name string) (*batchv1.CronJob, error) {
	return s.clientset.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateCronJob(ctx context.Context, namespace string, cj *batchv1.CronJob) (*batchv1.CronJob, error) {
	return s.clientset.BatchV1().CronJobs(namespace).Create(ctx, cj, metav1.CreateOptions{})
}

func (s *ResourceService) DeleteCronJob(ctx context.Context, namespace, name string) error {
	return s.clientset.BatchV1().CronJobs(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== HPA 操作 ====================

func (s *ResourceService) ListHPAs(ctx context.Context, namespace string) (*autoscalingv2.HorizontalPodAutoscalerList, error) {
	if namespace == "" {
		return s.clientset.AutoscalingV2().HorizontalPodAutoscalers("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetHPA(ctx context.Context, namespace, name string) (*autoscalingv2.HorizontalPodAutoscaler, error) {
	return s.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) CreateHPA(ctx context.Context, namespace string, hpa *autoscalingv2.HorizontalPodAutoscaler) (*autoscalingv2.HorizontalPodAutoscaler, error) {
	return s.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Create(ctx, hpa, metav1.CreateOptions{})
}

func (s *ResourceService) UpdateHPA(ctx context.Context, namespace string, hpa *autoscalingv2.HorizontalPodAutoscaler) (*autoscalingv2.HorizontalPodAutoscaler, error) {
	return s.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Update(ctx, hpa, metav1.UpdateOptions{})
}

func (s *ResourceService) DeleteHPA(ctx context.Context, namespace, name string) error {
	return s.clientset.AutoscalingV2().HorizontalPodAutoscalers(namespace).Delete(ctx, name, metav1.DeleteOptions{})
}

// ==================== PV 操作 ====================

func (s *ResourceService) ListPVs(ctx context.Context) (*corev1.PersistentVolumeList, error) {
	return s.clientset.CoreV1().PersistentVolumes().List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetPV(ctx context.Context, name string) (*corev1.PersistentVolume, error) {
	return s.clientset.CoreV1().PersistentVolumes().Get(ctx, name, metav1.GetOptions{})
}

// ==================== RBAC 操作 ====================

func (s *ResourceService) ListRoles(ctx context.Context, namespace string) (*rbacv1.RoleList, error) {
	return s.clientset.RbacV1().Roles(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetRole(ctx context.Context, namespace, name string) (*rbacv1.Role, error) {
	return s.clientset.RbacV1().Roles(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) ListClusterRoles(ctx context.Context) (*rbacv1.ClusterRoleList, error) {
	return s.clientset.RbacV1().ClusterRoles().List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetClusterRole(ctx context.Context, name string) (*rbacv1.ClusterRole, error) {
	return s.clientset.RbacV1().ClusterRoles().Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) ListRoleBindings(ctx context.Context, namespace string) (*rbacv1.RoleBindingList, error) {
	return s.clientset.RbacV1().RoleBindings(namespace).List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetRoleBinding(ctx context.Context, namespace, name string) (*rbacv1.RoleBinding, error) {
	return s.clientset.RbacV1().RoleBindings(namespace).Get(ctx, name, metav1.GetOptions{})
}

func (s *ResourceService) ListClusterRoleBindings(ctx context.Context) (*rbacv1.ClusterRoleBindingList, error) {
	return s.clientset.RbacV1().ClusterRoleBindings().List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetClusterRoleBinding(ctx context.Context, name string) (*rbacv1.ClusterRoleBinding, error) {
	return s.clientset.RbacV1().ClusterRoleBindings().Get(ctx, name, metav1.GetOptions{})
}

// ==================== StorageClass 操作 ====================

func (s *ResourceService) ListStorageClasses(ctx context.Context) (*storagev1.StorageClassList, error) {
	return s.clientset.StorageV1().StorageClasses().List(ctx, metav1.ListOptions{})
}

func (s *ResourceService) GetStorageClass(ctx context.Context, name string) (*storagev1.StorageClass, error) {
	return s.clientset.StorageV1().StorageClasses().Get(ctx, name, metav1.GetOptions{})
}

// ==================== Event 操作 ====================

func (s *ResourceService) ListEvents(ctx context.Context, namespace string) (*corev1.EventList, error) {
	if namespace == "" {
		return s.clientset.CoreV1().Events("").List(ctx, metav1.ListOptions{})
	}
	return s.clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{})
}

// ==================== 集群概览统计 ====================

// ClusterOverview 集群概览数据
type ClusterOverview struct {
	NodeCount       int     `json:"node_count"`
	NodeReady       int     `json:"node_ready"`
	PodCount        int     `json:"pod_count"`
	PodRunning      int     `json:"pod_running"`
	PodPending      int     `json:"pod_pending"`
	PodFailed       int     `json:"pod_failed"`
	NamespaceCount  int     `json:"namespace_count"`
	DeploymentCount int     `json:"deployment_count"`
	ServiceCount    int     `json:"service_count"`
	PVCCount        int     `json:"pvc_count"`
	CPUUsage        float64 `json:"cpu_usage"`
	MemoryUsage     float64 `json:"memory_usage"`
	CPUCapacity     float64 `json:"cpu_capacity"`
	MemoryCapacity  float64 `json:"memory_capacity"`
}

// GetClusterOverview 获取集群概览
func (s *ResourceService) GetClusterOverview(ctx context.Context) (*ClusterOverview, error) {
	overview := &ClusterOverview{}

	// 获取节点信息
	nodes, err := s.ListNodes(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取节点列表失败: %w", err)
	}
	overview.NodeCount = len(nodes.Items)
	for _, node := range nodes.Items {
		for _, cond := range node.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				overview.NodeReady++
			}
		}
		// 资源容量
		cpu := node.Status.Capacity.Cpu()
		mem := node.Status.Capacity.Memory()
		if cpu != nil {
			overview.CPUCapacity += float64(cpu.MilliValue()) / 1000
		}
		if mem != nil {
			overview.MemoryCapacity += float64(mem.Value()) / (1024 * 1024 * 1024) // GB
		}
	}

	// 获取Pod信息
	pods, err := s.ListPods(ctx, "", metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("获取Pod列表失败: %w", err)
	}
	overview.PodCount = len(pods.Items)
	for _, pod := range pods.Items {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			overview.PodRunning++
		case corev1.PodPending:
			overview.PodPending++
		case corev1.PodFailed:
			overview.PodFailed++
		}
	}

	// 获取命名空间
	namespaces, err := s.ListNamespaces(ctx)
	if err == nil {
		overview.NamespaceCount = len(namespaces.Items)
	}

	// 获取Deployment数量
	deployments, err := s.ListDeployments(ctx, "")
	if err == nil {
		overview.DeploymentCount = len(deployments.Items)
	}

	// 获取Service数量
	services, err := s.ListServices(ctx, "")
	if err == nil {
		overview.ServiceCount = len(services.Items)
	}

	// 获取PVC数量
	pvcs, _ := s.clientset.CoreV1().PersistentVolumeClaims("").List(ctx, metav1.ListOptions{})
	if pvcs != nil {
		overview.PVCCount = len(pvcs.Items)
	}

	return overview, nil
}
