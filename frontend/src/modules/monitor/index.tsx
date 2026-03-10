import React, { useMemo, useState } from 'react'
import { Card, Row, Col, Typography, Tag, Table, Space, Button, message } from 'antd'
import { AlertOutlined, ReloadOutlined, DashboardOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import ReactECharts from 'echarts-for-react'
import { monitorApi } from '@/services/api'

const { Title, Text } = Typography

// 将 Prometheus query_range 的 result 转为 ECharts 可用的 xAxis + series
function promResultToSeries(result: { metric?: Record<string, string }; values?: [number, string][] }[], name: string) {
  if (!result?.length || !result[0].values?.length) return { xAxis: [] as string[], series: [] as number[] }
  const xAxis = result[0].values.map(([t]) => new Date(t * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
  const series = result[0].values.map(([, v]) => parseFloat(v))
  return { xAxis, series }
}

export default function Monitoring() {
  const [range, setRange] = useState(60) // 最近 N 分钟
  const end = Math.floor(Date.now() / 1000)
  const start = end - range * 60
  const step = Math.max(15, Math.floor((range * 60) / 60)) // 约 60 点

  const params = { start: String(start), end: String(end), step: `${step}s` }

  // 常用 PromQL（适配 kube-prometheus-stack / node_exporter）
  const cpuQuery = '100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)'
  const memQuery = '100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))'
  const netInQuery = 'sum(rate(node_network_receive_bytes_total[5m]))/1024/1024'
  const netOutQuery = 'sum(rate(node_network_transmit_bytes_total[5m]))/1024/1024'

  const { data: cpuData, isFetching: cpuLoading, refetch: refetchAll } = useQuery({
    queryKey: ['prometheus', 'cpu', start, end, step],
    queryFn: () => monitorApi.queryRange({ query: cpuQuery, ...params }),
    retry: false,
    staleTime: 60000,
  })
  const { data: memData } = useQuery({
    queryKey: ['prometheus', 'mem', start, end, step],
    queryFn: () => monitorApi.queryRange({ query: memQuery, ...params }),
    retry: false,
    staleTime: 60000,
  })
  const { data: netInData } = useQuery({
    queryKey: ['prometheus', 'netIn', start, end, step],
    queryFn: () => monitorApi.queryRange({ query: netInQuery, ...params }),
    retry: false,
    staleTime: 60000,
  })
  const { data: netOutData } = useQuery({
    queryKey: ['prometheus', 'netOut', start, end, step],
    queryFn: () => monitorApi.queryRange({ query: netOutQuery, ...params }),
    retry: false,
    staleTime: 60000,
  })

  const prometheusConfigured = (cpuData as any)?.data?.result != null

  const cpuOption = useMemo(() => {
    if (!prometheusConfigured || !(cpuData as any)?.data?.result) {
      return { title: { text: 'CPU 使用率' }, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } }, series: [{ name: 'CPU', type: 'line', data: [] }], grid: { left: 60, right: 20, top: 40, bottom: 30 } }
    }
    const { xAxis, series } = promResultToSeries((cpuData as any).data.result, 'CPU')
    return {
      title: { text: 'CPU 使用率趋势', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxis },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{ name: '集群CPU', type: 'line', data: series, smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#1677ff' } }],
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
    }
  }, [cpuData, prometheusConfigured])

  const memOption = useMemo(() => {
    if (!prometheusConfigured || !(memData as any)?.data?.result) {
      return { title: { text: '内存使用率' }, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value', max: 100 }, series: [{ name: '内存', type: 'line', data: [] }], grid: { left: 60, right: 20, top: 40, bottom: 30 } }
    }
    const { xAxis, series } = promResultToSeries((memData as any).data.result, '内存')
    return {
      title: { text: '内存使用率趋势', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxis },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{ name: '集群内存', type: 'line', data: series, smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#52c41a' } }],
      grid: { left: 60, right: 20, top: 40, bottom: 30 },
    }
  }, [memData, prometheusConfigured])

  const networkOption = useMemo(() => {
    if (!prometheusConfigured || !(netInData as any)?.data?.result || !(netOutData as any)?.data?.result) {
      return { title: { text: '网络 IO' }, xAxis: { type: 'category', data: [] }, yAxis: { type: 'value' }, series: [], grid: { left: 60, right: 20, top: 40, bottom: 40 } }
    }
    const inR = (netInData as any).data.result
    const outR = (netOutData as any).data.result
    const { xAxis, series: inSeries } = promResultToSeries(inR, '入')
    const { series: outSeries } = promResultToSeries(outR, '出')
    return {
      title: { text: '网络 IO (MB/s)', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      legend: { data: ['入流量', '出流量'], bottom: 0 },
      xAxis: { type: 'category', data: xAxis },
      yAxis: { type: 'value', axisLabel: { formatter: '{value} MB/s' } },
      series: [
        { name: '入流量', type: 'line', data: inSeries, smooth: true, itemStyle: { color: '#722ed1' } },
        { name: '出流量', type: 'line', data: outSeries, smooth: true, itemStyle: { color: '#fa8c16' } },
      ],
      grid: { left: 60, right: 20, top: 40, bottom: 40 },
    }
  }, [netInData, netOutData, prometheusConfigured])

  const alertRules = [
    { key: 1, name: 'Pod内存超阈值', metric: 'container_memory_usage_bytes', condition: '> 90%', severity: 'critical', enabled: true },
    { key: 2, name: '节点CPU过高', metric: 'node_cpu_seconds_total', condition: '> 85%', severity: 'warning', enabled: true },
    { key: 3, name: '磁盘使用率', metric: 'node_filesystem_avail_bytes', condition: '< 15%', severity: 'warning', enabled: true },
  ]
  const ruleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '监控指标', dataIndex: 'metric', key: 'metric', render: (v: string) => <Tag>{v}</Tag> },
    { title: '条件', dataIndex: 'condition', key: 'condition' },
    { title: '级别', dataIndex: 'severity', key: 'severity', render: (v: string) => <Tag color={v === 'critical' ? 'red' : 'orange'}>{v}</Tag> },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><DashboardOutlined /> 监控告警</Title>
        <Space>
          {[15, 60, 360].map((m) => (
            <Button key={m} size="small" type={range === m ? 'primary' : 'default'} onClick={() => setRange(m)}>最近{m === 360 ? '6h' : m + '分钟'}</Button>
          ))}
          <Button icon={<ReloadOutlined />} onClick={() => refetchAll()} loading={cpuLoading}>刷新</Button>
        </Space>
      </div>

      {!prometheusConfigured && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
            <AlertOutlined style={{ fontSize: 36, marginBottom: 8 }} />
            <Title level={5}>配置 Prometheus 后展示监控曲线</Title>
            <Text type="secondary">在部署环境中设置 PROMETHEUS_URL（如 http://prometheus:9090），并确保集群已部署 node_exporter 或 kube-prometheus-stack。</Text>
          </div>
        </Card>
      )}

      {prometheusConfigured && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}><Card size="small"><ReactECharts option={cpuOption} style={{ height: 250 }} /></Card></Col>
          <Col xs={24} lg={12}><Card size="small"><ReactECharts option={memOption} style={{ height: 250 }} /></Card></Col>
          <Col xs={24}><Card size="small"><ReactECharts option={networkOption} style={{ height: 250 }} /></Card></Col>
        </Row>
      )}

      <Card title={<Space><AlertOutlined /><span>告警规则说明</span></Space>} size="small" style={{ marginTop: 16 }}>
        <p style={{ color: '#666' }}>告警渠道在「系统设置 → 告警渠道」配置；规则与 Prometheus AlertManager 对接后生效。</p>
        <Table columns={ruleColumns} dataSource={alertRules} pagination={false} size="small" rowKey="key" />
      </Card>
    </div>
  )
}
