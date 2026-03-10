import React, { useState } from 'react'
import { Card, Table, Tag, Button, Space, Typography, Tabs, Select, Drawer, message } from 'antd'
import { SafetyOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { rbacApi, namespaceApi } from '@/services/api'
import EditResourceModal from '@/components/EditResourceModal'

const { Title } = Typography

export default function RBACPage() {
  const [namespace, setNamespace] = useState<string>('')
  const [editKind, setEditKind] = useState<{ kind: string; apiVersion: string; name: string; namespace?: string } | null>(null)

  const { data: nsData } = useQuery({
    queryKey: ['namespaces'],
    queryFn: () => namespaceApi.list(),
  })
  const nsList = (nsData as any)?.data?.list ?? []
  const nsOptions = [{ value: '', label: '全部' }, ...nsList.map((n: any) => ({ value: n.name, label: n.name }))]

  const { data: rolesData, isLoading: rolesLoading, refetch: refetchRoles } = useQuery({
    queryKey: ['rbac-roles', namespace],
    queryFn: () => rbacApi.listRoles({ namespace }),
  })
  const { data: crData, isLoading: crLoading, refetch: refetchCR } = useQuery({
    queryKey: ['rbac-clusterroles'],
    queryFn: () => rbacApi.listClusterRoles(),
  })
  const { data: rbData, isLoading: rbLoading, refetch: refetchRB } = useQuery({
    queryKey: ['rbac-rolebindings', namespace],
    queryFn: () => rbacApi.listRoleBindings({ namespace }),
  })
  const { data: crbData, isLoading: crbLoading, refetch: refetchCRB } = useQuery({
    queryKey: ['rbac-clusterrolebindings'],
    queryFn: () => rbacApi.listClusterRoleBindings(),
  })

  const roles = (rolesData as any)?.data?.list ?? []
  const clusterRoles = (crData as any)?.data?.list ?? []
  const roleBindings = (rbData as any)?.data?.list ?? []
  const clusterRoleBindings = (crbData as any)?.data?.list ?? []

  const refetchAll = () => {
    refetchRoles()
    refetchCR()
    refetchRB()
    refetchCRB()
  }

  const roleColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: '规则数', dataIndex: 'rules_count', key: 'rules_count', render: (v: number) => <Tag color="blue">{v}</Tag> },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditKind({ kind: 'Role', apiVersion: 'rbac.authorization.k8s.io/v1', name: r.name, namespace: r.namespace })}>编辑 YAML</Button>
      ),
    },
  ]
  const crColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '规则数', dataIndex: 'rules_count', key: 'rules_count', render: (v: number) => <Tag color="blue">{v}</Tag> },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditKind({ kind: 'ClusterRole', apiVersion: 'rbac.authorization.k8s.io/v1', name: r.name })}>编辑 YAML</Button>
      ),
    },
  ]
  const rbColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '命名空间', dataIndex: 'namespace', key: 'namespace', render: (v: string) => <Tag>{v}</Tag> },
    { title: 'RoleRef', dataIndex: 'role_ref', key: 'role_ref', render: (v: any) => (v && (v.kind && v.name ? `${v.kind}/${v.name}` : typeof v === 'string' ? v : '-')) || '-' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditKind({ kind: 'RoleBinding', apiVersion: 'rbac.authorization.k8s.io/v1', name: r.name, namespace: r.namespace })}>编辑 YAML</Button>
      ),
    },
  ]
  const crbColumns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: 'ClusterRoleRef', dataIndex: 'role_ref', key: 'role_ref', render: (v: any) => (v && (v.kind && v.name ? `${v.kind}/${v.name}` : typeof v === 'string' ? v : '-')) || '-' },
    {
      title: '操作', key: 'action',
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => setEditKind({ kind: 'ClusterRoleBinding', apiVersion: 'rbac.authorization.k8s.io/v1', name: r.name })}>编辑 YAML</Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}><SafetyOutlined /> RBAC</Title>
        <Space>
          <Select placeholder="命名空间(仅 Role/RoleBinding)" allowClear style={{ width: 220 }} value={namespace || undefined} onChange={setNamespace} options={nsOptions} />
          <Button icon={<ReloadOutlined />} onClick={refetchAll}>刷新</Button>
        </Space>
      </div>
      <Card>
        <Tabs
          items={[
            { key: 'roles', label: 'Roles', children: <Table columns={roleColumns} dataSource={roles} loading={rolesLoading} rowKey={(r: any) => `${r.namespace}-${r.name}`} size="small" pagination={{ pageSize: 10 }} /> },
            { key: 'clusterroles', label: 'ClusterRoles', children: <Table columns={crColumns} dataSource={clusterRoles} loading={crLoading} rowKey="name" size="small" pagination={{ pageSize: 10 }} /> },
            { key: 'rolebindings', label: 'RoleBindings', children: <Table columns={rbColumns} dataSource={roleBindings} loading={rbLoading} rowKey={(r: any) => `${r.namespace}-${r.name}`} size="small" pagination={{ pageSize: 10 }} /> },
            { key: 'clusterrolebindings', label: 'ClusterRoleBindings', children: <Table columns={crbColumns} dataSource={clusterRoleBindings} loading={crbLoading} rowKey="name" size="small" pagination={{ pageSize: 10 }} /> },
          ]}
        />
      </Card>

      {editKind && (
        <EditResourceModal
          open={!!editKind}
          onClose={() => setEditKind(null)}
          onSuccess={() => { refetchAll(); setEditKind(null) }}
          kind={editKind.kind}
          apiVersion={editKind.apiVersion}
          namespace={editKind.namespace}
          name={editKind.name}
          title={`编辑 ${editKind.kind}: ${editKind.name}`}
        />
      )}
    </div>
  )
}
