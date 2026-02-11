import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select } from 'antd'
import { AppstoreOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { workloadApi } from '@/services/api'

const { Title } = Typography

export default function StatefulSets() {
  const [namespace, setNamespace] = useState('')
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['statefulsets', namespace],
    queryFn: () => workloadApi.listStatefulSets({ namespace }),
  })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><AppstoreOutlined style={{ color: '#13c2c2' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '副本', key: 'replicas', render: (_: any, r: any) => <Tag color={r.ready === r.replicas ? 'success' : 'warning'}>{r.ready || 0}/{r.replicas || 0}</Tag> },
    { title: '镜像', dataIndex: 'images', key: 'images', render: (v: string[]) => v?.map((img, i) => <Tag key={i} style={{ fontSize: 11 }}>{img?.split('/').pop()}</Tag>), ellipsis: true },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>StatefulSets</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} onChange={setNamespace} options={[{ value: '', label: '全部' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
    </div>
  )
}
