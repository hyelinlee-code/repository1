import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-lg shadow-sm border">
        <div className="text-6xl">❌</div>
        <h1 className="text-2xl font-bold text-gray-900">
          인증 오류
        </h1>
        <p className="text-gray-600">
          로그인 중 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        <Link
          href="/"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}

