'use client'

import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/react/style.css'
import { useEffect } from 'react'

export default function DocumentEditor({ initialContent, onChange }) {
  // BlockNote 에디터 인스턴스 생성
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0 
      ? initialContent 
      : undefined,
  })

  // 에디터 내용이 변경될 때마다 onChange 콜백 호출
  useEffect(() => {
    if (!editor || !onChange) return

    const handleChange = async () => {
      const content = editor.document
      onChange(content)
    }

    // 에디터 변경 이벤트 리스너 등록
    editor.onChange(handleChange)
  }, [editor, onChange])

  return (
    <div className="blocknote-editor-wrapper">
      <BlockNoteView 
        editor={editor}
        theme="light"
      />
    </div>
  )
}

