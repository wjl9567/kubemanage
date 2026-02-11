import React from 'react'
import { Card, Tabs, Form, Input, Button, Switch, Select, Typography, Descriptions, Table, Tag, Space, message } from 'antd'
import { SettingOutlined, UserOutlined, SafetyOutlined, DatabaseOutlined, BellOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'

const { Title, Text } = Typography

export default function Settings() {
  const user = useAuthStore((s) => s.user)

  // 审计日志（模拟数据）
  const auditLogs = [
    { key: 1, time: '2026-02-11 10:30:15', user: 'admin', action: '删除', resource: 'Pod', name: 'test-pod-abc', result: '成功', ip: '192.168.1.100' },
    { key: 2, time: '2026-02-11 10:28:45', user: 'admin', action: '扩缩容', resource: 'Deployment', name: 'web-frontend', result: '成功', ip: '192.168.1.100' },
    { key: 3, time: '2026-02-11 10:25:30', user: 'operator', action: '修改', resource: 'ConfigMap', name: 'app-config', result: '成功', ip: '192.168.1.101' },
    { key: 4, time: '2026-02-11 10:20:10', user: 'admin', action: '创建', resource: 'Secret', name: 'tls-cert', result: '成功', ip: '192.168.1.100' },
  ]

  const auditColumns = [
    { title: '时间', dataIndex: 'time', key: 'time' },
    { title: '操作人', dataIndex: 'user', key: 'user' },
    { title: '操作', dataIndex: 'action', key: 'action', render: (v: string) => <Tag color={v === '删除' ? 'red' : v === '创建' ? 'green' : 'blue'}>{v}</Tag> },
    { title: '资源类型', dataIndex: 'resource', key: 'resource' },
    { title: '资源名称', dataIndex: 'name', key: 'name' },
    { title: '结果', dataIndex: 'result', key: 'result', render: (v: string) => <Tag color={v === '成功' ? 'success' : 'error'}>{v}</Tag> },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}><SettingOutlined /> 系统设置</Title>

      <Tabs items={[
        {
          key: 'profile', label: <Space><UserOutlined />个人信息</Space>,
          children: (
            <Card>
              <Descriptions column={2} bordered>
                <Descriptions.Item label="用户名">{user?.username}</Descriptions.Item>
                <Descriptions.Item label="昵称">{user?.nickname}</Descriptions.Item>
                <Descriptions.Item label="角色"><Tag color="blue">{user?.role}</Tag></Descriptions.Item>
                <Descriptions.Item label="邮箱">{user?.email || '-'}</Descriptions.Item>
              </Descriptions>
              <Title level={5} style={{ marginTop: 24 }}>修改密码</Title>
              <Form layout="vertical" style={{ maxWidth: 400 }}
                onFinish={() => message.success('密码修改成功')}>
                <Form.Item name="old_password" label="当前密码" rules={[{ required: true }]}><Input.Password /></Form.Item>
                <Form.Item name="new_password" label="新密码" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
                <Form.Item name="confirm" label="确认密码" rules={[{ required: true }]}><Input.Password /></Form.Item>
                <Button type="primary" htmlType="submit">修改密码</Button>
              </Form>
            </Card>
          ),
        },
        {
          key: 'global', label: <Space><SettingOutlined />全局配置</Space>,
          children: (
            <Card>
              <Form layout="vertical" style={{ maxWidth: 600 }}>
                <Form.Item label="平台名称"><Input defaultValue="KubeManage" /></Form.Item>
                <Form.Item label="数据采集频率">
                  <Select defaultValue="30" options={[{ value: '15', label: '15秒' }, { value: '30', label: '30秒' }, { value: '60', label: '60秒' }]} />
                </Form.Item>
                <Form.Item label="数据保留周期">
                  <Select defaultValue="30" options={[{ value: '7', label: '7天' }, { value: '30', label: '30天' }, { value: '90', label: '90天' }]} />
                </Form.Item>
                <Form.Item label="告警阈值 - CPU"><Input defaultValue="80" suffix="%" /></Form.Item>
                <Form.Item label="告警阈值 - 内存"><Input defaultValue="85" suffix="%" /></Form.Item>
                <Form.Item label="暗黑模式"><Switch /></Form.Item>
                <Button type="primary">保存配置</Button>
              </Form>
            </Card>
          ),
        },
        {
          key: 'alert-channels', label: <Space><BellOutlined />告警渠道</Space>,
          children: (
            <Card>
              <Form layout="vertical" style={{ maxWidth: 600 }}>
                <Title level={5}>邮件通知</Title>
                <Form.Item label="SMTP服务器"><Input placeholder="smtp.example.com" /></Form.Item>
                <Form.Item label="端口"><Input placeholder="465" /></Form.Item>
                <Form.Item label="发件人邮箱"><Input placeholder="alert@example.com" /></Form.Item>
                <Form.Item label="启用"><Switch defaultChecked /></Form.Item>
                <Title level={5}>钉钉机器人</Title>
                <Form.Item label="Webhook URL"><Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." /></Form.Item>
                <Form.Item label="启用"><Switch /></Form.Item>
                <Title level={5}>企业微信</Title>
                <Form.Item label="Webhook URL"><Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." /></Form.Item>
                <Form.Item label="启用"><Switch /></Form.Item>
                <Button type="primary">保存配置</Button>
              </Form>
            </Card>
          ),
        },
        {
          key: 'audit', label: <Space><SafetyOutlined />操作审计</Space>,
          children: (
            <Card>
              <Table columns={auditColumns} dataSource={auditLogs} size="small" pagination={{ pageSize: 20 }} />
            </Card>
          ),
        },
        {
          key: 'backup', label: <Space><DatabaseOutlined />数据备份</Space>,
          children: (
            <Card>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={5}>自动备份</Title>
                  <Form layout="inline">
                    <Form.Item label="备份周期"><Select defaultValue="12h" options={[{ value: '6h', label: '6小时' }, { value: '12h', label: '12小时' }, { value: '24h', label: '24小时' }]} /></Form.Item>
                    <Form.Item label="保留天数"><Select defaultValue="30" options={[{ value: '7', label: '7天' }, { value: '30', label: '30天' }, { value: '90', label: '90天' }]} /></Form.Item>
                    <Form.Item><Switch defaultChecked /> 启用</Form.Item>
                  </Form>
                </div>
                <div>
                  <Title level={5}>手动备份</Title>
                  <Space>
                    <Button type="primary" onClick={() => message.success('备份任务已创建')}>全量备份</Button>
                    <Button onClick={() => message.success('增量备份任务已创建')}>增量备份</Button>
                  </Space>
                </div>
                <div>
                  <Title level={5}>备份记录</Title>
                  <Table size="small" dataSource={[
                    { key: 1, name: 'backup-20260211-103000.tar.gz', type: '自动', time: '2026-02-11 10:30', size: '125MB', status: '成功' },
                    { key: 2, name: 'backup-20260210-223000.tar.gz', type: '自动', time: '2026-02-10 22:30', size: '123MB', status: '成功' },
                  ]} columns={[
                    { title: '文件名', dataIndex: 'name', key: 'name' },
                    { title: '类型', dataIndex: 'type', key: 'type' },
                    { title: '时间', dataIndex: 'time', key: 'time' },
                    { title: '大小', dataIndex: 'size', key: 'size' },
                    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color="success">{v}</Tag> },
                    { title: '操作', key: 'action', render: () => <Space><Button size="small">下载</Button><Button size="small">恢复</Button></Space> },
                  ]} pagination={false} />
                </div>
              </Space>
            </Card>
          ),
        },
      ]} />
    </div>
  )
}
