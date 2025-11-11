'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DocumentEditor from '@/components/DocumentEditor'
import DocumentViewer from '@/components/DocumentViewer'
import Toast from '@/components/Toast'
import LoadingSpinner from '@/components/LoadingSpinner'
import { updateDocument, deleteDocument } from '@/app/actions/documents'
import useToast from '@/hooks/useToast'

export default function DocumentDetailClient({ document }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(document.title)
  const [content, setContent] = useState(document.content)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { toasts, hideToast, success, error: showError, info } = useToast()

  const handleContentChange = (newContent) => {
    setContent(newContent)
    setHasUnsavedChanges(true)
    // 내용 변경 시 검증 오류 클리어
    if (validationErrors.content) {
      setValidationErrors(prev => ({ ...prev, content: null }))
    }
  }

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setHasUnsavedChanges(true)
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
    
    // 내용 검증
    if (!content || content.length === 0) {
      errors.content = '문서 내용을 입력해주세요.'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (isAutoSave = false) => {
    // 폼 검증
    if (!validateForm()) {
      if (!isAutoSave) {
        showError('입력 항목을 확인해주세요.')
      }
      return false
    }

    setSaving(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('content', JSON.stringify(content))

      const result = await updateDocument(document.id, formData)
      
      if (result?.error) {
        setError(result.error)
        if (!isAutoSave) {
          showError(result.error)
        }
        return false
      } else {
        if (isAutoSave) {
          setLastSaved(new Date())
          setHasUnsavedChanges(false)
        } else {
          success('문서가 성공적으로 수정되었습니다!')
          setIsEditing(false)
          router.refresh()
        }
        return true
      }
    } catch (err) {
      console.error('Error updating document:', err)
      const errorMsg = '문서 저장 중 오류가 발생했습니다.'
      setError(errorMsg)
      if (!isAutoSave) {
        showError(errorMsg)
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)

    try {
      const result = await deleteDocument(document.id)
      
      if (result?.error) {
        setError(result.error)
        showError(result.error)
        setDeleting(false)
        setShowDeleteModal(false)
      } else {
        success('문서가 성공적으로 삭제되었습니다!')
        // 성공 시 Server Action에서 자동으로 리다이렉트됨
      }
    } catch (err) {
      console.error('Error deleting document:', err)
      const errorMsg = '문서 삭제 중 오류가 발생했습니다.'
      setError(errorMsg)
      showError(errorMsg)
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleCancelEdit = () => {
    if (title !== document.title || JSON.stringify(content) !== JSON.stringify(document.content)) {
      if (!confirm('변경사항이 저장되지 않습니다. 정말 취소하시겠습니까?')) {
        return
      }
    }
    setTitle(document.title)
    setContent(document.content)
    setIsEditing(false)
    setError(null)
    setValidationErrors({})
    info('편집이 취소되었습니다.')
  }

  // 자동 저장 타이머 (30초마다)
  useEffect(() => {
    if (!isEditing || !autoSaveEnabled || !hasUnsavedChanges) return

    const autoSaveTimer = setTimeout(() => {
      if (hasUnsavedChanges && !saving) {
        handleSave(true) // 자동 저장
      }
    }, 30000) // 30초

    return () => clearTimeout(autoSaveTimer)
  }, [isEditing, autoSaveEnabled, hasUnsavedChanges, title, content, saving])

  // 키보드 단축키 (Ctrl+S / Cmd+S) - 편집 모드일 때만
  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (!saving) {
          handleSave()
        }
      }
      // ESC 키로 편집 취소
      if (e.key === 'Escape' && !saving) {
        handleCancelEdit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, title, content, saving])

  // 페이지 떠나기 경고
  useEffect(() => {
    if (!isEditing || !hasUnsavedChanges) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = '저장되지 않은 변경사항이 있습니다. 정말 페이지를 떠나시겠습니까?'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditing, hasUnsavedChanges])

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <span>←</span>
            <span>대시보드로 돌아가기</span>
          </Link>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center gap-2"
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
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  편집
                </button>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  삭제
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-8">
          {isEditing ? (
            <>
              <div className="mb-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
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
                    initialContent={content}
                    onChange={handleContentChange}
                  />
                </div>
                {validationErrors.content && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.content}</p>
                )}
              </div>
              <div className="border-t pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-sm text-gray-500">
                    <p>
                      💡 팁: <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs">S</kbd> 로 저장, 
                      <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs ml-2">ESC</kbd> 로 취소할 수 있습니다
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* 자동 저장 상태 */}
                    <div className="text-sm">
                      {saving ? (
                        <span className="text-blue-600 flex items-center gap-1">
                          <LoadingSpinner size="sm" />
                          <span>저장 중...</span>
                        </span>
                      ) : hasUnsavedChanges ? (
                        <span className="text-orange-600">저장되지 않은 변경사항</span>
                      ) : lastSaved ? (
                        <span className="text-green-600">
                          ✓ {new Date(lastSaved).toLocaleTimeString('ko-KR')}에 자동 저장됨
                        </span>
                      ) : null}
                    </div>
                    {/* 자동 저장 토글 */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSaveEnabled}
                        onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">자동 저장</span>
                    </label>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {document.title}
              </h1>
              <div className="text-gray-500 text-sm mb-6 flex gap-4">
                <span>생성: {new Date(document.created_at).toLocaleString('ko-KR')}</span>
                <span>수정: {new Date(document.updated_at).toLocaleString('ko-KR')}</span>
              </div>
              
              <div className="prose max-w-none">
                <DocumentViewer content={document.content} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              문서 삭제 확인
            </h2>
            <p className="text-gray-600 mb-2">
              정말로 이 문서를 삭제하시겠습니까?
            </p>
            <p className="text-red-600 font-medium mb-6">
              ⚠️ 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="bg-gray-50 p-3 rounded mb-6 border">
              <p className="text-sm text-gray-700">
                <strong>삭제될 문서:</strong> {document.title}
              </p>
            </div>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:bg-gray-400 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>삭제 중...</span>
                  </>
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* 저장/삭제 중 오버레이 */}
      {(saving || deleting) && (
        <div className="loading-overlay">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-700 font-medium">
              {saving ? '문서를 저장하는 중...' : '문서를 삭제하는 중...'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

