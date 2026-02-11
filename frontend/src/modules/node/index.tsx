import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Drawer, Descriptions, Progress, Tabs } from 'antd'
import { NodeIndexOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { nodeApi } from '@/services/api'

const { Title } = Typography

export default function NodeList() {
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['nodes'],
    queryFn: () => nodeApi.list(),
  })

  const { data: podData } = useQuery({
    queryKey: ['node-pods', selectedNode?.name],
    queryFn: () => nodeApi.pods(selectedNode?.name),
    enabled: !!selectedNode,
  })

  const { data: eventData } = useQuery({
    queryKey: ['node-events', selectedNode?.name],
    queryFn: () => nodeApi.events(selectedNode?.name),
    enabled: !!selectedNode,
  })

  const columns = [
    {
      title: '节点名称', dataIndex: 'name', key: 'name',
      render: (v: string) => <Space><NodeIndexOutlined style={{ color: '#1677ff' }} /><a onClick={() => { setSelectedNode((data as any)?.data?.list?.find((n: any) => n.name === v)); setDrawerOpen(true) }}>{v}</a></Space>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={v === 'Ready' ? 'success' : 'error'}>{v}</Tag>,
    },
    {
      title: '角色', dataIndex: 'roles', key: 'roles',
      render: (v: string) => <Tag color={v === 'master' ? 'blue' : 'default'}>{v}</Tag>,
    },
    { title: 'K8s版本', dataIndex: 'k8s_version', key: 'k8s_version' },
    { title: 'CPU', dataIndex: 'cpu_capacity', key: 'cpu_capacity' },
    { title: '内存', dataIndex: 'memory_capacity', key: 'memory_capacity' },
    { title: '操作系统', dataIndex: 'os', key: 'os', ellipsis: true },
    { title: '运行时', dataIndex: 'container_runtime', key: 'container_runtime', ellipsis: true },
  ]

  const nodes = (data as any)?.data?.list || []
  const nodePods = (podData as any)?.data?.list || []
  const nodeEvents = (eventData as any)?.data?.list || []

  const podColumns = [
    { title: 'Pod名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'Running' ? 'success' : 'warning'}>{v}</Tag> },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
    { title: '重启次数', dataIndex: 'restarts', key: 'restarts' },
  ]

  const eventColumns = [
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'Warning' ? 'warning' : 'default'}>{v}</Tag> },
    { title: '原因', dataIndex: 'reason', key: 'reason' },
    { title: '消息', dataIndex: 'message', key: 'message', ellipsis: true },
    { title: '次数', dataIndex: 'count', key: 'count' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>节点管理</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </div>

      <Card>
        <Table columns={columns} dataSource={nodes} loading={isLoading} rowKey="name" pagination={{ pageSize: 20 }} />
      </Card>

      {/* 节点详情抽屉 */}
      <Drawer title={`节点详情 - ${selectedNode?.name || ''}`} open={drawerOpen}
        onClose={() => setDrawerOpen(false)} width={720}>
        {selectedNode && (
          <Tabs items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="节点名称">{selectedNode.name}</Descriptions.Item>
                  <Descriptions.Item label="状态"><Tag color={selectedNode.status === 'Ready' ? 'success' : 'error'}>{selectedNode.status}</Tag></Descriptions.Item>
                  <Descriptions.Item label="角色">{selectedNode.roles}</Descriptions.Item>
                  <Descriptions.Item label="K8s版本">{selectedNode.k8s_version}</Descriptions.Item>
                  <Descriptions.Item label="CPU容量">{selectedNode.cpu_capacity}</Descriptions.Item>
                  <Descriptions.Item label="内存容量">{selectedNode.memory_capacity}</Descriptions.Item>
                  <Descriptions.Item label="操作系统" span={2}>{selectedNode.os}</Descriptions.Item>
                  <Descriptions.Item label="容器运行时" span={2}>{selectedNode.container_runtime}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'pods', label: `Pod (${nodePods.length})`,
              children: <Table columns={podColumns} dataSource={nodePods} rowKey="name" size="small" pagination={{ pageSize: 10 }} />,
            },
            {
              key: 'events', label: `事件 (${nodeEvents.length})`,
              children: <Table columns={eventColumns} dataSource={nodeEvents} rowKey={(r: any, i) => `${r.reason}-${i}`} size="small" pagination={{ pageSize: 10 }} />,
            },
          ]} />
        )}
      </Drawer>
    </div>
  )
}
