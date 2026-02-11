import React, { useCallback, useMemo } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap, MarkerType,
  useNodesState, useEdgesState, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Tag, Typography, Tooltip, Card } from 'antd'
import { CloudServerOutlined, ApiOutlined, AppstoreOutlined, DatabaseOutlined, UserOutlined } from '@ant-design/icons'

const { Text } = Typography

// 自定义节点样式
const layerColors: Record<string, { bg: string; border: string; text: string }> = {
  client:  { bg: '#f5f5f5', border: '#d9d9d9', text: '#666' },
  gateway: { bg: '#f9f0ff', border: '#d3adf7', text: '#722ed1' },
  service: { bg: '#f6ffed', border: '#b7eb8f', text: '#389e0d' },
  data:    { bg: '#fff7e6', border: '#ffd591', text: '#d46b08' },
}

// 自定义节点组件
function ServiceNode({ data }: { data: any }) {
  const colors = layerColors[data.layer] || layerColors.service
  const statusColor = data.status === 'healthy' ? '#52c41a' : data.status === 'warning' ? '#faad14' : '#ff4d4f'

  return (
    <Tooltip title={`${data.label} | 延迟: ${data.latency || '-'} | 状态: ${data.status}`}>
      <div style={{
        padding: '10px 16px', borderRadius: 8, border: `2px solid ${colors.border}`,
        background: colors.bg, minWidth: 140, textAlign: 'center', position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {/* 状态指示灯 */}
        <div style={{
          position: 'absolute', top: -4, right: -4, width: 10, height: 10,
          borderRadius: '50%', background: statusColor, border: '2px solid #fff',
        }} />
        <div style={{ fontSize: 18, marginBottom: 4 }}>{data.icon}</div>
        <Text strong style={{ fontSize: 13, color: colors.text, display: 'block' }}>{data.label}</Text>
        {data.replicas && (
          <Tag style={{ marginTop: 4, fontSize: 10 }}>{data.replicas} 副本</Tag>
        )}
        {data.latency && (
          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{data.latency}</div>
        )}
      </div>
    </Tooltip>
  )
}

const nodeTypes = { serviceNode: ServiceNode }

interface TopologyGraphProps {
  style?: React.CSSProperties
}

export default function TopologyGraph({ style }: TopologyGraphProps) {
  // 微服务拓扑数据
  const initialNodes: Node[] = useMemo(() => [
    // 客户端层
    { id: 'browser', type: 'serviceNode', position: { x: 350, y: 0 }, data: { label: '浏览器/客户端', icon: '🌐', layer: 'client', status: 'healthy' } },
    { id: 'mobile', type: 'serviceNode', position: { x: 600, y: 0 }, data: { label: '移动端', icon: '📱', layer: 'client', status: 'healthy' } },

    // API 网关层
    { id: 'gateway', type: 'serviceNode', position: { x: 450, y: 120 }, data: { label: 'API Gateway', icon: '🔀', layer: 'gateway', status: 'healthy', replicas: 2, latency: '12ms' } },
    { id: 'ingress', type: 'serviceNode', position: { x: 200, y: 120 }, data: { label: 'Ingress Controller', icon: '🚪', layer: 'gateway', status: 'healthy', replicas: 2, latency: '3ms' } },

    // 业务服务层
    { id: 'user-svc', type: 'serviceNode', position: { x: 100, y: 270 }, data: { label: 'User Service', icon: '👤', layer: 'service', status: 'healthy', replicas: 3, latency: '8ms' } },
    { id: 'order-svc', type: 'serviceNode', position: { x: 320, y: 270 }, data: { label: 'Order Service', icon: '📦', layer: 'service', status: 'warning', replicas: 2, latency: '45ms' } },
    { id: 'payment-svc', type: 'serviceNode', position: { x: 540, y: 270 }, data: { label: 'Payment Service', icon: '💳', layer: 'service', status: 'healthy', replicas: 2, latency: '15ms' } },
    { id: 'notify-svc', type: 'serviceNode', position: { x: 760, y: 270 }, data: { label: 'Notification', icon: '🔔', layer: 'service', status: 'healthy', replicas: 1, latency: '6ms' } },
    { id: 'web-frontend', type: 'serviceNode', position: { x: 100, y: 120 }, sourcePosition: Position.Bottom, data: { label: 'Web Frontend', icon: '🖥️', layer: 'service', status: 'healthy', replicas: 3, latency: '5ms' } },

    // 数据存储层
    { id: 'postgres', type: 'serviceNode', position: { x: 150, y: 420 }, data: { label: 'PostgreSQL', icon: '🐘', layer: 'data', status: 'healthy', replicas: 2, latency: '2ms' } },
    { id: 'redis', type: 'serviceNode', position: { x: 370, y: 420 }, data: { label: 'Redis', icon: '⚡', layer: 'data', status: 'healthy', replicas: 3, latency: '1ms' } },
    { id: 'kafka', type: 'serviceNode', position: { x: 590, y: 420 }, data: { label: 'Kafka', icon: '📨', layer: 'data', status: 'healthy', replicas: 3, latency: '4ms' } },
    { id: 'minio', type: 'serviceNode', position: { x: 780, y: 420 }, data: { label: 'MinIO', icon: '🗄️', layer: 'data', status: 'healthy', replicas: 1, latency: '6ms' } },
  ], [])

  const initialEdges: Edge[] = useMemo(() => [
    // 客户端 → 网关
    { id: 'e-browser-ingress', source: 'browser', target: 'ingress', animated: true, style: { stroke: '#d9d9d9' } },
    { id: 'e-mobile-gateway', source: 'mobile', target: 'gateway', animated: true, style: { stroke: '#d9d9d9' } },
    { id: 'e-ingress-frontend', source: 'ingress', target: 'web-frontend', style: { stroke: '#d3adf7' } },
    { id: 'e-ingress-gateway', source: 'ingress', target: 'gateway', style: { stroke: '#d3adf7' } },

    // 网关 → 服务
    { id: 'e-gw-user', source: 'gateway', target: 'user-svc', animated: true, label: '1.2k/s', style: { stroke: '#b7eb8f' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-gw-order', source: 'gateway', target: 'order-svc', animated: true, label: '800/s', style: { stroke: '#ffd591' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-gw-payment', source: 'gateway', target: 'payment-svc', animated: true, label: '300/s', style: { stroke: '#b7eb8f' }, markerEnd: { type: MarkerType.ArrowClosed } },

    // 服务 → 服务
    { id: 'e-order-payment', source: 'order-svc', target: 'payment-svc', label: '200/s', style: { stroke: '#91caff' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-order-notify', source: 'order-svc', target: 'notify-svc', label: '150/s', style: { stroke: '#91caff' }, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e-payment-notify', source: 'payment-svc', target: 'notify-svc', label: '100/s', style: { stroke: '#91caff' }, markerEnd: { type: MarkerType.ArrowClosed } },

    // 服务 → 数据
    { id: 'e-user-pg', source: 'user-svc', target: 'postgres', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
    { id: 'e-order-pg', source: 'order-svc', target: 'postgres', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
    { id: 'e-user-redis', source: 'user-svc', target: 'redis', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
    { id: 'e-order-redis', source: 'order-svc', target: 'redis', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
    { id: 'e-order-kafka', source: 'order-svc', target: 'kafka', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
    { id: 'e-notify-kafka', source: 'notify-svc', target: 'kafka', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
    { id: 'e-notify-minio', source: 'notify-svc', target: 'minio', style: { stroke: '#ffd591', strokeDasharray: '5 5' } },
  ], [])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div style={{ width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0', ...style }}>
      {/* 图例 — 独立区域，不遮挡画布 */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        padding: '8px 12px',
        background: '#fafafa', borderBottom: '1px solid #f0f0f0',
      }}>
        <Text style={{ fontSize: 13, fontWeight: 500, marginRight: 4 }}>图例：</Text>
        {Object.entries({ client: '客户端层', gateway: 'API网关层', service: '业务服务层', data: '数据存储层' }).map(([key, label]) => (
          <Tag key={key} style={{ borderColor: layerColors[key].border, color: layerColors[key].text, background: layerColors[key].bg }}>
            {label}
          </Tag>
        ))}
        <Tag><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#52c41a', marginRight: 4 }} />正常</Tag>
        <Tag><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#faad14', marginRight: 4 }} />警告</Tag>
      </div>

      {/* 拓扑画布 */}
      <div style={{ height: 520 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#aaa" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const layer = node.data?.layer || 'service'
            return layerColors[layer]?.border || '#ccc'
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
      </div>
    </div>
  )
}
