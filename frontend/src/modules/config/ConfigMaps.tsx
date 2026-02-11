import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Modal, Form, Input, message, Popconfirm, Drawer, Descriptions } from 'antd'
import { FileTextOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configApi } from '@/services/api'

const { Title } = Typography

export default function ConfigMaps() {
  const [namespace, setNamespace] = useState('default')
  const [createModal, setCreateModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({ queryKey: ['configmaps', namespace], queryFn: () => configApi.listConfigMaps({ namespace }) })
  const { data: detailData } = useQuery({ queryKey: ['configmap-detail', selected?.name, selected?.namespace], queryFn: () => configApi.getConfigMap(selected?.name, selected?.namespace), enabled: !!selected })

  const createMut = useMutation({
    mutationFn: configApi.createConfigMap,
    onSuccess: () => { message.success('创建成功'); setCreateModal(false); form.resetFields(); refetch() },
    onError: (e: any) => message.error(e.message),
  })
  const deleteMut = useMutation({ mutationFn: ({ name, ns }: any) => configApi.deleteConfigMap(name, ns), onSuccess: () => { message.success('已删除'); refetch() } })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><FileTextOutlined style={{ color: '#1677ff' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '数据条目', dataIndex: 'data_count', key: 'data_count' },
    { title: '操作', key: 'action', render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>查看</Button>
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  const detail = (detailData as any)?.data

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>ConfigMaps</Title>
        <Space>
          <Select value={namespace} style={{ width: 200 }} onChange={setNamespace} options={[{ value: 'default', label: 'default' }, { value: 'kube-system', label: 'kube-system' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>创建</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>

      <Modal title="创建 ConfigMap" open={createModal} onCancel={() => setCreateModal(false)} onOk={() => form.submit()} confirmLoading={createMut.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => createMut.mutate({ ...v, namespace })}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="namespace" label="命名空间" initialValue={namespace}><Input /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={`ConfigMap - ${selected?.name}`} open={!!selected} onClose={() => setSelected(null)} width={600}>
        {detail && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称">{detail.metadata?.name}</Descriptions.Item>
              <Descriptions.Item label="命名空间">{detail.metadata?.namespace}</Descriptions.Item>
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>配置数据</Title>
            {detail.data && Object.entries(detail.data).map(([k, v]) => (
              <Card key={k} size="small" title={k} style={{ marginBottom: 8 }}>
                <pre style={{ margin: 0, maxHeight: 200, overflow: 'auto', fontSize: 12 }}>{v as string}</pre>
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
