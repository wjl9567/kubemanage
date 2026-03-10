import React, { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, Button, Switch, Select, Typography, Descriptions, Table, Tag, Space, message } from 'antd'
import { SettingOutlined, UserOutlined, SafetyOutlined, DatabaseOutlined, BellOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { authApi, auditApi, systemApi, alertChannelApi, backupApi } from '@/services/api'

const { Title, Text } = Typography

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [configForm] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditApi.list({ page: 1, page_size: 20 }),
  })
  const auditList = (auditData as any)?.data?.list ?? []
  const auditColumns = [
    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
    { title: '操作人', dataIndex: 'username', key: 'username' },
    { title: '操作', dataIndex: 'action', key: 'action', render: (v: string) => <Tag>{v}</Tag> },
    { title: '资源', dataIndex: 'resource', key: 'resource' },
    { title: '结果', dataIndex: 'result', key: 'result', render: (v: string) => <Tag color={v === 'success' ? 'success' : 'error'}>{v === 'success' ? '成功' : '失败'}</Tag> },
    { title: 'IP', dataIndex: 'ip', key: 'ip' },
  ]

  const { data: systemConfig } = useQuery({ queryKey: ['system-config'], queryFn: () => systemApi.get() })
  const configData = (systemConfig as any)?.data ?? {}
  useEffect(() => {
    if (Object.keys(configData).length) configForm.setFieldsValue({ platform_name: configData.platform_name || 'KubeManage', collect_interval: configData.collect_interval || '30', retention_days: configData.retention_days || '30', cpu_threshold: configData.cpu_threshold || '80', memory_threshold: configData.memory_threshold || '85' })
  }, [configData, configForm])
  const { data: channelsData } = useQuery({ queryKey: ['alert-channels'], queryFn: () => alertChannelApi.list() })
  const channelsList = (channelsData as any)?.data?.list ?? []
  const { data: backupsData, refetch: refetchBackups } = useQuery({ queryKey: ['backups'], queryFn: () => backupApi.list() })
  const backupsList = (backupsData as any)?.data?.list ?? []

  const backupCreateMut = useMutation({
    mutationFn: (scope?: string) => backupApi.create({ scope }),
    onSuccess: () => { message.success('备份任务已创建'); queryClient.invalidateQueries({ queryKey: ['backups'] }) },
    onError: (e: any) => message.error(e?.message || '创建失败'),
  })
  const configUpdateMut = useMutation({
    mutationFn: (v: Record<string, string>) => systemApi.update(v),
    onSuccess: () => { message.success('配置已保存'); queryClient.invalidateQueries({ queryKey: ['system-config'] }) },
    onError: (e: any) => message.error(e?.message || '保存失败'),
  })

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
                onFinish={async (v: { old_password: string; new_password: string; confirm: string }) => {
                  if (v.new_password !== v.confirm) {
                    message.error('两次输入的新密码不一致')
                    return
                  }
                  setPasswordLoading(true)
                  try {
                    await authApi.updatePassword({ old_password: v.old_password, new_password: v.new_password })
                    message.success('密码修改成功，请重新登录')
                    useAuthStore.getState().logout()
                    window.location.href = '/login'
                  } catch (e: any) {
                    message.error(e?.response?.data?.message || e?.message || '修改失败')
                  } finally {
                    setPasswordLoading(false)
                  }
                }}>
                <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}><Input.Password /></Form.Item>
                <Form.Item name="new_password" label="新密码" rules={[{ required: true, min: 6, message: '至少 6 位' }]}><Input.Password /></Form.Item>
                <Form.Item name="confirm" label="确认密码" dependencies={['new_password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('new_password') === value) return Promise.resolve(); return Promise.reject(new Error('两次输入不一致')) } })]}><Input.Password /></Form.Item>
                <Button type="primary" htmlType="submit" loading={passwordLoading}>修改密码</Button>
              </Form>
            </Card>
          ),
        },
        {
          key: 'global', label: <Space><SettingOutlined />全局配置</Space>,
          children: (
            <Card>
              <Form form={configForm} layout="vertical" style={{ maxWidth: 600 }}
                onFinish={(v) => configUpdateMut.mutate({ platform_name: v.platform_name, collect_interval: v.collect_interval, retention_days: v.retention_days, cpu_threshold: v.cpu_threshold, memory_threshold: v.memory_threshold })}>
                <Form.Item name="platform_name" label="平台名称"><Input /></Form.Item>
                <Form.Item name="collect_interval" label="数据采集频率">
                  <Select options={[{ value: '15', label: '15秒' }, { value: '30', label: '30秒' }, { value: '60', label: '60秒' }]} />
                </Form.Item>
                <Form.Item name="retention_days" label="数据保留周期">
                  <Select options={[{ value: '7', label: '7天' }, { value: '30', label: '30天' }, { value: '90', label: '90天' }]} />
                </Form.Item>
                <Form.Item name="cpu_threshold" label="告警阈值 - CPU"><Input addonAfter="%" /></Form.Item>
                <Form.Item name="memory_threshold" label="告警阈值 - 内存"><Input addonAfter="%" /></Form.Item>
                <Button type="primary" htmlType="submit" loading={configUpdateMut.isPending}>保存配置</Button>
              </Form>
            </Card>
          ),
        },
        {
          key: 'alert-channels', label: <Space><BellOutlined />告警渠道</Space>,
          children: (
            <Card>
              <Table size="small" dataSource={channelsList} rowKey="id" columns={[
                { title: '名称', dataIndex: 'name', key: 'name' },
                { title: '类型', dataIndex: 'type', key: 'type' },
                { title: '启用', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '是' : '否'}</Tag> },
              ]} pagination={false} />
              <Text type="secondary">告警渠道由管理员在 API 或后续版本中配置</Text>
            </Card>
          ),
        },
        {
          key: 'audit', label: <Space><SafetyOutlined />操作审计</Space>,
          children: (
            <Card>
              <Table columns={auditColumns} dataSource={auditList.map((r: any) => ({ ...r, key: r.id }))} size="small" loading={auditLoading} pagination={{ pageSize: 20, total: (auditData as any)?.data?.total ?? 0 }} />
            </Card>
          ),
        },
        {
          key: 'backup', label: <Space><DatabaseOutlined />数据备份</Space>,
          children: (
            <Card>
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={5}>手动备份</Title>
                  <Space>
                    <Button type="primary" onClick={() => backupCreateMut.mutate('full')} loading={backupCreateMut.isPending}>全量备份</Button>
                    <Button onClick={() => backupCreateMut.mutate('incremental')} loading={backupCreateMut.isPending}>增量备份</Button>
                  </Space>
                </div>
                <div>
                  <Title level={5}>备份记录</Title>
                  <Table size="small" dataSource={backupsList.map((r: any) => ({ ...r, key: r.id }))} columns={[
                    { title: '名称', dataIndex: 'name', key: 'name' },
                    { title: '类型', dataIndex: 'type', key: 'type' },
                    { title: '范围', dataIndex: 'scope', key: 'scope' },
                    { title: '大小', dataIndex: 'size', key: 'size', render: (v: number) => v ? (v < 1024 ? v + ' B' : (v < 1024 * 1024 ? (v / 1024).toFixed(1) + ' KB' : (v / (1024 * 1024)).toFixed(1) + ' MB')) : '-' },
                    { title: '时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
                    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'success' ? 'success' : v === 'failed' ? 'error' : 'default'}>{v}</Tag> },
                    { title: '操作', key: 'action', render: (_: any, r: any) => r.file_path ? <Button type="link" size="small" onClick={() => { backupApi.download(r.id).then((blob: any) => { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = r.name + (r.file_path?.endsWith('.sql') ? '.sql' : '.db') || 'backup'; a.click(); URL.revokeObjectURL(u); }).catch(() => message.error('下载失败')) }}>下载</Button> : '-' },
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
