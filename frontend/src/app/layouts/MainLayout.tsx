import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Layout, Menu, Avatar, Dropdown, Space, Badge, Select, Switch, Typography, Button, Input, Tooltip,
} from 'antd'
import {
  DashboardOutlined, ClusterOutlined, NodeIndexOutlined, AppstoreOutlined,
  ContainerOutlined, FileTextOutlined, DatabaseOutlined, ApiOutlined,
  AlertOutlined, FileSearchOutlined, SettingOutlined, MenuFoldOutlined,
  MenuUnfoldOutlined, BellOutlined, SearchOutlined, UserOutlined,
  LogoutOutlined, MoonOutlined, SunOutlined, CloudServerOutlined,
  KeyOutlined, HddOutlined, ShareAltOutlined, GatewayOutlined, CodeOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const { Header, Sider, Content, Footer } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/overview', icon: <DashboardOutlined />, label: '集群总览' },
  { key: '/clusters', icon: <CloudServerOutlined />, label: '多集群管理' },
  { key: '/nodes', icon: <NodeIndexOutlined />, label: '节点管理' },
  {
    key: 'workloads', icon: <AppstoreOutlined />, label: '工作负载',
    children: [
      { key: '/workloads/deployments', icon: <ContainerOutlined />, label: 'Deployments' },
      { key: '/workloads/statefulsets', icon: <ContainerOutlined />, label: 'StatefulSets' },
      { key: '/workloads/daemonsets', icon: <ContainerOutlined />, label: 'DaemonSets' },
      { key: '/workloads/pods', icon: <ContainerOutlined />, label: 'Pods' },
    ],
  },
  {
    key: 'config', icon: <FileTextOutlined />, label: '配置管理',
    children: [
      { key: '/config/configmaps', icon: <FileTextOutlined />, label: 'ConfigMaps' },
      { key: '/config/secrets', icon: <KeyOutlined />, label: 'Secrets' },
    ],
  },
  {
    key: 'storage', icon: <DatabaseOutlined />, label: '存储管理',
    children: [
      { key: '/storage/classes', icon: <HddOutlined />, label: '存储类' },
      { key: '/storage/pvcs', icon: <DatabaseOutlined />, label: 'PVC' },
    ],
  },
  {
    key: 'network', icon: <ApiOutlined />, label: '网络资源',
    children: [
      { key: '/network/services', icon: <ShareAltOutlined />, label: 'Services' },
      { key: '/network/ingresses', icon: <GatewayOutlined />, label: 'Ingresses' },
    ],
  },
  { key: '/crd', icon: <CodeOutlined />, label: 'CRD 管理' },
  { key: '/monitor', icon: <AlertOutlined />, label: '监控告警' },
  { key: '/logging', icon: <FileSearchOutlined />, label: '日志分析' },
  { key: '/templates', icon: <FileTextOutlined />, label: '模板管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { isDark, collapsed, toggleTheme, toggleCollapsed } = useThemeStore()
  const [searchVisible, setSearchVisible] = useState(false)

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) navigate(key)
  }

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
      { key: 'settings', icon: <SettingOutlined />, label: '系统设置', onClick: () => navigate('/settings') },
      { type: 'divider' as const },
      {
        key: 'logout', icon: <LogoutOutlined />, label: '退出登录',
        onClick: () => { logout(); navigate('/login') },
      },
    ],
  }

  // 找到当前选中的菜单
  const selectedKeys = [location.pathname]
  const openKeys = menuItems
    .filter((item) => 'children' in item && item.children?.some((c) => location.pathname.startsWith(c.key)))
    .map((item) => item.key)

  return (
    <Layout className="main-layout" style={{ minHeight: '100vh' }}>
      {/* 左侧导航 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={toggleCollapsed}
        trigger={null}
        width={220}
        theme={isDark ? 'dark' : 'light'}
        style={{
          borderRight: isDark ? '1px solid #303030' : '1px solid #f0f0f0',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: isDark ? '1px solid #303030' : '1px solid #f0f0f0',
          gap: 8, padding: '0 16px',
        }}>
          <ClusterOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          {!collapsed && (
            <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>KubeManage</Text>
          )}
        </div>

        {/* 菜单 */}
        <Menu
          mode="inline"
          theme={isDark ? 'dark' : 'light'}
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 220, transition: 'margin-left 0.2s' }}>
        {/* 顶部导航栏 */}
        <Header style={{
          padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isDark ? '#141414' : '#fff',
          borderBottom: isDark ? '1px solid #303030' : '1px solid #f0f0f0',
          height: 56, lineHeight: '56px', position: 'sticky', top: 0, zIndex: 100,
        }}>
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleCollapsed}
            />
            {searchVisible ? (
              <Input
                placeholder="全局搜索资源..."
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                onBlur={() => setSearchVisible(false)}
                autoFocus
              />
            ) : (
              <Button type="text" icon={<SearchOutlined />} onClick={() => setSearchVisible(true)}>
                搜索
              </Button>
            )}
          </Space>

          <Space size="middle">
            {/* 集群切换 */}
            <Select
              placeholder="选择集群"
              style={{ width: 180 }}
              size="small"
              options={[{ value: 1, label: '默认集群' }]}
            />

            {/* 主题切换 */}
            <Tooltip title={isDark ? '切换亮色模式' : '切换暗黑模式'}>
              <Button
                type="text"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
              />
            </Tooltip>

            {/* 告警通知 */}
            <Badge count={3} size="small">
              <Button type="text" icon={<BellOutlined />} />
            </Badge>

            {/* 用户 */}
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <Text>{user?.nickname || user?.username || '用户'}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 主内容区 */}
        <Content style={{
          padding: 20,
          minHeight: 'calc(100vh - 56px - 48px)',
          background: isDark ? '#000' : '#f5f5f5',
        }}>
          {children}
        </Content>

        {/* 底部状态栏 */}
        <Footer style={{
          padding: '8px 24px', textAlign: 'center', height: 48,
          background: isDark ? '#141414' : '#fff',
          borderTop: isDark ? '1px solid #303030' : '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: '#999',
        }}>
          <Space>
            <span style={{ color: '#52c41a' }}>●</span>
            <span>平台运行正常</span>
          </Space>
          <span>KubeManage v1.0.0 | Kubernetes 管理平台</span>
          <span>数据更新: {new Date().toLocaleTimeString()}</span>
        </Footer>
      </Layout>
    </Layout>
  )
}
