import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Form, Input, Select, Typography, message, Popconfirm } from 'antd'
import { PlusOutlined, CloudServerOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clusterApi } from '@/services/api'

const { Title } = Typography

export default function ClusterList() {
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => clusterApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: clusterApi.create,
    onSuccess: () => { message.success('集群注册成功'); setModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['clusters'] }) },
    onError: (e: any) => message.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: clusterApi.delete,
    onSuccess: () => { message.success('集群已移除'); queryClient.invalidateQueries({ queryKey: ['clusters'] }) },
  })

  const columns = [
    {
      title: '集群名称', dataIndex: 'name', key: 'name',
      render: (v: string, r: any) => <Space><CloudServerOutlined style={{ color: '#1677ff' }} /><strong>{r.display_name || v}</strong></Space>,
    },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (v: string) => <Tag color={v === 'self-hosted' ? 'blue' : 'green'}>{v}</Tag>,
    },
    { title: '提供商', dataIndex: 'provider', key: 'provider' },
    { title: '地域', dataIndex: 'region', key: 'region' },
    { title: 'K8s版本', dataIndex: 'version', key: 'version' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => (
        <Tag color={v === 'active' ? 'success' : v === 'inactive' ? 'default' : 'error'}>
          {v === 'active' ? '运行中' : v === 'inactive' ? '已禁用' : '异常'}
        </Tag>
      ),
    },
    { title: '节点数', dataIndex: 'node_count', key: 'node_count' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" type="link">详情</Button>
          <Popconfirm title="确认移除此集群？" onConfirm={() => deleteMutation.mutate(r.id)}>
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>移除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const clusters = (data as any)?.data?.list || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>多集群管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['clusters'] })}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>注册集群</Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={clusters} loading={isLoading} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Modal title="注册集群" open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} confirmLoading={createMutation.isPending} width={640}>
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="集群名称" rules={[{ required: true }]}><Input placeholder="my-cluster" /></Form.Item>
          <Form.Item name="display_name" label="显示名称"><Input placeholder="我的集群" /></Form.Item>
          <Form.Item name="type" label="集群类型" rules={[{ required: true }]}>
            <Select options={[
              { value: 'self-hosted', label: '自建集群' },
              { value: 'ack', label: '阿里云 ACK' },
              { value: 'tke', label: '腾讯云 TKE' },
              { value: 'cce', label: '华为云 CCE' },
              { value: 'eks', label: 'AWS EKS' },
            ]} />
          </Form.Item>
          <Form.Item name="api_server" label="API Server 地址"><Input placeholder="https://apiserver:6443" /></Form.Item>
          <Form.Item name="kube_config" label="KubeConfig"><Input.TextArea rows={6} placeholder="粘贴 kubeconfig 内容..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
