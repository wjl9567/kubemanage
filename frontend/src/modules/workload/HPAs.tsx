import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Popconfirm, Modal, message } from 'antd'
import { LineHeightOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { hpaApi, namespaceApi, applyApi } from '@/services/api'
import EditResourceModal from '@/components/EditResourceModal'
import YamlEditor from '@/components/YamlEditor'

const { Title } = Typography

const defaultHpaYaml = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: sample-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sample-deploy
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
`

export default function HPAs() {
  const [namespace, setNamespace] = useState<string>('')
  const [editTarget, setEditTarget] = useState<{ name: string; namespace: string } | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [createYaml, setCreateYaml] = useState(defaultHpaYaml)
  const [createLoading, setCreateLoading] = useState(false)

  const { data: nsData } = useQuery({
    queryKey: ['namespaces'],
    queryFn: () => namespaceApi.list(),
  })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = [{ value: '', label: '全部' }, ...nsList.map((n: any) => ({ value: n.name, label: n.name }))]

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hpas', namespace],
    queryFn: () => hpaApi.list({ namespace }),
  })
  const deleteMut = useMutation({
    mutationFn: ({ name, ns }: { name: string; ns: string }) => hpaApi.delete(name, ns),
    onSuccess: () => { message.success('已删除'); refetch() },
    onError: (e: any) => message.error(e?.message || '删除失败'),
  })

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (v: string) => <Space><LineHeightOutlined style={{ color: '#52c41a' }} /><strong>{v}</strong></Space>,
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '目标', dataIndex: 'target_ref', key: 'target_ref', render: (v: string) => v || '-' },
    {
      title: '副本范围', key: 'replicas',
      render: (_: any, r: any) => (
        <Tag color="blue">{(r.current_replicas ?? '-')} / {r.min_replicas ?? '-'} ~ {r.max_replicas ?? '-'}</Tag>
      ),
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, r: any) => (
        <Space wrap>
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditTarget({ name: r.name, namespace: r.namespace || 'default' })}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const list = (data as any)?.data?.list || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>HPA (水平扩缩)</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} value={namespace || undefined} onChange={setNamespace} options={nsOptions} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>创建 HPA</Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={list} loading={isLoading} rowKey={(r: any) => `${r.namespace}-${r.name}`} pagination={{ pageSize: 15 }} /></Card>

      <EditResourceModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => { refetch(); setEditTarget(null) }}
        kind="HorizontalPodAutoscaler"
        apiVersion="autoscaling/v2"
        namespace={editTarget?.namespace}
        name={editTarget?.name || ''}
        title={`编辑 HPA: ${editTarget?.name}`}
      />

      <Modal
        title="创建 HPA"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        width={800}
        okText="创建"
        onOk={() => {
          setCreateLoading(true)
          applyApi.apply(createYaml).then(() => {
            message.success('创建成功')
            refetch()
            setCreateModal(false)
            setCreateYaml(defaultHpaYaml)
          }).catch((e: any) => message.error(e?.message || '创建失败')).finally(() => setCreateLoading(false))
        }}
        confirmLoading={createLoading}
        destroyOnClose
      >
        <YamlEditor value={createYaml} onChange={setCreateYaml} height={420} />
      </Modal>
    </div>
  )
}
