import React from 'react'
import { Card, Typography, Button } from 'antd'
import { FileSearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph } = Typography

export default function Logging() {
  const navigate = useNavigate()

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}><FileSearchOutlined /> 日志分析</Title>
      <Card>
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#666' }}>
          <FileSearchOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <Title level={5}>按 Pod 查看实时日志</Title>
          <Paragraph>当前版本支持在工作负载中按 Pod 查看实时日志。请进入「工作负载 → Pods」，选择 Pod 后点击「日志」打开日志查看器。</Paragraph>
          <Button type="primary" onClick={() => navigate('/workloads/pods')}>前往 Pods</Button>
        </div>
      </Card>
    </div>
  )
}
