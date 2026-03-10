import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Popconfirm, Modal, message } from 'antd'
import { AppstoreOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { workloadApi, namespaceApi, applyApi } from '@/services/api'
import EditResourceModal from '@/components/EditResourceModal'
import YamlEditor from '@/components/YamlEditor'

const { Title } = Typography

const defaultJobYaml = `apiVersion: batch/v1
kind: Job
metadata:
  name: my-job
  namespace: default
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: pi
          image: perl:5.34
          command: ["perl", "-Mbignum=bpi", "-wle", "print bpi(2000)"]
  backoffLimit: 4
`

export default function Jobs() {
  const [namespace, setNamespace] = useState<string>('')
  const [editTarget, setEditTarget] = useState<{ name: string; namespace: string } | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [createYaml, setCreateYaml] = useState(defaultJobYaml)
  const [createLoading, setCreateLoading] = useState(false)

  const { data: nsData } = useQuery({
    queryKey: ['namespaces'],
    queryFn: () => namespaceApi.list(),
  })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = [{ value: '', label: '全部' }, ...nsList.map((n: any) => ({ value: n.name, label: n.name }))]

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs', namespace],
    queryFn: () => workloadApi.listJobs({ namespace }),
  })
  const deleteMut = useMutation({
    mutationFn: ({ name, ns }: { name: string; ns: string }) => workloadApi.deleteJob(name, ns),
    onSuccess: () => { message.success('已删除'); refetch() },
    onError: (e: any) => message.error(e?.message || '删除失败'),
  })

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (v: string) => <Space><AppstoreOutlined style={{ color: '#722ed1' }} /><strong>{v}</strong></Space>,
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '状态', key: 'status',
      render: (_: any, r: any) => {
        const completed = r.succeeded ?? 0
        const active = r.active ?? 0
        const failed = r.failed ?? 0
        return (
          <Space>
            <Tag color="success">完成 {completed}</Tag>
            {active > 0 && <Tag color="processing">运行中 {active}</Tag>}
            {failed > 0 && <Tag color="error">失败 {failed}</Tag>}
          </Space>
        )
      },
    },
    { title: '完成数', dataIndex: 'completions', key: 'completions', render: (v: any, r: any) => `${r.succeeded ?? 0}/${v ?? 1}` },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作', key: 'action', width: 180,
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
        <Title level={4} style={{ margin: 0 }}>Jobs</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} value={namespace || undefined} onChange={setNamespace} options={nsOptions} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>创建 Job</Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={list} loading={isLoading} rowKey={(r: any) => `${r.namespace}-${r.name}`} pagination={{ pageSize: 15 }} /></Card>

      <EditResourceModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => { refetch(); setEditTarget(null) }}
        kind="Job"
        apiVersion="batch/v1"
        namespace={editTarget?.namespace}
        name={editTarget?.name || ''}
        title={`编辑 Job: ${editTarget?.name}`}
      />

      <Modal
        title="创建 Job"
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
            setCreateYaml(defaultJobYaml)
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
