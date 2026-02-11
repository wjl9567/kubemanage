import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, InputNumber, Modal, Popconfirm, message } from 'antd'
import { AppstoreOutlined, ReloadOutlined, ScissorOutlined, RedoOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workloadApi } from '@/services/api'

const { Title } = Typography

export default function Deployments() {
  const [namespace, setNamespace] = useState<string>('')
  const [scaleModal, setScaleModal] = useState<{ name: string; ns: string; replicas: number } | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['deployments', namespace],
    queryFn: () => workloadApi.listDeployments({ namespace }),
  })

  const scaleMut = useMutation({
    mutationFn: ({ name, ns, replicas }: any) => workloadApi.scaleDeployment(name, ns, replicas),
    onSuccess: () => { message.success('扩缩容成功'); setScaleModal(null); refetch() },
    onError: (e: any) => message.error(e.message),
  })

  const restartMut = useMutation({
    mutationFn: ({ name, ns }: any) => workloadApi.restartDeployment(name, ns),
    onSuccess: () => { message.success('重启成功'); refetch() },
  })

  const deleteMut = useMutation({
    mutationFn: ({ name, ns }: any) => workloadApi.deleteDeployment(name, ns),
    onSuccess: () => { message.success('已删除'); refetch() },
  })

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (v: string) => <Space><AppstoreOutlined style={{ color: '#722ed1' }} /><strong>{v}</strong></Space>,
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '副本', key: 'replicas',
      render: (_: any, r: any) => {
        const ok = r.ready === r.replicas
        return <Tag color={ok ? 'success' : 'warning'}>{r.ready || 0}/{r.replicas || 0}</Tag>
      },
    },
    {
      title: '镜像', dataIndex: 'images', key: 'images',
      render: (v: string[]) => v?.map((img, i) => <Tag key={i} style={{ fontSize: 11 }}>{img?.split('/').pop()}</Tag>),
      ellipsis: true,
    },
    { title: '策略', dataIndex: 'strategy', key: 'strategy', render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: '操作', key: 'action', width: 260,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<ScissorOutlined />} onClick={() => setScaleModal({ name: r.name, ns: r.namespace, replicas: r.replicas })}>扩缩容</Button>
          <Popconfirm title="确认重启？" onConfirm={() => restartMut.mutate({ name: r.name, ns: r.namespace })}>
            <Button size="small" icon={<RedoOutlined />}>重启</Button>
          </Popconfirm>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const deployments = (data as any)?.data?.list || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Deployments</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} onChange={setNamespace}
            options={[{ value: '', label: '全部' }, { value: 'default', label: 'default' }, { value: 'kube-system', label: 'kube-system' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={deployments} loading={isLoading} rowKey="name" pagination={{ pageSize: 15 }} /></Card>

      <Modal title="扩缩容" open={!!scaleModal} onCancel={() => setScaleModal(null)}
        onOk={() => scaleModal && scaleMut.mutate(scaleModal)} confirmLoading={scaleMut.isPending}>
        <p>Deployment: <strong>{scaleModal?.name}</strong></p>
        <Space>
          <span>副本数:</span>
          <InputNumber min={0} max={100} value={scaleModal?.replicas}
            onChange={(v) => scaleModal && setScaleModal({ ...scaleModal, replicas: v || 0 })} />
        </Space>
      </Modal>
    </div>
  )
}
