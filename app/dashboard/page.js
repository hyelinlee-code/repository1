import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getDocuments } from '@/app/actions/documents'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: documents, error } = await getDocuments()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
        <p className="text-gray-600">
          안녕하세요, {user.email || user.user_metadata?.user_name || '사용자'}님!
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">내 문서</h2>
        <Link
          href="/documents/new"
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
        >
          <span>➕</span>
          <span>새 문서 작성</span>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {!documents || documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            아직 문서가 없습니다
          </h3>
          <p className="text-gray-500 mb-6">
            새 문서를 작성하여 시작해보세요
          </p>
          <Link
            href="/documents/new"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors inline-block"
          >
            첫 문서 작성하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow group"
            >
              <h3 className="font-semibold text-lg mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                {doc.title || '제목 없음'}
              </h3>
              <div className="text-gray-500 text-sm space-y-1">
                <p>생성: {new Date(doc.created_at).toLocaleDateString('ko-KR')}</p>
                <p>수정: {new Date(doc.updated_at).toLocaleDateString('ko-KR')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {documents && documents.length > 0 && (
        <div className="mt-6 text-center text-gray-500 text-sm">
          총 {documents.length}개의 문서
        </div>
      )}
    </div>
  )
}
