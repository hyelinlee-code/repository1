'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DocumentEditor from '@/components/DocumentEditor'
import Toast from '@/components/Toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { createDocument } from '@/app/actions/documents'
import useToast from '@/hooks/useToast'

export default function NewDocumentForm() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const { toasts, hideToast, success, error: showError } = useToast()

  const handleContentChange = (newContent) => {
    setContent(newContent)
    // 내용 변경 시 검증 오류 클리어
    if (validationErrors.content) {
      setValidationErrors(prev => ({ ...prev, content: null }))
    }
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    // 제목 변경 시 검증 오류 클리어
    if (validationErrors.title) {
      setValidationErrors(prev => ({ ...prev, title: null }))
    }
  }

  // 폼 검증 함수
  const validateForm = () => {
    const errors = {}
    
    // 제목 검증
    if (!title || title.trim().length === 0) {
      errors.title = '제목을 입력해주세요.'
    } else if (title.length > 200) {
      errors.title = '제목은 200자를 초과할 수 없습니다.'
    }
    
    // 내용 검증 (빈 문서 방지)
    if (!content || content.length === 0) {
      errors.content = '문서 내용을 입력해주세요.'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 폼 검증
    if (!validateForm()) {
      showError('입력 항목을 확인해주세요.')
      return
    }
    
    setSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('content', JSON.stringify(content))

      const result = await createDocument(formData)
      
      if (result?.error) {
        setError(result.error)
        showError(result.error)
        setSaving(false)
      } else {
        success('문서가 성공적으로 저장되었습니다!')
        // 성공 시 Server Action에서 자동으로 리다이렉트됨
      }
    } catch (err) {
      console.error('Error saving document:', err)
      const errorMsg = '문서 저장 중 오류가 발생했습니다.'
      setError(errorMsg)
      showError(errorMsg)
      setSaving(false)
    }
  }

  // 키보드 단축키 (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!saving) {
          handleSubmit(e)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [title, content, saving])

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={title}
              onChange={handleTitleChange}
              placeholder="문서 제목을 입력하세요 (최대 200자)"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg ${
                validationErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={saving}
              maxLength={200}
            />
            {validationErrors.title && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.title}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {title.length}/200
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              내용 <span className="text-red-500">*</span>
            </label>
            <div className={validationErrors.content ? 'ring-2 ring-red-300 rounded-lg' : ''}>
              <DocumentEditor 
                initialContent={[]}
                onChange={handleContentChange}
              />
            </div>
            {validationErrors.content && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.content}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center border-t pt-6">
            <p className="text-sm text-gray-500">
              💡 팁: <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">S</kbd> 로 저장할 수 있습니다
            </p>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* 토스트 알림 */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => hideToast(toast.id)}
          duration={toast.duration}
        />
      ))}

      {/* 저장 중 오버레이 */}
      {saving && (
        <div className="loading-overlay">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-700 font-medium">문서를 저장하는 중...</p>
          </div>
        </div>
      )}
    </>
  )
}

