import React from 'react'
import { Card, Table, Tag, Button, Typography, Space } from 'antd'
import { HddOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { storageApi } from '@/services/api'

const { Title } = Typography

export default function StorageClasses() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['storageclasses'], queryFn: () => storageApi.listStorageClasses() })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><HddOutlined style={{ color: '#722ed1' }} /><strong>{v}</strong></Space> },
    { title: 'Provisioner', dataIndex: 'provisioner', key: 'provisioner', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '回收策略', dataIndex: 'reclaim_policy', key: 'reclaim_policy', render: (v: any) => <Tag>{v || 'Delete'}</Tag> },
    { title: '绑定模式', dataIndex: 'volume_binding_mode', key: 'volume_binding_mode', render: (v: any) => <Tag>{v || 'Immediate'}</Tag> },
    { title: '允许扩容', dataIndex: 'allow_expansion', key: 'allow_expansion', render: (v: any) => v ? <Tag color="green">是</Tag> : <Tag>否</Tag> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>存储类</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
    </div>
  )
}
