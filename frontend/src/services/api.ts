import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// 请求拦截器
api.interceptors.request.use((config) => {
  const { token, currentCluster } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (currentCluster) {
    config.headers['X-Cluster-ID'] = String(currentCluster)
  }
  return config
})

// 响应拦截器
api.interceptors.response.use(
  (res) => {
    if (res.data.code !== 0 && res.data.code !== undefined) {
      return Promise.reject(new Error(res.data.message || '请求失败'))
    }
    return res.data
  },
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      const msg = err.response?.data?.message || ''
      if (msg.includes('过期') || msg.includes('invalid') || msg.includes('无效')) {
        sessionStorage.setItem('kubemanage_login_expired', '1')
      }
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ==================== Auth ====================
export const authApi = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  getUserInfo: () => api.get('/auth/userinfo'),
  updatePassword: (data: { old_password: string; new_password: string }) => api.put('/auth/password', data),
  listUserClusters: (userId: number) => api.get(`/users/${userId}/clusters`),
  setUserClusters: (userId: number, clusterIds: number[]) => api.put(`/users/${userId}/clusters`, { cluster_ids: clusterIds }),
  listUserNamespaces: (userId: number, clusterId: number) => api.get(`/users/${userId}/namespaces`, { params: { cluster_id: clusterId } }),
  setUserNamespaces: (userId: number, clusterId: number, namespaces: string[]) =>
    api.put(`/users/${userId}/namespaces`, { cluster_id: clusterId, namespaces }),
  listUsers: () => api.get('/users'),
}

// ==================== Clusters ====================
export const clusterApi = {
  list: (params?: any) => api.get('/clusters', { params }),
  get: (id: number) => api.get(`/clusters/${id}`),
  create: (data: any) => api.post('/clusters', data),
  delete: (id: number) => api.delete(`/clusters/${id}`),
  overview: (id: number) => api.get(`/clusters/${id}/overview`),
  multiOverview: () => api.get('/clusters/overview'),
  toggleStatus: (id: number, status: string) => api.put(`/clusters/${id}/status`, { status }),
}

// ==================== Nodes ====================
export const nodeApi = {
  list: (params?: any) => api.get('/nodes', { params }),
  get: (name: string) => api.get(`/nodes/${name}`),
  update: (name: string, data: { labels?: Record<string, string>; taints?: any[] }) =>
    api.put(`/nodes/${name}`, data),
  pods: (name: string) => api.get(`/nodes/${name}/pods`),
  events: (name: string) => api.get(`/nodes/${name}/events`),
}

// ==================== Apply（通用 YAML 应用与原始资源） ====================
export const applyApi = {
  /** 提交 YAML 或 JSON 进行 Apply（创建或更新） */
  apply: (body: string) => api.post('/apply', body, { headers: { 'Content-Type': 'application/yaml' } }),
  applyJson: (obj: object) => api.post('/apply', obj),
  /** 获取资源原始内容用于编辑（query: kind, apiVersion, namespace, name） */
  getRaw: (params: { kind: string; apiVersion: string; namespace?: string; name: string }) =>
    api.get('/raw', { params }),
}

// ==================== Namespaces ====================
export const namespaceApi = {
  list: (params?: any) => api.get('/namespaces', { params }),
  /** 指定集群拉取命名空间（用于授权等） */
  listByCluster: (clusterId: number) => api.get('/namespaces', { headers: { 'X-Cluster-ID': String(clusterId) } }),
  create: (data: { name: string; labels?: Record<string, string> }) => api.post('/namespaces', data),
  delete: (name: string) => api.delete(`/namespaces/${name}`),
}

