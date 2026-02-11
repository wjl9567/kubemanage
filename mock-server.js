/**
 * KubeManage Mock API Server
 * 在没有 Go 后端的情况下，为前端提供模拟数据
 * 启动方式: node mock-server.js
 */
const http = require('http')
const url = require('url')

const PORT = 8080

// 模拟数据
const mockData = {
  // 用户
  users: [
    { id: 1, username: 'admin', nickname: '系统管理员', role: 'admin', email: 'admin@kubemanage.io', status: 1, avatar: '' },
  ],

  // 集群
  clusters: [
    { id: 1, name: 'prod-cluster', display_name: '生产集群', type: 'self-hosted', provider: 'custom', region: '华东-上海', version: 'v1.28.3', status: 'active', node_count: 8, pod_count: 124 },
    { id: 2, name: 'staging-cluster', display_name: '测试集群', type: 'ack', provider: 'aliyun', region: '华东-杭州', version: 'v1.27.6', status: 'active', node_count: 3, pod_count: 45 },
  ],

  // 集群概览
  overview: {
    node_count: 8, node_ready: 8, pod_count: 124, pod_running: 118, pod_pending: 4, pod_failed: 2,
    namespace_count: 16, deployment_count: 32, service_count: 47, pvc_count: 36,
    cpu_usage: 12.5, cpu_capacity: 32, memory_usage: 48.2, memory_capacity: 64,
  },

  // 节点
  nodes: [
    { name: 'master-01', status: 'Ready', roles: 'master', ip: [{ type: 'InternalIP', address: '10.0.1.10' }], os: 'Ubuntu 22.04.3 LTS', kernel: '5.15.0-89-generic', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '8', memory_capacity: '16Gi', labels: {}, taints: [], created_at: '2024-01-15T08:00:00Z', conditions: [] },
    { name: 'master-02', status: 'Ready', roles: 'master', ip: [{ type: 'InternalIP', address: '10.0.1.11' }], os: 'Ubuntu 22.04.3 LTS', kernel: '5.15.0-89-generic', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '8', memory_capacity: '16Gi', labels: {}, taints: [], created_at: '2024-01-15T08:00:00Z', conditions: [] },
    { name: 'master-03', status: 'Ready', roles: 'master', ip: [{ type: 'InternalIP', address: '10.0.1.12' }], os: 'Ubuntu 22.04.3 LTS', kernel: '5.15.0-89-generic', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '8', memory_capacity: '16Gi', labels: {}, taints: [], created_at: '2024-01-15T08:00:00Z', conditions: [] },
    { name: 'worker-01', status: 'Ready', roles: 'worker', ip: [{ type: 'InternalIP', address: '10.0.2.10' }], os: 'Ubuntu 22.04.3 LTS', kernel: '5.15.0-89-generic', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '16', memory_capacity: '32Gi', labels: {}, taints: [], created_at: '2024-02-01T10:00:00Z', conditions: [] },
    { name: 'worker-02', status: 'Ready', roles: 'worker', ip: [{ type: 'InternalIP', address: '10.0.2.11' }], os: 'Ubuntu 22.04.3 LTS', kernel: '5.15.0-89-generic', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '16', memory_capacity: '32Gi', labels: {}, taints: [], created_at: '2024-02-01T10:00:00Z', conditions: [] },
    { name: 'worker-03', status: 'Ready', roles: 'worker', ip: [{ type: 'InternalIP', address: '10.0.2.12' }], os: 'Rocky Linux 8.9', kernel: '4.18.0-513.el8.x86_64', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '16', memory_capacity: '32Gi', labels: {}, taints: [], created_at: '2024-03-10T14:00:00Z', conditions: [] },
    { name: 'worker-04', status: 'Ready', roles: 'worker', ip: [{ type: 'InternalIP', address: '10.0.2.13' }], os: 'Rocky Linux 8.9', kernel: '4.18.0-513.el8.x86_64', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '16', memory_capacity: '64Gi', labels: {}, taints: [], created_at: '2024-03-10T14:00:00Z', conditions: [] },
    { name: 'worker-05', status: 'NotReady', roles: 'worker', ip: [{ type: 'InternalIP', address: '10.0.2.14' }], os: 'Rocky Linux 8.9', kernel: '4.18.0-513.el8.x86_64', container_runtime: 'containerd://1.7.2', k8s_version: 'v1.28.3', cpu_capacity: '16', memory_capacity: '64Gi', labels: {}, taints: [], created_at: '2024-05-20T09:00:00Z', conditions: [] },
  ],

  // Deployments
  deployments: [
    { name: 'web-frontend', namespace: 'default', replicas: 3, ready: 3, available: 3, updated: 3, strategy: 'RollingUpdate', images: ['nginx:1.25-alpine'], labels: { app: 'web-frontend' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'api-gateway', namespace: 'default', replicas: 2, ready: 2, available: 2, updated: 2, strategy: 'RollingUpdate', images: ['kubemanage/api-gateway:v2.1.0'], labels: { app: 'api-gateway' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'user-service', namespace: 'default', replicas: 3, ready: 3, available: 3, updated: 3, strategy: 'RollingUpdate', images: ['kubemanage/user-svc:v1.5.2'], labels: { app: 'user-service' }, created_at: '2024-06-15T08:00:00Z' },
    { name: 'order-service', namespace: 'default', replicas: 2, ready: 1, available: 1, updated: 2, strategy: 'RollingUpdate', images: ['kubemanage/order-svc:v3.0.1'], labels: { app: 'order-service' }, created_at: '2024-07-01T12:00:00Z' },
    { name: 'payment-service', namespace: 'default', replicas: 2, ready: 2, available: 2, updated: 2, strategy: 'RollingUpdate', images: ['kubemanage/payment-svc:v2.3.0'], labels: { app: 'payment-service' }, created_at: '2024-07-15T14:00:00Z' },
    { name: 'notification-service', namespace: 'default', replicas: 1, ready: 1, available: 1, updated: 1, strategy: 'Recreate', images: ['kubemanage/notify-svc:v1.2.0'], labels: { app: 'notification' }, created_at: '2024-08-01T09:00:00Z' },
    { name: 'coredns', namespace: 'kube-system', replicas: 2, ready: 2, available: 2, updated: 2, strategy: 'RollingUpdate', images: ['registry.k8s.io/coredns/coredns:v1.11.1'], labels: { 'k8s-app': 'kube-dns' }, created_at: '2024-01-15T08:00:00Z' },
    { name: 'metrics-server', namespace: 'kube-system', replicas: 1, ready: 1, available: 1, updated: 1, strategy: 'RollingUpdate', images: ['registry.k8s.io/metrics-server/metrics-server:v0.7.0'], labels: { 'k8s-app': 'metrics-server' }, created_at: '2024-01-15T08:00:00Z' },
  ],

  // Pods
  pods: (() => {
    const pods = []
    const apps = [
      { name: 'web-frontend', ns: 'default', status: 'Running', node: 'worker-01', img: 'nginx:1.25-alpine' },
      { name: 'web-frontend', ns: 'default', status: 'Running', node: 'worker-02', img: 'nginx:1.25-alpine' },
      { name: 'web-frontend', ns: 'default', status: 'Running', node: 'worker-03', img: 'nginx:1.25-alpine' },
      { name: 'api-gateway', ns: 'default', status: 'Running', node: 'worker-01', img: 'kubemanage/api-gateway:v2.1.0' },
      { name: 'api-gateway', ns: 'default', status: 'Running', node: 'worker-02', img: 'kubemanage/api-gateway:v2.1.0' },
      { name: 'user-service', ns: 'default', status: 'Running', node: 'worker-03', img: 'kubemanage/user-svc:v1.5.2' },
      { name: 'user-service', ns: 'default', status: 'Running', node: 'worker-04', img: 'kubemanage/user-svc:v1.5.2' },
      { name: 'user-service', ns: 'default', status: 'Running', node: 'worker-01', img: 'kubemanage/user-svc:v1.5.2' },
      { name: 'order-service', ns: 'default', status: 'Running', node: 'worker-02', img: 'kubemanage/order-svc:v3.0.1' },
      { name: 'order-service', ns: 'default', status: 'CrashLoopBackOff', node: 'worker-03', img: 'kubemanage/order-svc:v3.0.1' },
      { name: 'payment-service', ns: 'default', status: 'Running', node: 'worker-04', img: 'kubemanage/payment-svc:v2.3.0' },
      { name: 'payment-service', ns: 'default', status: 'Running', node: 'worker-01', img: 'kubemanage/payment-svc:v2.3.0' },
      { name: 'notification-svc', ns: 'default', status: 'Running', node: 'worker-02', img: 'kubemanage/notify-svc:v1.2.0' },
      { name: 'redis-master', ns: 'default', status: 'Running', node: 'worker-03', img: 'redis:7-alpine' },
      { name: 'postgres-primary', ns: 'default', status: 'Running', node: 'worker-04', img: 'postgres:15-alpine' },
      { name: 'coredns', ns: 'kube-system', status: 'Running', node: 'master-01', img: 'registry.k8s.io/coredns/coredns:v1.11.1' },
      { name: 'coredns', ns: 'kube-system', status: 'Running', node: 'master-02', img: 'registry.k8s.io/coredns/coredns:v1.11.1' },
      { name: 'etcd-master-01', ns: 'kube-system', status: 'Running', node: 'master-01', img: 'registry.k8s.io/etcd:3.5.10-0' },
      { name: 'etcd-master-02', ns: 'kube-system', status: 'Running', node: 'master-02', img: 'registry.k8s.io/etcd:3.5.10-0' },
      { name: 'etcd-master-03', ns: 'kube-system', status: 'Running', node: 'master-03', img: 'registry.k8s.io/etcd:3.5.10-0' },
      { name: 'kube-apiserver', ns: 'kube-system', status: 'Running', node: 'master-01', img: 'registry.k8s.io/kube-apiserver:v1.28.3' },
      { name: 'metrics-server', ns: 'kube-system', status: 'Running', node: 'worker-01', img: 'registry.k8s.io/metrics-server/metrics-server:v0.7.0' },
      { name: 'pending-job', ns: 'default', status: 'Pending', node: '', img: 'busybox:latest' },
      { name: 'failed-migration', ns: 'default', status: 'Failed', node: 'worker-05', img: 'kubemanage/migration:v1.0' },
    ]
    const hash = () => Math.random().toString(36).substring(2, 7)
    apps.forEach((a, i) => {
      pods.push({
        name: `${a.name}-${hash()}-${hash()}`, namespace: a.ns, status: a.status,
        ip: a.status === 'Pending' ? '' : `10.244.${Math.floor(i/3)}.${10+i}`,
        node: a.node, containers: [{ name: a.name.split('-')[0], image: a.img }],
        restarts: a.status === 'CrashLoopBackOff' ? 15 : Math.floor(Math.random()*3),
        labels: { app: a.name }, created_at: '2024-08-01T10:00:00Z',
      })
    })
    return pods
  })(),

  // StatefulSets
  statefulsets: [
    { name: 'redis-cluster', namespace: 'default', replicas: 3, ready: 3, images: ['redis:7-alpine'], labels: { app: 'redis' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'postgres-ha', namespace: 'default', replicas: 2, ready: 2, images: ['postgres:15-alpine'], labels: { app: 'postgres' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'kafka', namespace: 'middleware', replicas: 3, ready: 3, images: ['bitnami/kafka:3.6'], labels: { app: 'kafka' }, created_at: '2024-07-01T10:00:00Z' },
  ],

  // DaemonSets
  daemonsets: [
    { name: 'node-exporter', namespace: 'monitoring', desired: 8, current: 8, ready: 8, images: ['prom/node-exporter:v1.7.0'], labels: { app: 'node-exporter' }, created_at: '2024-01-15T08:00:00Z' },
    { name: 'fluentd', namespace: 'logging', desired: 8, current: 8, ready: 7, images: ['fluent/fluentd:v1.16'], labels: { app: 'fluentd' }, created_at: '2024-02-01T10:00:00Z' },
    { name: 'kube-proxy', namespace: 'kube-system', desired: 8, current: 8, ready: 8, images: ['registry.k8s.io/kube-proxy:v1.28.3'], labels: { 'k8s-app': 'kube-proxy' }, created_at: '2024-01-15T08:00:00Z' },
  ],

  // Services
  services: [
    { name: 'web-frontend', namespace: 'default', type: 'LoadBalancer', cluster_ip: '10.96.10.1', external_ips: ['203.0.113.10'], ports: [{ name: 'http', port: 80, target_port: '8080', protocol: 'TCP', node_port: 30080 }], selector: { app: 'web-frontend' }, labels: {}, created_at: '2024-06-01T10:00:00Z' },
    { name: 'api-gateway', namespace: 'default', type: 'ClusterIP', cluster_ip: '10.96.10.2', external_ips: [], ports: [{ name: 'http', port: 8080, target_port: '8080', protocol: 'TCP', node_port: 0 }], selector: { app: 'api-gateway' }, labels: {}, created_at: '2024-06-01T10:00:00Z' },
    { name: 'user-service', namespace: 'default', type: 'ClusterIP', cluster_ip: '10.96.10.3', external_ips: [], ports: [{ name: 'grpc', port: 50051, target_port: '50051', protocol: 'TCP', node_port: 0 }], selector: { app: 'user-service' }, labels: {}, created_at: '2024-06-15T08:00:00Z' },
    { name: 'redis-master', namespace: 'default', type: 'ClusterIP', cluster_ip: '10.96.20.1', external_ips: [], ports: [{ name: 'redis', port: 6379, target_port: '6379', protocol: 'TCP', node_port: 0 }], selector: { app: 'redis' }, labels: {}, created_at: '2024-06-01T10:00:00Z' },
    { name: 'postgres', namespace: 'default', type: 'ClusterIP', cluster_ip: '10.96.20.2', external_ips: [], ports: [{ name: 'pg', port: 5432, target_port: '5432', protocol: 'TCP', node_port: 0 }], selector: { app: 'postgres' }, labels: {}, created_at: '2024-06-01T10:00:00Z' },
    { name: 'kubernetes', namespace: 'default', type: 'ClusterIP', cluster_ip: '10.96.0.1', external_ips: [], ports: [{ name: 'https', port: 443, target_port: '6443', protocol: 'TCP', node_port: 0 }], selector: {}, labels: {}, created_at: '2024-01-15T08:00:00Z' },
  ],

  // Ingresses
  ingresses: [
    { name: 'web-ingress', namespace: 'default', ingress_class: 'nginx', rules: [{ host: 'app.example.com', paths: [{ path: '/', path_type: 'Prefix', backend_service: 'web-frontend', backend_port: 80 }] }], tls: [{ hosts: ['app.example.com'], secretName: 'tls-cert' }], labels: {}, created_at: '2024-06-01T10:00:00Z' },
    { name: 'api-ingress', namespace: 'default', ingress_class: 'nginx', rules: [{ host: 'api.example.com', paths: [{ path: '/api', path_type: 'Prefix', backend_service: 'api-gateway', backend_port: 8080 }] }], tls: [], labels: {}, created_at: '2024-06-01T10:00:00Z' },
  ],

  // ConfigMaps
  configmaps: [
    { name: 'app-config', namespace: 'default', data_count: 5, labels: { app: 'config' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'nginx-config', namespace: 'default', data_count: 2, labels: { app: 'nginx' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'redis-config', namespace: 'default', data_count: 1, labels: { app: 'redis' }, created_at: '2024-07-01T10:00:00Z' },
    { name: 'coredns', namespace: 'kube-system', data_count: 1, labels: { 'k8s-app': 'kube-dns' }, created_at: '2024-01-15T08:00:00Z' },
  ],

  // Secrets
  secrets: [
    { name: 'tls-cert', namespace: 'default', type: 'kubernetes.io/tls', data_count: 2, labels: {}, created_at: '2024-06-01T10:00:00Z' },
    { name: 'db-credentials', namespace: 'default', type: 'Opaque', data_count: 3, labels: { app: 'postgres' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'redis-password', namespace: 'default', type: 'Opaque', data_count: 1, labels: { app: 'redis' }, created_at: '2024-07-01T10:00:00Z' },
    { name: 'registry-credentials', namespace: 'default', type: 'kubernetes.io/dockerconfigjson', data_count: 1, labels: {}, created_at: '2024-01-15T08:00:00Z' },
  ],

  // StorageClasses
  storageclasses: [
    { name: 'standard', provisioner: 'kubernetes.io/aws-ebs', reclaim_policy: 'Delete', volume_binding_mode: 'WaitForFirstConsumer', allow_expansion: true, labels: {}, created_at: '2024-01-15T08:00:00Z' },
    { name: 'fast-ssd', provisioner: 'kubernetes.io/aws-ebs', reclaim_policy: 'Retain', volume_binding_mode: 'Immediate', allow_expansion: true, labels: {}, created_at: '2024-01-15T08:00:00Z' },
    { name: 'nfs-storage', provisioner: 'nfs.csi.k8s.io', reclaim_policy: 'Delete', volume_binding_mode: 'Immediate', allow_expansion: false, labels: {}, created_at: '2024-03-01T10:00:00Z' },
  ],

  // PVCs
  pvcs: [
    { name: 'postgres-data', namespace: 'default', status: 'Bound', capacity: '50Gi', access_modes: ['ReadWriteOnce'], storage_class: 'fast-ssd', volume_name: 'pv-0001', labels: { app: 'postgres' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'redis-data', namespace: 'default', status: 'Bound', capacity: '20Gi', access_modes: ['ReadWriteOnce'], storage_class: 'standard', volume_name: 'pv-0002', labels: { app: 'redis' }, created_at: '2024-06-01T10:00:00Z' },
    { name: 'kafka-data-0', namespace: 'middleware', status: 'Bound', capacity: '100Gi', access_modes: ['ReadWriteOnce'], storage_class: 'fast-ssd', volume_name: 'pv-0003', labels: { app: 'kafka' }, created_at: '2024-07-01T10:00:00Z' },
    { name: 'logs-archive', namespace: 'logging', status: 'Bound', capacity: '200Gi', access_modes: ['ReadWriteMany'], storage_class: 'nfs-storage', volume_name: 'pv-0004', labels: {}, created_at: '2024-08-01T10:00:00Z' },
    { name: 'pending-claim', namespace: 'default', status: 'Pending', capacity: '', access_modes: ['ReadWriteOnce'], storage_class: 'fast-ssd', volume_name: '', labels: {}, created_at: '2024-09-01T10:00:00Z' },
  ],
}

// 路由匹配
function handleRequest(method, pathname, body) {
  const r = (data) => ({ code: 0, message: 'success', data })

  // 登录
  if (method === 'POST' && pathname === '/api/v1/auth/login') {
    const { username, password } = body || {}
    if (username === 'admin' && password === 'admin123') {
      return r({ token: 'mock-jwt-token-kubemanage-2026', user_info: mockData.users[0] })
    }
    return { code: 10003, message: '用户名或密码错误' }
  }

  // 用户信息
  if (pathname === '/api/v1/auth/userinfo') return r(mockData.users[0])
  if (pathname === '/api/v1/users') return r({ list: mockData.users, total: 1 })

  // 集群
  if (pathname === '/api/v1/clusters' && method === 'GET') return r({ list: mockData.clusters, total: 2 })
  if (pathname === '/api/v1/clusters/overview') return r(mockData.clusters.map(c => ({ ...c, overview: mockData.overview })))
  if (pathname.match(/\/api\/v1\/clusters\/\d+\/overview/)) return r(mockData.overview)
  if (pathname.match(/\/api\/v1\/clusters\/\d+$/) && method === 'GET') return r(mockData.clusters[0])

  // 节点
  if (pathname === '/api/v1/nodes') return r({ list: mockData.nodes, total: mockData.nodes.length })
  if (pathname.match(/\/api\/v1\/nodes\/[\w-]+\/pods/)) {
    const nodeName = pathname.split('/')[4]
    const nodePods = mockData.pods.filter(p => p.node === nodeName)
    return r({ list: nodePods, total: nodePods.length })
  }
  if (pathname.match(/\/api\/v1\/nodes\/[\w-]+\/events/)) {
    return r({ list: [
      { type: 'Normal', reason: 'NodeReady', message: 'Node status is now: NodeReady', count: 1, first_time: '2024-08-01T10:00:00Z', last_time: '2024-08-01T10:00:00Z', source: 'kubelet' },
    ], total: 1 })
  }
  if (pathname.match(/\/api\/v1\/nodes\/[\w-]+$/)) {
    const nodeName = pathname.split('/')[4]
    return r(mockData.nodes.find(n => n.name === nodeName) || {})
  }

  // Deployments
  if (pathname === '/api/v1/deployments' && method === 'GET') {
    const u = new URL('http://x' + pathname)
    return r({ list: mockData.deployments, total: mockData.deployments.length })
  }
  if (pathname.match(/\/api\/v1\/deployments\/[\w-]+\/scale/) && method === 'PUT') return r(null)
  if (pathname.match(/\/api\/v1\/deployments\/[\w-]+\/restart/) && method === 'PUT') return r(null)

  // StatefulSets
  if (pathname === '/api/v1/statefulsets') return r({ list: mockData.statefulsets, total: mockData.statefulsets.length })
  // DaemonSets
  if (pathname === '/api/v1/daemonsets') return r({ list: mockData.daemonsets, total: mockData.daemonsets.length })

  // Pods
  if (pathname === '/api/v1/pods' && method === 'GET') return r({ list: mockData.pods, total: mockData.pods.length })

  // Services
  if (pathname === '/api/v1/services') return r({ list: mockData.services, total: mockData.services.length })
  // Ingresses
  if (pathname === '/api/v1/ingresses') return r({ list: mockData.ingresses, total: mockData.ingresses.length })

  // ConfigMaps
  if (pathname === '/api/v1/configmaps' && method === 'GET') return r({ list: mockData.configmaps, total: mockData.configmaps.length })
  if (pathname.match(/\/api\/v1\/configmaps\/[\w-]+/) && method === 'GET') {
    const name = pathname.split('/').pop()
    return r({ metadata: { name, namespace: 'default' }, data: { 'app.yaml': 'server:\n  port: 8080\n  host: 0.0.0.0\n\ndatabase:\n  host: postgres\n  port: 5432', 'redis.conf': 'bind 0.0.0.0\nport 6379\nmaxmemory 256mb' } })
  }

  // Secrets
  if (pathname === '/api/v1/secrets' && method === 'GET') return r({ list: mockData.secrets, total: mockData.secrets.length })
  if (pathname.match(/\/api\/v1\/secrets\/[\w-]+/) && method === 'GET') {
    const name = pathname.split('/').pop()
    return r({ name, namespace: 'default', type: 'Opaque', data: { username: '***', password: '***', host: '***' }, labels: {}, created_at: '2024-06-01T10:00:00Z' })
  }

  // StorageClasses
  if (pathname === '/api/v1/storageclasses') return r({ list: mockData.storageclasses, total: mockData.storageclasses.length })
  // PVCs
  if (pathname === '/api/v1/pvcs') return r({ list: mockData.pvcs, total: mockData.pvcs.length })

  // DELETE 操作统一返回成功
  if (method === 'DELETE') return { code: 0, message: '删除成功' }
  // PUT 操作统一返回成功
  if (method === 'PUT') return { code: 0, message: '操作成功' }
  // POST 操作统一返回成功
  if (method === 'POST') return { code: 0, message: '创建成功' }

  return { code: 404, message: 'Not Found: ' + pathname }
}

// HTTP 服务器
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cluster-ID')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const parsedUrl = url.parse(req.url, true)
  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    let parsedBody = null
    try { parsedBody = body ? JSON.parse(body) : null } catch (e) {}

    const result = handleRequest(req.method, parsedUrl.pathname, parsedBody)
    res.setHeader('Content-Type', 'application/json')
    res.writeHead(200)
    res.end(JSON.stringify(result))
    console.log(`${new Date().toLocaleTimeString()} ${req.method} ${parsedUrl.pathname} -> ${result.code === 0 ? '✓' : '✗'} ${result.message}`)
  })
})

server.listen(PORT, () => {
  console.log(`\n🚀 KubeManage Mock API Server 运行中`)
  console.log(`   地址: http://localhost:${PORT}`)
  console.log(`   账号: admin / admin123\n`)
})
