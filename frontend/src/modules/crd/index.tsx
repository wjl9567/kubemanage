import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Drawer, Descriptions, Tabs } from 'antd'
import { CodeOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import YamlEditor from '@/components/YamlEditor'

const { Title, Text } = Typography

// 模拟 CRD 数据（对接真实集群后替换为 API 调用）
const mockCRDs = [
  { name: 'certificates.cert-manager.io', group: 'cert-manager.io', version: 'v1', scope: 'Namespaced', kind: 'Certificate', instances: 5, created_at: '2024-06-01T10:00:00Z' },
  { name: 'issuers.cert-manager.io', group: 'cert-manager.io', version: 'v1', scope: 'Namespaced', kind: 'Issuer', instances: 2, created_at: '2024-06-01T10:00:00Z' },
  { name: 'ingressroutes.traefik.io', group: 'traefik.io', version: 'v1alpha1', scope: 'Namespaced', kind: 'IngressRoute', instances: 8, created_at: '2024-07-15T08:00:00Z' },
  { name: 'middlewares.traefik.io', group: 'traefik.io', version: 'v1alpha1', scope: 'Namespaced', kind: 'Middleware', instances: 3, created_at: '2024-07-15T08:00:00Z' },
  { name: 'prometheusrules.monitoring.coreos.com', group: 'monitoring.coreos.com', version: 'v1', scope: 'Namespaced', kind: 'PrometheusRule', instances: 12, created_at: '2024-03-01T10:00:00Z' },
  { name: 'servicemonitors.monitoring.coreos.com', group: 'monitoring.coreos.com', version: 'v1', scope: 'Namespaced', kind: 'ServiceMonitor', instances: 15, created_at: '2024-03-01T10:00:00Z' },
  { name: 'virtualservices.networking.istio.io', group: 'networking.istio.io', version: 'v1beta1', scope: 'Namespaced', kind: 'VirtualService', instances: 6, created_at: '2024-08-01T10:00:00Z' },
  { name: 'destinationrules.networking.istio.io', group: 'networking.istio.io', version: 'v1beta1', scope: 'Namespaced', kind: 'DestinationRule', instances: 4, created_at: '2024-08-01T10:00:00Z' },
]

const mockInstances = [
  { name: 'web-tls-cert', namespace: 'default', kind: 'Certificate', status: 'Ready', age: '30d' },
  { name: 'api-tls-cert', namespace: 'default', kind: 'Certificate', status: 'Ready', age: '30d' },
  { name: 'letsencrypt-prod', namespace: 'cert-manager', kind: 'Issuer', status: 'Ready', age: '60d' },
  { name: 'web-route', namespace: 'default', kind: 'IngressRoute', status: 'Active', age: '15d' },
  { name: 'api-route', namespace: 'default', kind: 'IngressRoute', status: 'Active', age: '15d' },
]

export default function CRDManagement() {
  const [selected, setSelected] = useState<any>(null)

  const columns = [
    { title: 'CRD名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><CodeOutlined style={{ color: '#722ed1' }} /><strong style={{ fontSize: 12 }}>{v}</strong></Space>, ellipsis: true },
    { title: 'Group', dataIndex: 'group', key: 'group', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Kind', dataIndex: 'kind', key: 'kind', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '作用域', dataIndex: 'scope', key: 'scope' },
    { title: '实例数', dataIndex: 'instances', key: 'instances', render: (v: number) => <Tag color={v > 0 ? 'green' : 'default'}>{v}</Tag> },
    { title: '操作', key: 'action', render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>详情</Button> },
  ]

  const instanceColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '类型', dataIndex: 'kind', key: 'kind', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'Ready' || v === 'Active' ? 'success' : 'warning'}>{v}</Tag> },
    { title: '存活时间', dataIndex: 'age', key: 'age' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><CodeOutlined /> 自定义资源定义 (CRD)</Title>
        <Button icon={<ReloadOutlined />}>刷新</Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={mockCRDs} rowKey="name" size="small" pagination={{ pageSize: 20 }} />
      </Card>

      <Drawer title={`CRD 详情 - ${selected?.kind || ''}`} open={!!selected} onClose={() => setSelected(null)} width={750}>
        {selected && (
          <Tabs items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="名称" span={2}>{selected.name}</Descriptions.Item>
                  <Descriptions.Item label="Group">{selected.group}</Descriptions.Item>
                  <Descriptions.Item label="版本">{selected.version}</Descriptions.Item>
                  <Descriptions.Item label="Kind">{selected.kind}</Descriptions.Item>
                  <Descriptions.Item label="作用域">{selected.scope}</Descriptions.Item>
                  <Descriptions.Item label="实例数">{selected.instances}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'instances', label: `实例 (${selected.instances})`,
              children: <Table columns={instanceColumns} dataSource={mockInstances.filter(i => i.kind === selected.kind || true).slice(0, selected.instances)} rowKey="name" size="small" />,
            },
            {
              key: 'yaml', label: 'YAML',
              children: <YamlEditor readOnly value={`apiVersion: apiextensions.k8s.io/v1\nkind: CustomResourceDefinition\nmetadata:\n  name: ${selected.name}\nspec:\n  group: ${selected.group}\n  versions:\n    - name: ${selected.version}\n      served: true\n      storage: true\n  scope: ${selected.scope}\n  names:\n    plural: ${selected.name.split('.')[0]}\n    singular: ${selected.kind.toLowerCase()}\n    kind: ${selected.kind}\n`} height={350} />,
            },
          ]} />
        )}
      </Drawer>
    </div>
  )
}