// ==================== Workloads ====================
export const workloadApi = {
  listDeployments: (params?: any) => api.get('/deployments', { params }),
  getDeployment: (name: string, ns: string) => api.get(`/deployments/${name}`, { params: { namespace: ns } }),
  scaleDeployment: (name: string, ns: string, replicas: number) =>
    api.put(`/deployments/${name}/scale`, { replicas }, { params: { namespace: ns } }),
  restartDeployment: (name: string, ns: string) =>
    api.put(`/deployments/${name}/restart`, {}, { params: { namespace: ns } }),
  deleteDeployment: (name: string, ns: string) =>
    api.delete(`/deployments/${name}`, { params: { namespace: ns } }),
  listStatefulSets: (params?: any) => api.get('/statefulsets', { params }),
  listDaemonSets: (params?: any) => api.get('/daemonsets', { params }),
  listPods: (params?: any) => api.get('/pods', { params }),
  getPod: (name: string, ns: string) => api.get(`/pods/${name}`, { params: { namespace: ns } }),
  deletePod: (name: string, ns: string) => api.delete(`/pods/${name}`, { params: { namespace: ns } }),
  listJobs: (params?: any) => api.get('/jobs', { params }),
  getJob: (name: string, ns: string) => api.get(`/jobs/${name}`, { params: { namespace: ns } }),
  createJob: (data: any) => api.post('/jobs', data),
  deleteJob: (name: string, ns: string) => api.delete(`/jobs/${name}`, { params: { namespace: ns } }),
  listCronJobs: (params?: any) => api.get('/cronjobs', { params }),
  getCronJob: (name: string, ns: string) => api.get(`/cronjobs/${name}`, { params: { namespace: ns } }),
  createCronJob: (data: any) => api.post('/cronjobs', data),
  deleteCronJob: (name: string, ns: string) => api.delete(`/cronjobs/${name}`, { params: { namespace: ns } }),
}

// ==================== Config ====================
export const configApi = {
  listConfigMaps: (params?: any) => api.get('/configmaps', { params }),
  getConfigMap: (name: string, ns: string) => api.get(`/configmaps/${name}`, { params: { namespace: ns } }),
  createConfigMap: (data: any) => api.post('/configmaps', data),
  updateConfigMap: (name: string, ns: string, data: any) =>
    api.put(`/configmaps/${name}`, data, { params: { namespace: ns } }),
  deleteConfigMap: (name: string, ns: string) =>
    api.delete(`/configmaps/${name}`, { params: { namespace: ns } }),
  listSecrets: (params?: any) => api.get('/secrets', { params }),
  getSecret: (name: string, ns: string) => api.get(`/secrets/${name}`, { params: { namespace: ns } }),
  createSecret: (data: any) => api.post('/secrets', data),
  updateSecret: (name: string, ns: string, data: any) =>
    api.put(`/secrets/${name}`, data, { params: { namespace: ns } }),
  deleteSecret: (name: string, ns: string) => api.delete(`/secrets/${name}`, { params: { namespace: ns } }),
}

// ==================== Storage ====================
export const storageApi = {
  listStorageClasses: () => api.get('/storageclasses'),
  getStorageClass: (name: string) => api.get(`/storageclasses/${name}`),
  listPVs: () => api.get('/pvs'),
  getPV: (name: string) => api.get(`/pvs/${name}`),
  listPVCs: (params?: any) => api.get('/pvcs', { params }),
  getPVC: (name: string, ns: string) => api.get(`/pvcs/${name}`, { params: { namespace: ns } }),
  deletePVC: (name: string, ns: string) => api.delete(`/pvcs/${name}`, { params: { namespace: ns } }),
}

// ==================== Network ====================
export const networkApi = {
  listServices: (params?: any) => api.get('/services', { params }),
  getService: (name: string, ns: string) => api.get(`/services/${name}`, { params: { namespace: ns } }),
  createService: (data: any) => api.post('/services', data),
  updateService: (name: string, ns: string, data: any) =>
    api.put(`/services/${name}`, data, { params: { namespace: ns } }),
  deleteService: (name: string, ns: string) => api.delete(`/services/${name}`, { params: { namespace: ns } }),
  listIngresses: (params?: any) => api.get('/ingresses', { params }),
  getIngress: (name: string, ns: string) => api.get(`/ingresses/${name}`, { params: { namespace: ns } }),
  createIngress: (data: any) => api.post('/ingresses', data),
  updateIngress: (name: string, ns: string, data: any) =>
    api.put(`/ingresses/${name}`, data, { params: { namespace: ns } }),
  deleteIngress: (name: string, ns: string) => api.delete(`/ingresses/${name}`, { params: { namespace: ns } }),
}

