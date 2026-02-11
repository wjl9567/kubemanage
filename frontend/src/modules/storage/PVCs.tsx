import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Popconfirm, message, Progress } from 'antd'
import { DatabaseOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { storageApi } from '@/services/api'

const { Title } = Typography

export default function PVCs() {
  const [namespace, setNamespace] = useState('default')
  const { data, isLoading, refetch } = useQuery({ queryKey: ['pvcs', namespace], queryFn: () => storageApi.listPVCs({ namespace }) })
  const deleteMut = useMutation({ mutationFn: ({ name, ns }: any) => storageApi.deletePVC(name, ns), onSuccess: () => { message.success('已删除'); refetch() } })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><DatabaseOutlined style={{ color: '#eb2f96' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'Bound' ? 'success' : 'warning'}>{v}</Tag> },
    { title: '容量', dataIndex: 'capacity', key: 'capacity' },
    { title: '存储类', dataIndex: 'storage_class', key: 'storage_class', render: (v: any) => <Tag>{v || '-'}</Tag> },
    { title: '访问模式', dataIndex: 'access_modes', key: 'access_modes', render: (v: string[]) => v?.map((m, i) => <Tag key={i}>{m}</Tag>) },
    { title: '操作', key: 'action', render: (_: any, r: any) => (
      <Popconfirm title="删除PVC前请确认无关联Pod正在使用" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
      </Popconfirm>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>持久卷声明 (PVC)</Title>
        <Space>
          <Select value={namespace} style={{ width: 200 }} onChange={setNamespace} options={[{ value: 'default', label: 'default' }, { value: 'kube-system', label: 'kube-system' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>
    </div>
  )
}
