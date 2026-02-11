import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Popconfirm, message } from 'antd'
import { ShareAltOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { networkApi } from '@/services/api'

const { Title } = Typography

export default function Services() {
  const [namespace, setNamespace] = useState('')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['services', namespace], queryFn: () => networkApi.listServices({ namespace }) })
  const deleteMut = useMutation({ mutationFn: ({ name, ns }: any) => networkApi.deleteService(name, ns), onSuccess: () => { message.success('已删除'); refetch() } })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><ShareAltOutlined style={{ color: '#fa8c16' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'LoadBalancer' ? 'blue' : v === 'NodePort' ? 'green' : 'default'}>{v}</Tag> },
    { title: 'ClusterIP', dataIndex: 'cluster_ip', key: 'cluster_ip' },
    { title: '端口', dataIndex: 'ports', key: 'ports', render: (v: any[]) => v?.map((p, i) => <Tag key={i}>{p.port}:{p.target_port}/{p.protocol}</Tag>) },
    { title: '操作', key: 'action', render: (_: any, r: any) => (
      <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
      </Popconfirm>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Services</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} onChange={setNamespace} options={[{ value: '', label: '全部' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
    </div>
  )
}
