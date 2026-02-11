import React, { useState } from 'react'
import { Card, Input, Select, Button, Space, Typography, Tag, DatePicker, Table } from 'antd'
import { FileSearchOutlined, ReloadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

export default function Logging() {
  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState<string>('')

  // 模拟日志数据
  const mockLogs = [
    { key: 1, time: '2026-02-11 10:32:15.123', pod: 'app-server-7d8f-abc12', container: 'app', level: 'ERROR', message: 'Connection refused: connect to database failed, retrying in 5s...' },
    { key: 2, time: '2026-02-11 10:32:14.892', pod: 'web-frontend-5c9d-def34', container: 'nginx', level: 'WARN', message: 'upstream timed out (110: Connection timed out) while reading response header' },
    { key: 3, time: '2026-02-11 10:32:14.456', pod: 'api-gateway-8b2e-ghi56', container: 'gateway', level: 'INFO', message: 'Request handled: GET /api/v1/health -> 200 (2ms)' },
    { key: 4, time: '2026-02-11 10:32:13.789', pod: 'worker-6a4c-jkl78', container: 'worker', level: 'INFO', message: 'Job completed: process_order_batch, duration: 1.2s, items: 150' },
    { key: 5, time: '2026-02-11 10:32:13.234', pod: 'app-server-7d8f-abc12', container: 'app', level: 'DEBUG', message: 'Cache hit for key: user_session_12345' },
    { key: 6, time: '2026-02-11 10:32:12.567', pod: 'monitoring-9x1z-mno90', container: 'prometheus', level: 'INFO', message: 'Scrape completed: 48 targets, 0 failed' },
    { key: 7, time: '2026-02-11 10:32:11.890', pod: 'app-server-7d8f-abc12', container: 'app', level: 'ERROR', message: 'Panic recovered: nil pointer dereference at handlers/order.go:156' },
    { key: 8, time: '2026-02-11 10:32:10.123', pod: 'web-frontend-5c9d-def34', container: 'nginx', level: 'INFO', message: '10.0.0.5 - - "GET /static/app.js" 200 145832 0.002' },
  ]

  const levelColor = (l: string) => {
    switch (l) { case 'ERROR': return '#ff4d4f'; case 'WARN': return '#faad14'; case 'INFO': return '#1677ff'; case 'DEBUG': return '#999'; default: return '#999' }
  }

  const columns = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 200, render: (v: string) => <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{v}</Text> },
    { title: '级别', dataIndex: 'level', key: 'level', width: 80, render: (v: string) => <Tag color={levelColor(v)} style={{ fontWeight: 'bold' }}>{v}</Tag> },
    { title: 'Pod', dataIndex: 'pod', key: 'pod', width: 220, ellipsis: true, render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
    { title: '容器', dataIndex: 'container', key: 'container', width: 100 },
    {
      title: '日志内容', dataIndex: 'message', key: 'message',
      render: (v: string) => (
        <Text style={{ fontFamily: 'Consolas, monospace', fontSize: 12, color: keyword && v.toLowerCase().includes(keyword.toLowerCase()) ? '#ff4d4f' : undefined }}>
          {v}
        </Text>
      ),
    },
  ]

  const filteredLogs = mockLogs.filter((log) => {
    if (level && log.level !== level) return false
    if (keyword && !log.message.toLowerCase().includes(keyword.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><FileSearchOutlined /> 日志分析</Title>
        <Space>
          <Button icon={<DownloadOutlined />}>导出</Button>
          <Button icon={<ReloadOutlined />}>刷新</Button>
        </Space>
      </div>

      {/* 搜索栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="关键词搜索..." prefix={<SearchOutlined />} style={{ width: 300 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} allowClear />
          <Select placeholder="命名空间" style={{ width: 150 }} allowClear options={[{ value: 'default', label: 'default' }, { value: 'kube-system', label: 'kube-system' }]} />
          <Select placeholder="Pod" style={{ width: 200 }} allowClear />
          <Select placeholder="日志级别" style={{ width: 120 }} allowClear value={level || undefined} onChange={(v) => setLevel(v || '')}
            options={[{ value: 'ERROR', label: 'ERROR' }, { value: 'WARN', label: 'WARN' }, { value: 'INFO', label: 'INFO' }, { value: 'DEBUG', label: 'DEBUG' }]} />
          <RangePicker showTime size="middle" />
          <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
        </Space>
      </Card>

      {/* 日志列表 */}
      <Card size="small">
        <Table
          columns={columns}
          dataSource={filteredLogs}
          rowKey="key"
          size="small"
          pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条日志` }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}
