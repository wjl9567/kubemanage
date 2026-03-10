import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select } from 'antd'
import { AppstoreOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { workloadApi, namespaceApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import EditResourceModal from '@/components/EditResourceModal'

const { Title } = Typography

export default function DaemonSets() {
  const currentCluster = useAuthStore((s) => s.currentCluster)
  const [namespace, setNamespace] = useState('')
  const [editTarget, setEditTarget] = useState<{ name: string; namespace: string } | null>(null)
  const { data: nsData } = useQuery({ queryKey: ['namespaces', currentCluster], queryFn: () => namespaceApi.list(), enabled: !!currentCluster })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = [{ value: '', label: '全部' }, ...nsList.map((n: any) => ({ value: n.name, label: n.name }))]
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['daemonsets', namespace],
    queryFn: () => workloadApi.listDaemonSets({ namespace }),
  })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><AppstoreOutlined style={{ color: '#fa8c16' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '期望', dataIndex: 'desired', key: 'desired' },
    { title: '当前', dataIndex: 'current', key: 'current' },
    { title: '就绪', dataIndex: 'ready', key: 'ready', render: (v: number, r: any) => <Tag color={v === r.desired ? 'success' : 'warning'}>{v}/{r.desired}</Tag> },
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
        <Title level={4} style={{ margin: 0 }}>DaemonSets</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} value={namespace || undefined} onChange={setNamespace} options={nsOptions} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
      <EditResourceModal open={!!editTarget} onClose={() => setEditTarget(null)} onSuccess={() => { refetch(); setEditTarget(null) }}
        kind="DaemonSet" apiVersion="apps/v1" namespace={editTarget?.namespace} name={editTarget?.name || ''} title={`编辑 DaemonSet: ${editTarget?.name}`} />
    </div>
  )
}
