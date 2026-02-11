import React from 'react'
import { Card, Row, Col, Typography, Tag, Table, Space, Button, Select, DatePicker } from 'antd'
import { AlertOutlined, ReloadOutlined, DashboardOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function Monitoring() {
  // CPU使用率趋势（模拟数据）
  const cpuOption = {
    title: { text: 'CPU 使用率趋势', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'] },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      { name: '集群CPU', type: 'line', data: [45, 52, 48, 62, 58, 65, 60], smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#1677ff' } },
    ],
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
  }

  const memOption = {
    title: { text: '内存使用率趋势', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'] },
    yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    series: [
      { name: '集群内存', type: 'line', data: [60, 62, 58, 70, 68, 72, 71], smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#52c41a' } },
    ],
    grid: { left: 60, right: 20, top: 40, bottom: 30 },
  }

  const networkOption = {
    title: { text: '网络IO', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['入流量', '出流量'], bottom: 0 },
    xAxis: { type: 'category', data: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'] },
    yAxis: { type: 'value', axisLabel: { formatter: '{value} MB/s' } },
    series: [
      { name: '入流量', type: 'line', data: [12, 18, 15, 22, 19, 25, 20], smooth: true, itemStyle: { color: '#722ed1' } },
      { name: '出流量', type: 'line', data: [8, 12, 10, 16, 14, 18, 15], smooth: true, itemStyle: { color: '#fa8c16' } },
    ],
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
  }

  const alertRules = [
    { key: 1, name: 'Pod内存超阈值', metric: 'container_memory_usage_bytes', condition: '> 90%', severity: 'critical', enabled: true },
    { key: 2, name: '节点CPU过高', metric: 'node_cpu_seconds_total', condition: '> 85%', severity: 'warning', enabled: true },
    { key: 3, name: '磁盘使用率', metric: 'node_filesystem_avail_bytes', condition: '< 15%', severity: 'warning', enabled: true },
    { key: 4, name: 'Pod重启频繁', metric: 'kube_pod_container_status_restarts_total', condition: '> 5/10m', severity: 'critical', enabled: false },
  ]

  const ruleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '监控指标', dataIndex: 'metric', key: 'metric', render: (v: string) => <Tag>{v}</Tag> },
    { title: '条件', dataIndex: 'condition', key: 'condition' },
    { title: '级别', dataIndex: 'severity', key: 'severity', render: (v: string) => <Tag color={v === 'critical' ? 'red' : 'orange'}>{v}</Tag> },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
    { title: '操作', key: 'action', render: () => <Space><Button size="small">编辑</Button><Button size="small">测试</Button></Space> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><DashboardOutlined /> 监控告警</Title>
        <Space>
          <RangePicker showTime size="small" />
          <Button icon={<ReloadOutlined />}>刷新</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}><Card size="small"><ReactECharts option={cpuOption} style={{ height: 250 }} /></Card></Col>
        <Col xs={24} lg={12}><Card size="small"><ReactECharts option={memOption} style={{ height: 250 }} /></Card></Col>
        <Col xs={24}><Card size="small"><ReactECharts option={networkOption} style={{ height: 250 }} /></Card></Col>
      </Row>

      <Card title={<Space><AlertOutlined /><span>告警规则</span></Space>} size="small" style={{ marginTop: 16 }}>
        <Table columns={ruleColumns} dataSource={alertRules} pagination={false} size="small" />
      </Card>
    </div>
  )
}
