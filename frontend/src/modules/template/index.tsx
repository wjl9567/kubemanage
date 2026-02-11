import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, Tabs, message, Popconfirm, Drawer } from 'antd'
import { FileTextOutlined, PlusOutlined, ReloadOutlined, CopyOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import YamlEditor from '@/components/YamlEditor'

const { Title } = Typography

const mockTemplates = [
  { id: 1, name: 'web-deployment', display_name: 'Web 应用 Deployment', type: 'deployment', category: 'production', description: '标准 Web 应用部署模板，含资源限制和健康检查', version: 1, tags: 'web,nginx,frontend', enabled: true, created_by: 'admin' },
  { id: 2, name: 'api-service', display_name: 'API 服务模板', type: 'deployment', category: 'production', description: 'RESTful API 服务模板，含 HPA 配置', version: 3, tags: 'api,backend,go', enabled: true, created_by: 'admin' },
  { id: 3, name: 'redis-config', display_name: 'Redis ConfigMap', type: 'configmap', category: 'general', description: 'Redis 标准配置模板', version: 1, tags: 'redis,cache', enabled: true, created_by: 'admin' },
  { id: 4, name: 'tls-secret', display_name: 'TLS 证书 Secret', type: 'secret', category: 'production', description: 'HTTPS TLS 证书模板', version: 1, tags: 'tls,https,cert', enabled: true, created_by: 'admin' },
  { id: 5, name: 'web-ingress', display_name: 'Web Ingress 规则', type: 'ingress', category: 'production', description: 'Nginx Ingress 路由规则模板', version: 2, tags: 'ingress,nginx,route', enabled: true, created_by: 'admin' },
  { id: 6, name: 'test-deployment', display_name: '测试环境 Deployment', type: 'deployment', category: 'testing', description: '测试环境轻量部署模板，资源限制较低', version: 1, tags: 'test,dev', enabled: false, created_by: 'developer' },
]

export default function TemplateManagement() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [yamlContent, setYamlContent] = useState('')
  const [form] = Form.useForm()

  const typeColor: Record<string, string> = { deployment: 'blue', configmap: 'green', secret: 'red', ingress: 'purple', service: 'orange' }
  const categoryColor: Record<string, string> = { production: 'green', testing: 'orange', general: 'default' }
  const categoryLabel: Record<string, string> = { production: '生产', testing: '测试', general: '通用' }

  const columns = [
    { title: '模板名称', dataIndex: 'display_name', key: 'display_name', render: (v: string, r: any) => <Space><FileTextOutlined style={{ color: '#1677ff' }} /><strong>{v}</strong></Space> },
    { title: '类型', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={typeColor[v] || 'default'}>{v}</Tag> },
    { title: '分类', dataIndex: 'category', key: 'category', render: (v: string) => <Tag color={categoryColor[v]}>{categoryLabel[v] || v}</Tag> },
    { title: '版本', dataIndex: 'version', key: 'version', render: (v: number) => <Tag>v{v}</Tag> },
    { title: '标签', dataIndex: 'tags', key: 'tags', render: (v: string) => v?.split(',').map((t, i) => <Tag key={i} style={{ fontSize: 10 }}>{t}</Tag>) },
    { title: '状态', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '启用' : '禁用'}</Tag> },
    {
      title: '操作', key: 'action', width: 220,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => setSelected(r)}>查看</Button>
          <Button size="small" icon={<CopyOutlined />} onClick={() => message.success('模板已复制')}>复制</Button>
          <Popconfirm title="确认删除?" onConfirm={() => message.success('已删除')}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><FileTextOutlined /> 模板管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建模板</Button>
        </Space>
      </div>

      <Card>
        <Table columns={columns} dataSource={mockTemplates} rowKey="id" size="small" />
      </Card>

      {/* 创建模板弹窗 */}
      <Modal title="创建资源模板" open={createOpen} onCancel={() => setCreateOpen(false)} width={900}
        onOk={() => { message.success('模板创建成功'); setCreateOpen(false) }}>
        <Tabs items={[
          {
            key: 'form', label: '基本信息',
            children: (
              <Form form={form} layout="vertical">
                <Form.Item name="name" label="模板名称" rules={[{ required: true }]}><Input placeholder="如 web-deployment" /></Form.Item>
                <Form.Item name="display_name" label="显示名称"><Input placeholder="如 Web 应用 Deployment" /></Form.Item>
                <Form.Item name="type" label="资源类型" rules={[{ required: true }]}>
                  <Select options={[{ value: 'deployment', label: 'Deployment' }, { value: 'configmap', label: 'ConfigMap' }, { value: 'secret', label: 'Secret' }, { value: 'ingress', label: 'Ingress' }, { value: 'service', label: 'Service' }]} />
                </Form.Item>
                <Form.Item name="category" label="分类"><Select options={[{ value: 'production', label: '生产' }, { value: 'testing', label: '测试' }, { value: 'general', label: '通用' }]} /></Form.Item>
                <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
                <Form.Item name="tags" label="标签"><Input placeholder="逗号分隔，如 web,nginx" /></Form.Item>
              </Form>
            ),
          },
          {
            key: 'yaml', label: 'YAML 内容',
            children: <YamlEditor value={yamlContent} onChange={setYamlContent} height={400} title="模板 YAML" />,
          },
        ]} />
      </Modal>

      {/* 模板详情 */}
      <Drawer title={`模板详情 - ${selected?.display_name || ''}`} open={!!selected} onClose={() => setSelected(null)} width={700}>
        {selected && (
          <Tabs items={[
            {
              key: 'info', label: '基本信息',
              children: (
                <Card size="small">
                  <p><strong>名称：</strong>{selected.display_name}</p>
                  <p><strong>标识：</strong>{selected.name}</p>
                  <p><strong>类型：</strong><Tag color={typeColor[selected.type]}>{selected.type}</Tag></p>
                  <p><strong>分类：</strong><Tag color={categoryColor[selected.category]}>{categoryLabel[selected.category]}</Tag></p>
                  <p><strong>版本：</strong>v{selected.version}</p>
                  <p><strong>描述：</strong>{selected.description}</p>
                  <p><strong>创建者：</strong>{selected.created_by}</p>
                </Card>
              ),
            },
            {
              key: 'yaml', label: 'YAML',
              children: <YamlEditor readOnly height={400} title={selected.name + '.yaml'} />,
            },
          ]} />
        )}
      </Drawer>
    </div>
  )
}
