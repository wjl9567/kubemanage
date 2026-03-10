import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import MainLayout from '../layouts/MainLayout'
import { useAuthStore } from '@/stores/auth'

// 懒加载页面
const Login = lazy(() => import('@/modules/settings/Login'))
const Overview = lazy(() => import('@/modules/overview'))
const ClusterList = lazy(() => import('@/modules/cluster'))
const NodeList = lazy(() => import('@/modules/node'))
const Namespaces = lazy(() => import('@/modules/workload/Namespaces'))
const Deployments = lazy(() => import('@/modules/workload/Deployments'))
const StatefulSets = lazy(() => import('@/modules/workload/StatefulSets'))
const DaemonSets = lazy(() => import('@/modules/workload/DaemonSets'))
const Pods = lazy(() => import('@/modules/workload/Pods'))
const Jobs = lazy(() => import('@/modules/workload/Jobs'))
const CronJobs = lazy(() => import('@/modules/workload/CronJobs'))
const HPAs = lazy(() => import('@/modules/workload/HPAs'))
const ConfigMaps = lazy(() => import('@/modules/config/ConfigMaps'))
const Secrets = lazy(() => import('@/modules/config/Secrets'))
const StorageClasses = lazy(() => import('@/modules/storage/StorageClasses'))
const PVCs = lazy(() => import('@/modules/storage/PVCs'))
const PVs = lazy(() => import('@/modules/storage/PVs'))
const RBACPage = lazy(() => import('@/modules/rbac'))
const Services = lazy(() => import('@/modules/workload/Services'))
const Ingresses = lazy(() => import('@/modules/workload/Ingresses'))
const Monitoring = lazy(() => import('@/modules/monitor'))
const Logging = lazy(() => import('@/modules/logging'))
const CRDManagement = lazy(() => import('@/modules/crd'))
const TemplateManagement = lazy(() => import('@/modules/template'))
const Settings = lazy(() => import('@/modules/settings'))

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Spin size="large" tip="加载中..." />
  </div>
)

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <MainLayout>
                <Suspense fallback={<Loading />}>
                  <Routes>
                    <Route path="/" element={<Navigate to="/overview" replace />} />
                    <Route path="/overview" element={<Overview />} />
                    <Route path="/clusters" element={<ClusterList />} />
                    <Route path="/nodes" element={<NodeList />} />
                    <Route path="/workloads/namespaces" element={<Namespaces />} />
                    <Route path="/workloads/deployments" element={<Deployments />} />
                    <Route path="/workloads/statefulsets" element={<StatefulSets />} />
                    <Route path="/workloads/daemonsets" element={<DaemonSets />} />
                    <Route path="/workloads/pods" element={<Pods />} />
                    <Route path="/workloads/jobs" element={<Jobs />} />
                    <Route path="/workloads/cronjobs" element={<CronJobs />} />
                    <Route path="/workloads/hpas" element={<HPAs />} />
                    <Route path="/config/configmaps" element={<ConfigMaps />} />
                    <Route path="/config/secrets" element={<Secrets />} />
                    <Route path="/storage/classes" element={<StorageClasses />} />
                    <Route path="/storage/pvcs" element={<PVCs />} />
                    <Route path="/storage/pvs" element={<PVs />} />
                    <Route path="/rbac" element={<RBACPage />} />
                    <Route path="/network/services" element={<Services />} />
                    <Route path="/network/ingresses" element={<Ingresses />} />
                    <Route path="/monitor" element={<Monitoring />} />
                    <Route path="/logging" element={<Logging />} />
                    <Route path="/crd" element={<CRDManagement />} />
                    <Route path="/templates" element={<TemplateManagement />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Suspense>
              </MainLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}
