import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select } from 'antd'
import { AppstoreOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { workloadApi, namespaceApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import EditResourceModal from '@/components/EditResourceModal'

const { Title } = Typography

export default function StatefulSets() {
  const currentCluster = useAuthStore((s) => s.currentCluster)
  const [namespace, setNamespace] = useState('')
  const [editTarget, setEditTarget] = useState<{ name: string; namespace: string } | null>(null)
  const { data: nsData } = useQuery({ queryKey: ['namespaces', currentCluster], queryFn: () => namespaceApi.list(), enabled: !!currentCluster })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = [{ value: '', label: '全部' }, ...nsList.map((n: any) => ({ value: n.name, label: n.name }))]
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['statefulsets', namespace],
    queryFn: () => workloadApi.listStatefulSets({ namespace }),
  })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><AppstoreOutlined style={{ color: '#13c2c2' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '副本', key: 'replicas', render: (_: any, r: any) => <Tag color={r.ready === r.replicas ? 'success' : 'warning'}>{r.ready || 0}/{r.replicas || 0}</Tag> },
    { title: '镜像', dataIndex: 'images', key: 'images', render: (v: string[]) => v?.map((img, i) => <Tag key={i} style={{ fontSize: 11 }}>{img?.split('/').pop()}</Tag>), ellipsis: true },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditTarget({ name: r.name, namespace: r.namespace || 'default' })}>编辑</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>StatefulSets</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} value={namespace || undefined} onChange={setNamespace} options={nsOptions} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
      <EditResourceModal open={!!editTarget} onClose={() => setEditTarget(null)} onSuccess={() => { refetch(); setEditTarget(null) }}
        kind="StatefulSet" apiVersion="apps/v1" namespace={editTarget?.namespace} name={editTarget?.name || ''} title={`编辑 StatefulSet: ${editTarget?.name}`} />
    </div>
  )
}
