import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Drawer, Descriptions, Tabs, Modal, Popconfirm, message } from 'antd'
import { CodeOutlined, ReloadOutlined, EyeOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import YamlEditor from '@/components/YamlEditor'
import { crdApi } from '@/services/api'

const { Title } = Typography

export default function CRDManagement() {
  const [selected, setSelected] = useState<any>(null)
  const [instanceDetail, setInstanceDetail] = useState<{ crdName: string; iname: string; namespace?: string } | null>(null)
  const [createModal, setCreateModal] = useState(false)
  const [createYaml, setCreateYaml] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [editModal, setEditModal] = useState<{ crdName: string; iname: string; namespace?: string; yaml: string } | null>(null)
  const queryClient = useQueryClient()

  const { data: crdsRes, isLoading } = useQuery({
    queryKey: ['crds'],
    queryFn: () => crdApi.list(),
  })
  const crds = (crdsRes as any)?.data?.list ?? []

  const { data: instancesRes, isLoading: instancesLoading, refetch: refetchInstances } = useQuery({
    queryKey: ['crds', selected?.name, 'instances'],
    queryFn: () => crdApi.listInstances(selected!.name),
    enabled: !!selected?.name,
  })
  const instances = (instancesRes as any)?.data?.list ?? []
  const instanceCount = (instancesRes as any)?.data?.total ?? 0

  const { data: instanceDetailData } = useQuery({
    queryKey: ['crd-instance', instanceDetail?.crdName, instanceDetail?.iname, instanceDetail?.namespace],
    queryFn: () => crdApi.getInstance(instanceDetail!.crdName, instanceDetail!.iname, instanceDetail?.namespace ? { namespace: instanceDetail.namespace } : undefined),
    enabled: !!instanceDetail?.crdName && !!instanceDetail?.iname,
  })
  const instanceDetailObj = (instanceDetailData as any)?.data

  const deleteInstanceMut = useMutation({
    mutationFn: ({ crdName, iname, namespace }: { crdName: string; iname: string; namespace?: string }) =>
      crdApi.deleteInstance(crdName, iname, namespace ? { namespace } : undefined),
    onSuccess: () => { message.success('已删除'); refetchInstances(); setInstanceDetail(null) },
    onError: (e: any) => message.error(e?.message || '删除失败'),
  })

  const columns = [
    { title: 'CRD名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><CodeOutlined style={{ color: '#722ed1' }} /><strong style={{ fontSize: 12 }}>{v}</strong></Space>, ellipsis: true },
    { title: 'Group', dataIndex: 'group', key: 'group', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Kind', dataIndex: 'kind', key: 'kind', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '作用域', dataIndex: 'scope', key: 'scope' },
    { title: '操作', key: 'action', render: (_: any, r: any) => <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>详情</Button> },
  ]

  const instanceColumns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (v: string, r: any) => (
        <a onClick={() => setInstanceDetail({ crdName: selected!.name, iname: v, namespace: r.namespace })}>{v}</a>
      ),
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => (v ? <Tag>{v}</Tag> : '-') },
    { title: '类型', dataIndex: 'kind', key: 'kind', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => {
            crdApi.getInstance(selected!.name, r.name, r.namespace ? { namespace: r.namespace } : undefined).then((res: any) => {
              const raw = res?.data
              setEditModal({ crdName: selected!.name, iname: r.name, namespace: r.namespace, yaml: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2) })
            }).catch(() => message.error('加载失败'))
          }}>编辑</Button>
          <Popconfirm title="确认删除该实例？" onConfirm={() => deleteInstanceMut.mutate({ crdName: selected!.name, iname: r.name, namespace: r.namespace })}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><CodeOutlined /> 自定义资源定义 (CRD)</Title>
        <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['crds'] })}>刷新</Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={crds} rowKey="name" size="small" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>

      <Drawer title={`CRD 详情 - ${selected?.kind || ''}`} open={!!selected} onClose={() => setSelected(null)} width={750}>
        {selected && (
          <Tabs items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="名称" span={2}>{selected.name}</Descriptions.Item>
                  <Descriptions.Item label="Group">{selected.group}</Descriptions.Item>
                  <Descriptions.Item label="版本">{selected.version}</Descriptions.Item>
                  <Descriptions.Item label="Kind">{selected.kind}</Descriptions.Item>
                  <Descriptions.Item label="作用域">{selected.scope}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'instances', label: `实例 (${instanceCount})`,
              children: (
                <>
                  <Button type="primary" size="small" icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => { setCreateModal(true); setCreateYaml(selected?.kind ? `apiVersion: ${selected.group || 'custom'}/${selected.version || 'v1'}\nkind: ${selected.kind}\nmetadata:\n  name: my-${(selected.kind || '').toLowerCase()}\n  namespace: default\nspec: {}` : '') }}>创建实例</Button>
                  <Table columns={instanceColumns} dataSource={instances} rowKey={(r: any) => `${r.namespace || ''}-${r.name}`} size="small" loading={instancesLoading} pagination={{ pageSize: 10 }} />
                </>
              ),
            },
            {
              key: 'yaml', label: 'YAML',
              children: <YamlEditor readOnly value={`apiVersion: apiextensions.k8s.io/v1\nkind: CustomResourceDefinition\nmetadata:\n  name: ${selected.name}\nspec:\n  group: ${selected.group}\n  versions:\n    - name: ${selected.version}\n      served: true\n      storage: true\n  scope: ${selected.scope}\n  names:\n    plural: ${selected.plural || selected.name?.split('.')[0]}\n    singular: ${(selected.kind || '').toLowerCase()}\n    kind: ${selected.kind}\n`} height={350} />,
            },
          ]} />
        )}
      </Drawer>

      {/* 实例详情抽屉 */}
      <Drawer title={`实例 - ${instanceDetail?.iname || ''}`} open={!!instanceDetail} onClose={() => setInstanceDetail(null)} width={640}>
        {instanceDetailObj && (
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto', maxHeight: 480 }}>
            {typeof instanceDetailObj === 'object' ? JSON.stringify(instanceDetailObj, null, 2) : String(instanceDetailObj)}
          </pre>
        )}
        {instanceDetail && (
          <Space style={{ marginTop: 12 }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              crdApi.getInstance(instanceDetail.crdName, instanceDetail.iname, instanceDetail.namespace ? { namespace: instanceDetail.namespace } : undefined).then((res: any) => {
                const raw = res?.data
                setEditModal({ crdName: instanceDetail.crdName, iname: instanceDetail.iname, namespace: instanceDetail.namespace, yaml: typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2) })
                setInstanceDetail(null)
              }).catch(() => message.error('加载失败'))
            }}>编辑 YAML</Button>
            <Popconfirm title="确认删除？" onConfirm={() => deleteInstanceMut.mutate({ crdName: instanceDetail.crdName, iname: instanceDetail.iname, namespace: instanceDetail.namespace })}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        )}
      </Drawer>

      <Modal title="创建实例" open={createModal} onCancel={() => setCreateModal(false)} width={800} okText="创建"
        onOk={() => {
          if (!selected?.name || !createYaml.trim()) return
          let body: any
          try {
            body = JSON.parse(createYaml)
          } catch {
            try {
              const yaml = (window as any).jsyaml
              body = yaml ? yaml.load(createYaml) : null
            } catch {}
          }
          if (!body) { message.error('请输入合法 JSON 或 YAML'); return }
          setCreateLoading(true)
          crdApi.createInstance(selected.name, body).then(() => {
            message.success('创建成功')
            refetchInstances()
            setCreateModal(false)
            setCreateYaml('')
          }).catch((e: any) => message.error(e?.message || '创建失败')).finally(() => setCreateLoading(false))
        }}
        confirmLoading={createLoading} destroyOnClose>
        <YamlEditor value={createYaml} onChange={setCreateYaml} height={400} />
      </Modal>

      <Modal title={`编辑实例 - ${editModal?.iname}`} open={!!editModal} onCancel={() => setEditModal(null)} width={800} okText="保存"
        onOk={() => {
          if (!editModal) return
          let body: any
          try {
            body = JSON.parse(editModal.yaml)
          } catch {
            try {
              const yaml = (window as any).jsyaml
              body = yaml ? yaml.load(editModal.yaml) : null
            } catch {}
          }
          if (!body) { message.error('请输入合法 JSON 或 YAML'); return }
          crdApi.updateInstance(editModal.crdName, editModal.iname, body, editModal.namespace ? { namespace: editModal.namespace } : undefined).then(() => {
            message.success('保存成功')
            refetchInstances()
            setEditModal(null)
          }).catch((e: any) => message.error(e?.message || '保存失败'))
        }}
        destroyOnClose>
        {editModal && <YamlEditor value={editModal.yaml} onChange={y => setEditModal(prev => prev ? { ...prev, yaml: y } : null)} height={420} />}
      </Modal>
    </div>
  )
}
