'use client'

import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/react'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/react/style.css'

export default function DocumentViewer({ content }) {
  // 읽기 전용 에디터 생성
  const editor = useCreateBlockNote({
    initialContent: content && content.length > 0 ? content : undefined,
    editable: false,
  })

  return (
    <div className="blocknote-viewer-wrapper">
      <BlockNoteView 
        editor={editor}
        theme="light"
        editable={false}
      />
    </div>
  )
}

