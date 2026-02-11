import React from 'react'
import { Row, Col, Card, Statistic, Progress, Tag, Table, Typography, Space, Button, Tooltip } from 'antd'
import {
  NodeIndexOutlined, ContainerOutlined, AppstoreOutlined, DatabaseOutlined,
  AlertOutlined, ApiOutlined, ReloadOutlined, CloudServerOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { clusterApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import ReactECharts from 'echarts-for-react'
import TopologyGraph from '@/components/TopologyGraph'

const { Title, Text } = Typography

export default function Overview() {
  const clusterId = useAuthStore((s) => s.currentCluster) || 1
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cluster-overview', clusterId],
    queryFn: () => clusterApi.overview(clusterId),
  })

  const overview = (data as any)?.data || {}

  const statusColor = (value: number, warn: number, danger: number) => {
    if (value >= danger) return '#ff4d4f'
    if (value >= warn) return '#faad14'
    return '#52c41a'
  }

  const cpuPercent = overview.cpu_capacity ? Math.round((overview.cpu_usage / overview.cpu_capacity) * 100) : 0
  const memPercent = overview.memory_capacity ? Math.round((overview.memory_usage / overview.memory_capacity) * 100) : 0

  const statCards = [
    { title: '节点数', value: overview.node_count || 0, ready: overview.node_ready, icon: <NodeIndexOutlined />, color: '#1677ff' },
    { title: 'Pod数', value: overview.pod_count || 0, extra: `运行中: ${overview.pod_running || 0}`, icon: <ContainerOutlined />, color: '#52c41a' },
    { title: '工作负载', value: overview.deployment_count || 0, icon: <AppstoreOutlined />, color: '#722ed1' },
    { title: '命名空间', value: overview.namespace_count || 0, icon: <CloudServerOutlined />, color: '#13c2c2' },
    { title: 'Service', value: overview.service_count || 0, icon: <ApiOutlined />, color: '#fa8c16' },
    { title: 'PVC', value: overview.pvc_count || 0, icon: <DatabaseOutlined />, color: '#eb2f96' },
  ]

  // 资源使用率饼图
  const resourceOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie', radius: ['50%', '70%'], center: ['25%', '45%'],
        data: [
          { value: cpuPercent, name: 'CPU使用', itemStyle: { color: '#1677ff' } },
          { value: 100 - cpuPercent, name: 'CPU空闲', itemStyle: { color: '#f0f0f0' } },
        ],
        label: { show: true, position: 'center', formatter: `CPU\n${cpuPercent}%`, fontSize: 14, fontWeight: 'bold' },
      },
      {
        type: 'pie', radius: ['50%', '70%'], center: ['75%', '45%'],
        data: [
          { value: memPercent, name: '内存使用', itemStyle: { color: '#52c41a' } },
          { value: 100 - memPercent, name: '内存空闲', itemStyle: { color: '#f0f0f0' } },
        ],
        label: { show: true, position: 'center', formatter: `内存\n${memPercent}%`, fontSize: 14, fontWeight: 'bold' },
      },
    ],
  }

  // Pod 状态分布
  const podStatusOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: '70%',
      data: [
        { value: overview.pod_running || 0, name: 'Running', itemStyle: { color: '#52c41a' } },
        { value: overview.pod_pending || 0, name: 'Pending', itemStyle: { color: '#faad14' } },
        { value: overview.pod_failed || 0, name: 'Failed', itemStyle: { color: '#ff4d4f' } },
      ],
      label: { formatter: '{b}: {c}' },
    }],
  }

  // 告警列表（模拟数据）
  const alertColumns = [
    { title: '级别', dataIndex: 'severity', key: 'severity',
      render: (v: string) => <Tag color={v === 'critical' ? 'red' : v === 'warning' ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '告警内容', dataIndex: 'message', key: 'message' },
    { title: '资源', dataIndex: 'resource', key: 'resource' },
    { title: '时间', dataIndex: 'time', key: 'time' },
  ]

  const mockAlerts = [
    { key: 1, severity: 'critical', message: 'Pod内存使用率超过90%', resource: 'app-server-7d8f', time: '2分钟前' },
    { key: 2, severity: 'warning', message: '节点磁盘使用率达85%', resource: 'node-worker-02', time: '15分钟前' },
    { key: 3, severity: 'info', message: 'Deployment副本数不足', resource: 'web-frontend', time: '1小时前' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>集群总览</Title>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]}>
        {statCards.map((item) => (
          <Col xs={12} sm={8} md={4} key={item.title}>
            <Card size="small" hoverable>
              <Statistic
                title={<Space>{item.icon}<span>{item.title}</span></Space>}
                value={item.value}
                valueStyle={{ color: item.color, fontSize: 28 }}
              />
              {item.extra && <Text type="secondary" style={{ fontSize: 12 }}>{item.extra}</Text>}
              {item.ready !== undefined && (
                <Text type="secondary" style={{ fontSize: 12 }}>就绪: {item.ready}/{item.value}</Text>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 资源使用率 */}
        <Col xs={24} lg={12}>
          <Card title="资源使用率" size="small">
            <ReactECharts option={resourceOption} style={{ height: 250 }} />
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={12}>
                <Text type="secondary">CPU</Text>
                <Progress
                  percent={cpuPercent}
                  strokeColor={statusColor(cpuPercent, 80, 90)}
                  size="small"
                />
              </Col>
              <Col span={12}>
                <Text type="secondary">内存</Text>
                <Progress
                  percent={memPercent}
                  strokeColor={statusColor(memPercent, 80, 90)}
                  size="small"
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Pod 状态分布 */}
        <Col xs={24} lg={12}>
          <Card title="Pod 状态分布" size="small">
            <ReactECharts option={podStatusOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      {/* 微服务拓扑 */}
      <Card title="微服务拓扑" size="small" style={{ marginTop: 16 }}>
        <TopologyGraph />
      </Card>

      {/* 活跃告警 */}
      <Card title={<Space><AlertOutlined style={{ color: '#ff4d4f' }} /><span>活跃告警</span><Tag color="red">{mockAlerts.length}</Tag></Space>}
        size="small" style={{ marginTop: 16 }}>
        <Table columns={alertColumns} dataSource={mockAlerts} pagination={false} size="small" />
      </Card>
    </div>
  )
}
