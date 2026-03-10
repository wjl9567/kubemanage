import React, { useEffect, useRef, useState } from 'react'
import { Terminal as XTerminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { Tag, Select, Space, Button, Typography } from 'antd'
import { CodeOutlined, ReloadOutlined, ExpandOutlined } from '@ant-design/icons'
import 'xterm/css/xterm.css'
import { useAuthStore } from '@/stores/auth'

const { Text } = Typography

interface TerminalProps {
  podName: string
  namespace: string
  containers: { name: string; image: string }[]
  clusterId?: number
}

export default function PodTerminal({ podName, namespace, containers, clusterId }: TerminalProps) {
  const token = useAuthStore((s) => s.token)
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [container, setContainer] = useState(containers[0]?.name || '')

  const connect = () => {
    // 清理旧连接
    if (wsRef.current) wsRef.current.close()
    if (xtermRef.current) xtermRef.current.dispose()

    // 创建终端
    const term = new XTerminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#d7ba7d',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
      },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      scrollback: 5000,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    if (termRef.current) {
      term.open(termRef.current)
      setTimeout(() => fitAddon.fit(), 100)
    }

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // WebSocket 连接
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    let url = `${protocol}//${host}/api/v1/pods/${podName}/exec?namespace=${namespace}&container=${container}&cluster_id=${clusterId || 1}`
    if (token) url += `&token=${encodeURIComponent(token)}`

    term.writeln('\x1b[1;34m[KubeManage Terminal]\x1b[0m 正在连接...')
    term.writeln(`\x1b[90mPod: ${podName} | Container: ${container} | Namespace: ${namespace}\x1b[0m`)
    term.writeln('')

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      term.writeln('\x1b[1;32m[已连接]\x1b[0m 输入命令开始操作\r\n')
    }

    ws.onmessage = (e) => {
      term.write(e.data)
    }

    ws.onclose = () => {
      setConnected(false)
      term.writeln('\r\n\x1b[1;31m[连接已断开]\x1b[0m')
    }

    ws.onerror = () => {
      setConnected(false)
      term.writeln('\r\n\x1b[1;31m[连接错误]\x1b[0m WebSocket 连接失败')
    }

    // 用户输入发送到 WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    // 窗口 resize 自适应
    const handleResize = () => {
      setTimeout(() => fitAddon.fit(), 50)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

  useEffect(() => {
    wsRef.current?.close()
    xtermRef.current?.dispose()
    const cleanup = connect()
    return () => {
      cleanup?.()
      wsRef.current?.close()
      xtermRef.current?.dispose()
    }
  }, [podName, namespace, container, clusterId, token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 450 }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Space>
          <CodeOutlined style={{ color: '#52c41a' }} />
          <Text strong>终端</Text>
          <Select size="small" value={container} onChange={setContainer} style={{ width: 150 }}
            options={containers.map(c => ({ value: c.name, label: c.name }))} />
          <Tag color={connected ? 'success' : 'error'}>{connected ? '已连接' : '未连接'}</Tag>
        </Space>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={connect}>重连</Button>
          <Button size="small" icon={<ExpandOutlined />} onClick={() => fitAddonRef.current?.fit()}>适应</Button>
        </Space>
      </div>

      {/* 终端区域 */}
      <div ref={termRef} style={{
        flex: 1, borderRadius: 8, overflow: 'hidden',
        border: '1px solid #333',
      }} />
    </div>
  )
}
