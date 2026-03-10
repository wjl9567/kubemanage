import React, { useState, useEffect } from 'react'
import { Card, Tabs, Form, Input, Button, Switch, Select, Typography, Descriptions, Table, Tag, Space, message, Modal, Checkbox } from 'antd'
import { SettingOutlined, UserOutlined, SafetyOutlined, DatabaseOutlined, BellOutlined, TeamOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth'
import { authApi, auditApi, systemApi, alertChannelApi, backupApi, clusterApi, namespaceApi } from '@/services/api'

const { Title, Text } = Typography

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [configForm] = Form.useForm()
  const queryClient = useQueryClient()
  const [authModalUser, setAuthModalUser] = useState<{ id: number; username: string } | null>(null)
  const [authClusterIds, setAuthClusterIds] = useState<number[]>([])
  const [authNsClusterId, setAuthNsClusterId] = useState<number | null>(null)
  const [authNsList, setAuthNsList] = useState<string[]>([])

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

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => authApi.listUsers(),
    enabled: user?.role === 'admin',
  })
  const usersList = (usersData as any)?.data?.list ?? (usersData as any)?.list ?? []
  const { data: clustersData } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => clusterApi.list(),
    enabled: !!authModalUser,
  })
  const clustersList = (clustersData as any)?.data?.list ?? (clustersData as any)?.list ?? []
  const { data: userClustersData } = useQuery({
    queryKey: ['user-clusters', authModalUser?.id],
    queryFn: () => authApi.listUserClusters(authModalUser!.id),
    enabled: !!authModalUser?.id,
  })
  const userClusterIds: number[] = (userClustersData as any)?.data?.cluster_ids ?? (userClustersData as any)?.cluster_ids ?? []
  const { data: nsByClusterData } = useQuery({
    queryKey: ['namespaces-by-cluster', authNsClusterId],
    queryFn: () => namespaceApi.listByCluster(authNsClusterId!),
    enabled: !!authNsClusterId,
  })
  const nsOptionsByCluster = ((nsByClusterData as any)?.data?.list ?? (nsByClusterData as any)?.list ?? []).map((n: any) => ({ label: n.name, value: n.name }))
  const { data: userNsData } = useQuery({
    queryKey: ['user-namespaces', authModalUser?.id, authNsClusterId],
    queryFn: () => authApi.listUserNamespaces(authModalUser!.id, authNsClusterId!),
    enabled: !!authModalUser?.id && !!authNsClusterId,
  })
  const userNsList: string[] = (userNsData as any)?.data?.namespaces ?? (userNsData as any)?.namespaces ?? []

  useEffect(() => {
    if (authModalUser) setAuthClusterIds(userClusterIds)
  }, [authModalUser, userClusterIds])
  useEffect(() => {
    if (authNsClusterId != null) setAuthNsList(userNsList)
  }, [authNsClusterId, userNsList])
  useEffect(() => {
    if (!authModalUser) { setAuthNsClusterId(null); setAuthNsList([]) }
  }, [authModalUser])

  const setUserClustersMut = useMutation({
    mutationFn: ({ userId, ids }: { userId: number; ids: number[] }) => authApi.setUserClusters(userId, ids),
    onSuccess: () => { message.success('集群授权已保存'); queryClient.invalidateQueries({ queryKey: ['user-clusters', authModalUser?.id] }) },
    onError: (e: any) => message.error(e?.message || '保存失败'),
  })
  const setUserNamespacesMut = useMutation({
    mutationFn: ({ userId, clusterId, ns }: { userId: number; clusterId: number; ns: string[] }) => authApi.setUserNamespaces(userId, clusterId, ns),
    onSuccess: () => { message.success('命名空间授权已保存'); queryClient.invalidateQueries({ queryKey: ['user-namespaces', authModalUser?.id, authNsClusterId] }) },
    onError: (e: any) => message.error(e?.message || '保存失败'),
  })

  const openAuthModal = (u: any) => {
    setAuthModalUser({ id: u.id, username: u.username })
    setAuthNsClusterId(null)
    setAuthNsList([])
  }
  const saveUserClusters = () => {
    if (!authModalUser) return
    setUserClustersMut.mutate({ userId: authModalUser.id, ids: authClusterIds })
  }
  const saveUserNamespaces = () => {
    if (!authModalUser || authNsClusterId == null) return
    setUserNamespacesMut.mutate({ userId: authModalUser.id, clusterId: authNsClusterId, ns: authNsList })
  }

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
        ...(user?.role === 'admin' ? [{
          key: 'users', label: <Space><TeamOutlined />用户管理</Space>,
          children: (
            <Card>
              <Table size="small" dataSource={usersList.map((u: any) => ({ ...u, key: u.id }))} columns={[
                { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
                { title: '用户名', dataIndex: 'username', key: 'username' },
                { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
                { title: '角色', dataIndex: 'role', key: 'role', render: (v: string) => <Tag color="blue">{v}</Tag> },
                { title: '操作', key: 'action', render: (_: any, r: any) => <Button size="small" onClick={() => openAuthModal(r)}>授权</Button> },
              ]} pagination={{ pageSize: 15 }} />
              <Modal title={`授权 - ${authModalUser?.username || ''}`} open={!!authModalUser} onCancel={() => setAuthModalUser(null)} width={560} footer={null} destroyOnClose>
                {authModalUser && (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text strong>可访问集群</Text>
                      <div style={{ marginTop: 8 }}>
                        <Checkbox.Group value={authClusterIds} onChange={v => setAuthClusterIds(v as number[])} options={clustersList.map((c: any) => ({ label: c.display_name || c.name || `集群 ${c.id}`, value: c.id }))} />
                      </div>
                      <Button type="primary" size="small" style={{ marginTop: 8 }} onClick={saveUserClusters} loading={setUserClustersMut.isPending}>保存集群授权</Button>
                    </div>
                    <div>
                      <Text strong>按集群配置可访问命名空间</Text>
                      <Space style={{ marginTop: 8 }}>
                        <Select placeholder="选择集群" value={authNsClusterId ?? undefined} onChange={v => { setAuthNsClusterId(v); setAuthNsList([]) }} style={{ width: 200 }} options={clustersList.map((c: any) => ({ label: c.display_name || c.name || `集群 ${c.id}`, value: c.id }))} />
                        <Select mode="multiple" placeholder="选择命名空间" value={authNsList} onChange={setAuthNsList} style={{ minWidth: 220 }} options={nsOptionsByCluster} />
                        <Button type="primary" size="small" onClick={saveUserNamespaces} loading={setUserNamespacesMut.isPending} disabled={authNsClusterId == null}>保存该集群命名空间</Button>
                      </Space>
                      <div style={{ marginTop: 4 }}><Text type="secondary">不配置命名空间则默认可访问该集群下全部命名空间</Text></div>
                    </div>
                  </Space>
                )}
              </Modal>
            </Card>
          ),
        }] : []),
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
