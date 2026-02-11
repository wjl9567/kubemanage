import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select } from 'antd'
import { AppstoreOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { workloadApi } from '@/services/api'

const { Title } = Typography

export default function DaemonSets() {
  const [namespace, setNamespace] = useState('')
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
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>DaemonSets</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} onChange={setNamespace} options={[{ value: '', label: '全部' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
    </div>
  )
}
