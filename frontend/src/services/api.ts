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
  pods: (name: string) => api.get(`/nodes/${name}/pods`),
  events: (name: string) => api.get(`/nodes/${name}/events`),
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
  deleteSecret: (name: string, ns: string) => api.delete(`/secrets/${name}`, { params: { namespace: ns } }),
}

// ==================== Storage ====================
export const storageApi = {
  listStorageClasses: () => api.get('/storageclasses'),
  getStorageClass: (name: string) => api.get(`/storageclasses/${name}`),
  listPVCs: (params?: any) => api.get('/pvcs', { params }),
  getPVC: (name: string, ns: string) => api.get(`/pvcs/${name}`, { params: { namespace: ns } }),
  deletePVC: (name: string, ns: string) => api.delete(`/pvcs/${name}`, { params: { namespace: ns } }),
}

// ==================== Network ====================
export const networkApi = {
  listServices: (params?: any) => api.get('/services', { params }),
  getService: (name: string, ns: string) => api.get(`/services/${name}`, { params: { namespace: ns } }),
  deleteService: (name: string, ns: string) => api.delete(`/services/${name}`, { params: { namespace: ns } }),
  listIngresses: (params?: any) => api.get('/ingresses', { params }),
  getIngress: (name: string, ns: string) => api.get(`/ingresses/${name}`, { params: { namespace: ns } }),
  deleteIngress: (name: string, ns: string) => api.delete(`/ingresses/${name}`, { params: { namespace: ns } }),
}

export default api
