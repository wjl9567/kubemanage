import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Space, Input, Tag, Switch, Select, Typography } from 'antd'
import { ReloadOutlined, PauseOutlined, CaretRightOutlined, DownloadOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'

const { Text } = Typography

interface LogViewerProps {
  podName: string
  namespace: string
  containers: { name: string; image: string }[]
  clusterId?: number
  defaultContainer?: string
}

// 日志级别颜色
const levelColor = (line: string) => {
  if (/\b(ERROR|FATAL|PANIC)\b/i.test(line)) return '#ff4d4f'
  if (/\b(WARN|WARNING)\b/i.test(line)) return '#faad14'
  if (/\b(INFO)\b/i.test(line)) return '#1677ff'
  if (/\b(DEBUG|TRACE)\b/i.test(line)) return '#8c8c8c'
  return '#d4d4d4'
}

export default function LogViewer({ podName, namespace, containers, clusterId, defaultContainer }: LogViewerProps) {
  const token = useAuthStore((s) => s.token)
  const [logs, setLogs] = useState<string[]>([])
  const [connected, setConnected] = useState(false)
  const [paused, setPaused] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [container, setContainer] = useState(defaultContainer || containers[0]?.name || '')
  const [autoScroll, setAutoScroll] = useState(true)
  const [tailLines, setTailLines] = useState(200)
  const wsRef = useRef<WebSocket | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close() }
    setLogs([])
    setConnected(false)

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    let url = `${protocol}//${host}/api/v1/pods/${podName}/logs?namespace=${namespace}&container=${container}&tail=${tailLines}&follow=true&cluster_id=${clusterId || 1}`
    if (token) url += `&token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onmessage = (e) => {
      if (!paused) {
        setLogs(prev => {
          const next = [...prev, e.data]
          // 保留最近 5000 行，避免内存溢出
          return next.length > 5000 ? next.slice(-5000) : next
        })
      }
    }
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
  }, [podName, namespace, container, tailLines, clusterId, token])

  useEffect(() => {
    connect()
    return () => { wsRef.current?.close() }
  }, [connect])

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleDownload = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${podName}-${container}-${new Date().toISOString().slice(0, 19)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 高亮关键词
  const highlightLine = (line: string) => {
    if (!keyword) return line
    const idx = line.toLowerCase().indexOf(keyword.toLowerCase())
    if (idx === -1) return line
    return (
      <>
        {line.substring(0, idx)}
        <mark style={{ background: '#faad14', color: '#000', padding: '0 2px', borderRadius: 2 }}>
          {line.substring(idx, idx + keyword.length)}
        </mark>
        {line.substring(idx + keyword.length)}
      </>
    )
  }

  const filteredLogs = keyword
    ? logs.filter(l => l.toLowerCase().includes(keyword.toLowerCase()))
    : logs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 450 }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <Space size="small" wrap>
          {containers.length > 1 && (
            <Select size="small" value={container} onChange={setContainer} style={{ width: 160 }}
              options={containers.map(c => ({ value: c.name, label: c.name }))} />
          )}
          {containers.length <= 1 && <Tag>{container || '-'}</Tag>}
          <Tag color={connected ? 'success' : 'error'}>{connected ? '已连接' : '未连接'}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{filteredLogs.length} 行</Text>
        </Space>
        <Space size="small" wrap>
          <Input size="small" placeholder="关键词过滤..." prefix={<SearchOutlined />} style={{ width: 180 }}
            value={keyword} onChange={e => setKeyword(e.target.value)} allowClear />
          <Button size="small" icon={paused ? <CaretRightOutlined /> : <PauseOutlined />}
            onClick={() => setPaused(!paused)} type={paused ? 'primary' : 'default'}>
            {paused ? '继续' : '暂停'}
          </Button>
          <Switch size="small" checked={autoScroll} onChange={setAutoScroll} checkedChildren="自动滚动" unCheckedChildren="手动" />
          <Button size="small" icon={<ClearOutlined />} onClick={() => setLogs([])}>清空</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload}>下载</Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={connect}>重连</Button>
        </Space>
      </div>

      {/* 日志区域 */}
      <div ref={containerRef} style={{
        flex: 1, background: '#1e1e1e', borderRadius: 8, padding: '12px 16px', overflow: 'auto',
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
        fontSize: 12.5, lineHeight: 1.7, color: '#d4d4d4',
      }}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center', paddingTop: 60 }}>
            {connected ? '等待日志输出...' : '正在连接日志流...'}
          </div>
        ) : (
          filteredLogs.map((line, i) => (
            <div key={i} style={{ color: levelColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              <span style={{ color: '#666', marginRight: 8, userSelect: 'none', fontSize: 11 }}>
                {String(i + 1).padStart(4)}
              </span>
              {highlightLine(line)}
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
