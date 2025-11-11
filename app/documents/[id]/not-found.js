import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-lg shadow-sm border">
        <div className="text-6xl">📄</div>
        <h1 className="text-2xl font-bold text-gray-900">
          문서를 찾을 수 없습니다
        </h1>
        <p className="text-gray-600">
          요청하신 문서가 존재하지 않거나 접근 권한이 없습니다.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  )
}

