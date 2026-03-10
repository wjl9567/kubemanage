import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Modal, Form, Input, message, Popconfirm, Drawer, Descriptions } from 'antd'
import { FileTextOutlined, ReloadOutlined, PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { configApi, namespaceApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import EditResourceModal from '@/components/EditResourceModal'

const { Title } = Typography

export default function ConfigMaps() {
  const currentCluster = useAuthStore((s) => s.currentCluster)
  const [namespace, setNamespace] = useState('default')
  const [createModal, setCreateModal] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editTarget, setEditTarget] = useState<{ name: string; namespace: string } | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: nsData } = useQuery({ queryKey: ['namespaces', currentCluster], queryFn: () => namespaceApi.list(), enabled: !!currentCluster })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = nsList.map((n: any) => ({ value: n.name, label: n.name }))

  const { data, isLoading, refetch } = useQuery({ queryKey: ['configmaps', namespace], queryFn: () => configApi.listConfigMaps({ namespace }) })
  const { data: detailData } = useQuery({ queryKey: ['configmap-detail', selected?.name, selected?.namespace], queryFn: () => configApi.getConfigMap(selected?.name, selected?.namespace), enabled: !!selected })

  const createMut = useMutation({
    mutationFn: configApi.createConfigMap,
    onSuccess: () => { message.success('创建成功'); setCreateModal(false); form.resetFields(); refetch() },
    onError: (e: any) => message.error(e?.message || '创建失败'),
  })
  const deleteMut = useMutation({
    mutationFn: ({ name, ns }: any) => configApi.deleteConfigMap(name, ns),
    onSuccess: () => { message.success('已删除'); refetch() },
    onError: (e: any) => message.error(e?.message || '删除失败'),
  })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><FileTextOutlined style={{ color: '#1677ff' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '数据条目', dataIndex: 'data_count', key: 'data_count' },
    { title: '操作', key: 'action', width: 220, render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>查看</Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditTarget({ name: r.name, namespace: r.namespace })}>编辑</Button>
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
          <Select value={namespace} style={{ width: 200 }} onChange={setNamespace} options={nsOptions.length ? nsOptions : [{ value: 'default', label: 'default' }]} />
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

      <EditResourceModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => { refetch(); setEditTarget(null) }}
        kind="ConfigMap"
        apiVersion="v1"
        namespace={editTarget?.namespace}
        name={editTarget?.name || ''}
        title={`编辑 ConfigMap: ${editTarget?.name}`}
      />
    </div>
  )
}
