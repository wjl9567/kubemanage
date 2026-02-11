import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Select, Popconfirm, message, Drawer, Descriptions } from 'antd'
import { KeyOutlined, ReloadOutlined, DeleteOutlined, EyeOutlined, LockOutlined } from '@ant-design/icons'
import { useQuery, useMutation } from '@tanstack/react-query'
import { configApi } from '@/services/api'

const { Title, Text } = Typography

export default function Secrets() {
  const [namespace, setNamespace] = useState('default')
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading, refetch } = useQuery({ queryKey: ['secrets', namespace], queryFn: () => configApi.listSecrets({ namespace }) })
  const { data: detailData } = useQuery({ queryKey: ['secret-detail', selected?.name, selected?.namespace], queryFn: () => configApi.getSecret(selected?.name, selected?.namespace), enabled: !!selected })
  const deleteMut = useMutation({ mutationFn: ({ name, ns }: any) => configApi.deleteSecret(name, ns), onSuccess: () => { message.success('已删除'); refetch() } })

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <Space><KeyOutlined style={{ color: '#eb2f96' }} /><strong>{v}</strong></Space> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '数据条目', dataIndex: 'data_count', key: 'data_count' },
    { title: '操作', key: 'action', render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>查看</Button>
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate({ name: r.name, ns: r.namespace })}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  const detail = (detailData as any)?.data

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Secrets <LockOutlined /></Title>
        <Space>
          <Select value={namespace} style={{ width: 200 }} onChange={setNamespace} options={[{ value: 'default', label: 'default' }, { value: 'kube-system', label: 'kube-system' }]} />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
        </Space>
      </div>
      <Card><Table columns={columns} dataSource={(data as any)?.data?.list || []} loading={isLoading} rowKey="name" /></Card>

      <Drawer title={`Secret - ${selected?.name}`} open={!!selected} onClose={() => setSelected(null)} width={500}>
        {detail && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="命名空间">{detail.namespace}</Descriptions.Item>
              <Descriptions.Item label="类型">{detail.type}</Descriptions.Item>
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>数据 (已脱敏)</Title>
            {detail.data && Object.entries(detail.data).map(([k, v]) => (
              <div key={k} style={{ padding: '4px 0' }}>
                <Text strong>{k}:</Text> <Tag><LockOutlined /> {v as string}</Tag>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
