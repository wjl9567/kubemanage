import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Popconfirm, message } from 'antd'
import { GatewayOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { networkApi } from '@/services/api'

const { Title } = Typography

export default function Ingresses() {
  const [namespace, setNamespace] = useState('')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['ingresses', namespace], queryFn: () => networkApi.listIngresses({ namespace }) })
  const deleteMut = useMutation({ mutationFn: ({ name, ns }: any) => networkApi.deleteIngress(name, ns), onSuccess: () => { message.success('已删除'); refetch() } })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><GatewayOutlined style={{ color: '#1677ff' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '规则', dataIndex: 'rules', key: 'rules', render: (v: any[]) => v?.map((r, i) => <Tag key={i}>{r.host || '*'} → {r.paths?.[0]?.backend_service || '-'}</Tag>) },
    { title: 'TLS', dataIndex: 'tls', key: 'tls', render: (v: any) => v?.length ? <Tag color="green">启用</Tag> : <Tag>未启用</Tag> },
    { title: '操作', key: 'action', render: (_: any, r: any) => (
      <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
      </Popconfirm>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Ingresses</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} onChange={setNamespace} options={[{ value: '', label: '全部' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
    </div>
  )
}
