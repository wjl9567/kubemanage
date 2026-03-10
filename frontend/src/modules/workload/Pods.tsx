import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Drawer, Descriptions, Tabs, Popconfirm, message } from 'antd'
import { ContainerOutlined, ReloadOutlined, DeleteOutlined, CodeOutlined, FileTextOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { workloadApi, namespaceApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import LogViewer from '@/components/LogViewer'
import PodTerminal from '@/components/Terminal'

const { Title, Text } = Typography

export default function Pods() {
  const currentCluster = useAuthStore((s) => s.currentCluster)
  const [namespace, setNamespace] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: nsData } = useQuery({ queryKey: ['namespaces', currentCluster], queryFn: () => namespaceApi.list(), enabled: !!currentCluster })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = [{ value: '', label: '全部' }, ...nsList.map((n: any) => ({ value: n.name, label: n.name }))]

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pods', namespace],
    queryFn: () => workloadApi.listPods({ namespace }),
  })

  const deleteMut = useMutation({
    mutationFn: ({ name, ns }: any) => workloadApi.deletePod(name, ns),
    onSuccess: () => { message.success('Pod已删除'); refetch() },
    onError: (e: any) => message.error(e?.response?.data?.message || e?.message || '删除失败'),
  })

  const statusColor = (s: string) => {
    switch (s) {
      case 'Running': return 'success'
      case 'Succeeded': return 'blue'
      case 'Pending': return 'warning'
      case 'Failed': return 'error'
      default: return 'default'
    }
  }

  const columns = [
    {
      title: 'Pod名称', dataIndex: 'name', key: 'name',
      render: (v: string, r: any) => (
        <a onClick={() => { setSelected(r); setDrawerOpen(true) }}>
          <Space><ContainerOutlined style={{ color: '#52c41a' }} />{v}</Space>
        </a>
      ),
      ellipsis: true,
    },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag>, width: 120 },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={statusColor(v)}>{v}</Tag>, width: 100 },
    { title: 'IP', dataIndex: 'ip', key: 'ip', width: 130 },
    { title: '节点', dataIndex: 'node', key: 'node', ellipsis: true, width: 150 },
    { title: '容器数', key: 'containers', render: (_: any, r: any) => r.containers?.length || 0, width: 80 },
    { title: '重启', dataIndex: 'restarts', key: 'restarts', width: 60, render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{v}</Text> },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => { setSelected(r); setDrawerOpen(true) }}>日志</Button>
          <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const pods = (data as any)?.data?.list || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Pods ({pods.length})</Title>
        <Space>
          <Select placeholder="命名空间" allowClear style={{ width: 200 }} value={namespace || undefined} onChange={setNamespace}
            options={nsOptions} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={pods} loading={isLoading} rowKey={(r) => `${r.namespace}-${r.name}`} pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 个Pod` }} size="small" /></Card>

      <Drawer title={`Pod详情 - ${selected?.name || ''}`} open={drawerOpen} onClose={() => setDrawerOpen(false)} width={700}>
        {selected && (
          <Tabs items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="名称">{selected.name}</Descriptions.Item>
                  <Descriptions.Item label="命名空间">{selected.namespace}</Descriptions.Item>
                  <Descriptions.Item label="状态"><Tag color={statusColor(selected.status)}>{selected.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="IP">{selected.ip}</Descriptions.Item>
                  <Descriptions.Item label="节点">{selected.node}</Descriptions.Item>
                  <Descriptions.Item label="重启次数">{selected.restarts}</Descriptions.Item>
                  <Descriptions.Item label="容器" span={2}>
                    {selected.containers?.map((c: any, i: number) => <Tag key={i}>{c.name}: {c.image}</Tag>)}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'logs', label: '日志',
              children: (
                <LogViewer
                  podName={selected.name}
                  namespace={selected.namespace}
                  containers={selected.containers || []}
                />
              ),
            },
            {
              key: 'terminal', label: '终端',
              children: (
                <PodTerminal
                  podName={selected.name}
                  namespace={selected.namespace}
                  containers={selected.containers || []}
                  clusterId={currentCluster ?? undefined}
                />
              ),
            },
          ]} />
        )}
      </Drawer>
    </div>
  )
}
