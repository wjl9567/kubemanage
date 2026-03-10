import React, { useEffect, useState } from 'react'
import { Modal, message } from 'antd'
import YamlEditor from '@/components/YamlEditor'
import { applyApi } from '@/services/api'

interface EditResourceModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  kind: string
  apiVersion: string
  namespace?: string
  name: string
  title?: string
}

/** 通用资源编辑弹窗：拉取当前 YAML/JSON，编辑后 Apply */
export default function EditResourceModal({
  open,
  onClose,
  onSuccess,
  kind,
  apiVersion,
  namespace,
  name,
  title,
}: EditResourceModalProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !name) return
    setLoading(true)
    applyApi
      .getRaw({ kind, apiVersion, namespace, name })
      .then((res: any) => {
        const obj = res?.data ?? res
        setContent(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2))
      })
      .catch((e: any) => message.error(e?.message || '加载失败'))
      .finally(() => setLoading(false))
  }, [open, kind, apiVersion, namespace, name])

  const handleApply = () => {
    let obj: object
    try {
      obj = JSON.parse(content)
    } catch {
      message.error('内容不是合法 JSON，请检查格式')
      return
    }
    setSaving(true)
    applyApi
      .applyJson(obj)
      .then(() => {
        message.success('保存成功')
        onSuccess?.()
        onClose()
      })
      .catch((e: any) => message.error(e?.message || '保存失败'))
      .finally(() => setSaving(false))
  }

  return (
    <Modal
      title={title || `编辑 ${kind}: ${name}`}
      open={open}
      onCancel={onClose}
      width={800}
      okText="保存"
      onOk={handleApply}
      confirmLoading={saving}
      destroyOnClose
    >
      <YamlEditor
        value={content}
        onChange={setContent}
        height={480}
        readOnly={loading}
        onApply={handleApply}
      />
    </Modal>
  )
}
