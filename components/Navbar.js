import Link from 'next/link'
import AuthButton from './AuthButton'

export default function Navbar() {
  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-gray-900">
              📝 MyDocs
            </Link>
            <div className="flex gap-4">
              <Link 
                href="/dashboard" 
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                대시보드
              </Link>
              <Link 
                href="/documents/new" 
                className="text-gray-700 hover:text-gray-900 transition-colors"
              >
                새 문서
              </Link>
            </div>
          </div>
          <AuthButton />
        </div>
      </div>
    </nav>
  )
}

