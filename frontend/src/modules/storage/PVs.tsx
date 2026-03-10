import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Drawer, Descriptions, message } from 'antd'
import { DatabaseOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { storageApi, applyApi } from '@/services/api'
import EditResourceModal from '@/components/EditResourceModal'

const { Title } = Typography

export default function PVs() {
  const [selected, setSelected] = useState<any>(null)
  const [editOpen, setEditOpen] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pvs'],
    queryFn: () => storageApi.listPVs(),
  })
  const list = (data as any)?.data?.list || []

  const columns = [
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (v: string) => (
        <Space>
          <DatabaseOutlined style={{ color: '#eb2f96' }} />
          <a onClick={() => setSelected(list.find((r: any) => r.name === v))}>{v}</a>
        </Space>
      ),
    },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'Available' || v === 'Bound' ? 'success' : 'warning'}>{v}</Tag> },
    { title: '容量', dataIndex: 'capacity', key: 'capacity' },
    { title: '存储类', dataIndex: 'storage_class', key: 'storage_class', render: (v: string) => <Tag>{v || '-'}</Tag> },
    { title: '访问模式', dataIndex: 'access_modes', key: 'access_modes', render: (v: string[]) => v?.map((m, i) => <Tag key={i}>{m}</Tag>) },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => { setSelected(r); setEditOpen(true) }}>编辑 YAML</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>持久卷 (PV)</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </div>
      <Card><Table columns={columns} dataSource={list} loading={isLoading} rowKey="name" pagination={{ pageSize: 15 }} /></Card>

      <Drawer title={`PV 详情 - ${selected?.name || ''}`} open={!!selected && !editOpen} onClose={() => setSelected(null)} width={640}>
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="名称">{selected.name}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={selected.status === 'Bound' || selected.status === 'Available' ? 'success' : 'warning'}>{selected.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="容量">{selected.capacity}</Descriptions.Item>
            <Descriptions.Item label="存储类">{selected.storage_class || '-'}</Descriptions.Item>
            <Descriptions.Item label="访问模式">{selected.access_modes?.join(', ') || '-'}</Descriptions.Item>
            <Descriptions.Item label="回收策略">{selected.reclaim_policy || '-'}</Descriptions.Item>
          </Descriptions>
        )}
        {selected && (
          <Button type="primary" icon={<EditOutlined />} style={{ marginTop: 16 }} onClick={() => setEditOpen(true)}>编辑 YAML</Button>
        )}
      </Drawer>

      <EditResourceModal
        open={editOpen && !!selected}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { refetch(); setEditOpen(false) }}
        kind="PersistentVolume"
        apiVersion="v1"
        name={selected?.name || ''}
        title={`编辑 PV: ${selected?.name}`}
      />
    </div>
  )
}
