import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">
          📝 MyDocs에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-gray-600">
          Notion과 유사한 직관적인 문서 작성 및 관리 서비스
        </p>
        <div className="space-y-4">
          <p className="text-gray-700">
            GitHub 계정으로 로그인하여 시작하세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="text-sm text-gray-500">
              ⬆️ 상단의 "GitHub 로그인" 버튼을 클릭하세요
            </div>
          </div>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">✍️ 쉬운 편집</h3>
            <p className="text-gray-600">
              Blocknote 에디터로 리치 텍스트 문서를 간편하게 작성하세요
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">🔒 안전한 저장</h3>
            <p className="text-gray-600">
              Supabase를 통해 안전하게 문서를 저장하고 관리합니다
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="font-semibold text-lg mb-2">⚡ 빠른 접근</h3>
            <p className="text-gray-600">
              GitHub 로그인으로 빠르게 시작하고 어디서나 접근하세요
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
