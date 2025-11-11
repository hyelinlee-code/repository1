import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewDocumentForm from './NewDocumentForm'

export default async function NewDocument() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">새 문서 작성</h1>
        <p className="text-gray-600">
          Blocknote 에디터를 사용하여 문서를 작성하세요
        </p>
      </div>

      <NewDocumentForm />
    </div>
  )
}
