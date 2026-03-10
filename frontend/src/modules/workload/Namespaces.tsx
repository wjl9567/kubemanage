import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, message, Popconfirm } from 'antd'
import { AppstoreOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { namespaceApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const { Title } = Typography

export default function Namespaces() {
  const currentCluster = useAuthStore((s) => s.currentCluster)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['namespaces', currentCluster],
    queryFn: () => namespaceApi.list(),
    enabled: !!currentCluster,
  })
  const createMut = useMutation({
    mutationFn: (v: { name: string; labels?: Record<string, string> }) => namespaceApi.create(v),
    onSuccess: () => { message.success('命名空间已创建'); setCreateOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['namespaces'] }) },
    onError: (e: any) => message.error(e?.message || '创建失败'),
  })
  const deleteMut = useMutation({
    mutationFn: (name: string) => namespaceApi.delete(name),
    onSuccess: () => { message.success('已删除'); queryClient.invalidateQueries({ queryKey: ['namespaces'] }) },
    onError: (e: any) => message.error(e?.message || '删除失败'),
  })

  const list = (data as any)?.data?.list ?? []
  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><AppstoreOutlined style={{ color: '#1677ff' }} /><strong>{v}</strong></Space> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'Active' ? 'success' : 'default'}>{v}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Popconfirm title="删除后该命名空间下所有资源将不可恢复，确认删除？" onConfirm={() => deleteMut.mutate(r.name)}>
          <Button size="small" danger icon={<DeleteOutlined />} disabled={r.name === 'default' || r.name === 'kube-system'}>删除</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>命名空间</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建命名空间</Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={list} loading={isLoading} rowKey="name" pagination={{ pageSize: 15 }} /></Card>
      <Modal title="创建命名空间" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.validateFields().then((v) => createMut.mutate(v))} confirmLoading={createMut.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="my-namespace" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