// ==================== Audit / System / Alert / Backup / Template ====================
export const auditApi = {
  list: (params?: { page?: number; page_size?: number }) => api.get('/audit/logs', { params }),
}
export const systemApi = {
  get: () => api.get('/system/config'),
  update: (data: Record<string, string>) => api.put('/system/config', data),
}
export const alertChannelApi = {
  list: () => api.get('/alert-channels'),
  create: (data: any) => api.post('/alert-channels', data),
  update: (id: number, data: any) => api.put(`/alert-channels/${id}`, data),
  delete: (id: number) => api.delete(`/alert-channels/${id}`),
}
export const backupApi = {
  list: () => api.get('/backups'),
  create: (params?: { scope?: string }) => api.post('/backups', null, { params }),
  /** 下载备份文件（需在调用处将返回的 blob 转为下载，见 settings 备份 tab） */
  download: (id: number) => api.get(`/backups/${id}/download`, { responseType: 'blob' }),
}
// ==================== Monitor (Prometheus) ====================
export const monitorApi = {
  query: (params: { query: string }) => api.get('/monitor/prometheus/query', { params }),
  queryRange: (params: { query: string; start?: string; end?: string; step?: string }) =>
    api.get('/monitor/prometheus/query_range', { params }),
}

// ==================== CRD ====================
export const crdApi = {
  list: (params?: any) => api.get('/crds', { params }),
  listInstances: (crdName: string, params?: { namespace?: string }) => api.get(`/crds/${crdName}/instances`, { params }),
  getInstance: (crdName: string, instanceName: string, params?: { namespace?: string }) =>
    api.get(`/crds/${crdName}/instances/${instanceName}`, { params }),
  createInstance: (crdName: string, data: any) => api.post(`/crds/${crdName}/instances`, data),
  updateInstance: (crdName: string, instanceName: string, data: any, params?: { namespace?: string }) =>
    api.put(`/crds/${crdName}/instances/${instanceName}`, data, { params }),
  deleteInstance: (crdName: string, instanceName: string, params?: { namespace?: string }) =>
    api.delete(`/crds/${crdName}/instances/${instanceName}`, { params }),
}

// ==================== HPA ====================
export const hpaApi = {
  list: (params?: { namespace?: string }) => api.get('/hpas', { params }),
  get: (name: string, ns: string) => api.get(`/hpas/${name}`, { params: { namespace: ns } }),
  create: (data: any) => api.post('/hpas', data),
  update: (name: string, ns: string, data: any) => api.put(`/hpas/${name}`, data, { params: { namespace: ns } }),
  delete: (name: string, ns: string) => api.delete(`/hpas/${name}`, { params: { namespace: ns } }),
}

// ==================== RBAC ====================
export const rbacApi = {
  listRoles: (params?: { namespace?: string }) => api.get('/rbac/roles', { params }),
  getRole: (name: string, ns: string) => api.get(`/rbac/roles/${name}`, { params: { namespace: ns } }),
  listClusterRoles: () => api.get('/rbac/clusterroles'),
  getClusterRole: (name: string) => api.get(`/rbac/clusterroles/${name}`),
  listRoleBindings: (params?: { namespace?: string }) => api.get('/rbac/rolebindings', { params }),
  getRoleBinding: (name: string, ns: string) => api.get(`/rbac/rolebindings/${name}`, { params: { namespace: ns } }),
  listClusterRoleBindings: () => api.get('/rbac/clusterrolebindings'),
  getClusterRoleBinding: (name: string) => api.get(`/rbac/clusterrolebindings/${name}`),
}

export const templateApi = {
  list: () => api.get('/templates'),
  get: (id: number) => api.get(`/templates/${id}`),
  create: (data: any) => api.post('/templates', data),
  update: (id: number, data: any) => api.put(`/templates/${id}`, data),
  delete: (id: number) => api.delete(`/templates/${id}`),
}

export default api
