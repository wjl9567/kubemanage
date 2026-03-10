import React, { useEffect } from 'react'
import { Form, Input, Button, Card, Typography, message, Space, Alert } from 'antd'
import { UserOutlined, LockOutlined, ClusterOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const { Title, Text } = Typography

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = React.useState(false)
  const [expiredHint, setExpiredHint] = React.useState(false)
  useEffect(() => {
    if (sessionStorage.getItem('kubemanage_login_expired')) {
      sessionStorage.removeItem('kubemanage_login_expired')
      setExpiredHint(true)
      message.warning('登录已过期，请重新登录')
    }
  }, [])

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res: any = await authApi.login(values)
      setAuth(res.data.token, res.data.user_info)
      message.success('登录成功')
      navigate('/')
    } catch (err: any) {
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <ClusterOutlined style={{ fontSize: 48, color: '#1677ff' }} />
            <Title level={3} style={{ margin: '12px 0 4px' }}>KubeManage</Title>
            <Text type="secondary">企业级 Kubernetes 可视化管理平台</Text>
          </div>

          {expiredHint && <Alert type="warning" message="登录已过期，请重新登录" showIcon style={{ marginBottom: 16 }} />}
          <Form onFinish={onFinish} size="large" style={{ textAlign: 'left' }}>
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" autoFocus />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                登 录
              </Button>
            </Form.Item>
          </Form>

          <Text type="secondary" style={{ fontSize: 12 }}>
            默认管理员: admin / admin123
          </Text>
        </Space>
      </Card>

      {/* 版本号 */}
      <div style={{
        position: 'fixed', bottom: 24, left: 0, right: 0,
        textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13,
        letterSpacing: 1, userSelect: 'none',
      }}>
        KubeManage-v1.0
      </div>
    </div>
  )
}
