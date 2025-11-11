'use client'

/**
 * 로딩 스피너 컴포넌트
 * @param {string} size - 'sm', 'md', 'lg'
 * @param {string} className - 추가 CSS 클래스
 */
export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div className={`inline-block ${sizes[size]} border-blue-500 border-t-transparent rounded-full animate-spin ${className}`}></div>
  )
}

