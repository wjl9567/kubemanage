import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Drawer, Descriptions, Tabs } from 'antd'
import { CodeOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import YamlEditor from '@/components/YamlEditor'
import { crdApi } from '@/services/api'

const { Title } = Typography

export default function CRDManagement() {
  const [selected, setSelected] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: crdsRes, isLoading } = useQuery({
    queryKey: ['crds'],
    queryFn: () => crdApi.list(),
  })
  const crds = (crdsRes as any)?.data?.list ?? []

  const { data: instancesRes, isLoading: instancesLoading } = useQuery({
    queryKey: ['crds', selected?.name, 'instances'],
    queryFn: () => crdApi.listInstances(selected!.name),
    enabled: !!selected?.name,
  })
  const instances = (instancesRes as any)?.data?.list ?? []
  const instanceCount = (instancesRes as any)?.data?.total ?? 0

  const columns = [
    { title: 'CRD名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><CodeOutlined style={{ color: '#722ed1' }} /><strong style={{ fontSize: 12 }}>{v}</strong></Space>, ellipsis: true },
    { title: 'Group', dataIndex: 'group', key: 'group', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Kind', dataIndex: 'kind', key: 'kind', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '作用域', dataIndex: 'scope', key: 'scope' },
    { title: '操作', key: 'action', render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>详情</Button> },
  ]

  const instanceColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => (v ? <Tag>{v}</Tag> : '-') },
    { title: '类型', dataIndex: 'kind', key: 'kind', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><CodeOutlined /> 自定义资源定义 (CRD)</Title>
        <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['crds'] })}>刷新</Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={crds} rowKey="name" size="small" loading={isLoading} pagination={{ pageSize: 20 }} />
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
                </Descriptions>
              ),
            },
            {
              key: 'instances', label: `实例 (${instanceCount})`,
              children: <Table columns={instanceColumns} dataSource={instances} rowKey={(r: any) => `${r.namespace || ''}-${r.name}`} size="small" loading={instancesLoading} pagination={{ pageSize: 10 }} />,
            },
            {
              key: 'yaml', label: 'YAML',
              children: <YamlEditor readOnly value={`apiVersion: apiextensions.k8s.io/v1\nkind: CustomResourceDefinition\nmetadata:\n  name: ${selected.name}\nspec:\n  group: ${selected.group}\n  versions:\n    - name: ${selected.version}\n      served: true\n      storage: true\n  scope: ${selected.scope}\n  names:\n    plural: ${selected.plural || selected.name?.split('.')[0]}\n    singular: ${(selected.kind || '').toLowerCase()}\n    kind: ${selected.kind}\n`} height={350} />,
            },
          ]} />
        )}
      </Drawer>
    </div>
  )
}
