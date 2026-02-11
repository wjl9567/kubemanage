import React, { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Button, Space, Typography, Tag, Dropdown, message, Modal } from 'antd'
import { CopyOutlined, DownloadOutlined, UploadOutlined, FormatPainterOutlined, FileTextOutlined } from '@ant-design/icons'

const { Text } = Typography

interface YamlEditorProps {
  value?: string
  onChange?: (value: string) => void
  readOnly?: boolean
  height?: number | string
  title?: string
  onApply?: (yaml: string) => void
}

// K8s 资源 YAML 模板
const templates: Record<string, string> = {
  deployment: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: nginx:latest
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
`,
  service: `apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
`,
  configmap: `apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: default
data:
  app.yaml: |
    server:
      port: 8080
    database:
      host: postgres
      port: 5432
`,
  ingress: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 80
`,
  secret: `apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
stringData:
  username: admin
  password: change-me
`,
  pvc: `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
`,
}

export default function YamlEditor({
  value = '',
  onChange,
  readOnly = false,
  height = 500,
  title,
  onApply,
}: YamlEditorProps) {
  const [content, setContent] = useState(value)
  const [lineCount, setLineCount] = useState(0)

  const handleChange = useCallback((val: string | undefined) => {
    const v = val || ''
    setContent(v)
    setLineCount(v.split('\n').length)
    onChange?.(v)
  }, [onChange])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resource-${Date.now()}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.yaml,.yml,.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const text = reader.result as string
          setContent(text)
          onChange?.(text)
          message.success(`已导入 ${file.name}`)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const templateMenu = {
    items: Object.entries(templates).map(([key, _]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      onClick: () => {
        Modal.confirm({
          title: '确认替换',
          content: '当前内容将被模板替换，确认？',
          onOk: () => {
            setContent(templates[key])
            onChange?.(templates[key])
          },
        })
      },
    })),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 工具栏 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px', background: '#252526', borderRadius: '8px 8px 0 0',
        borderBottom: '1px solid #3c3c3c',
      }}>
        <Space>
          <FileTextOutlined style={{ color: '#e8ab6a' }} />
          <Text style={{ color: '#ccc', fontSize: 13 }}>{title || 'YAML 编辑器'}</Text>
          <Tag style={{ fontSize: 11 }}>{lineCount} 行</Tag>
          {readOnly && <Tag color="orange">只读</Tag>}
        </Space>
        <Space size="small">
          <Dropdown menu={templateMenu} placement="bottomRight">
            <Button size="small" icon={<FormatPainterOutlined />} style={{ fontSize: 12 }}>模板</Button>
          </Dropdown>
          <Button size="small" icon={<UploadOutlined />} onClick={handleUpload} style={{ fontSize: 12 }}>导入</Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleDownload} style={{ fontSize: 12 }}>导出</Button>
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopy} style={{ fontSize: 12 }}>复制</Button>
          {onApply && (
            <Button size="small" type="primary" onClick={() => onApply(content)} style={{ fontSize: 12 }}>
              应用
            </Button>
          )}
        </Space>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, minHeight: height }}>
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={content}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            readOnly,
            minimap: { enabled: true, maxColumn: 80 },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            folding: true,
            bracketPairColorization: { enabled: true },
            suggest: { showKeywords: true },
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  )
}
