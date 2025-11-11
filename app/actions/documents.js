'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 새 문서 생성
 */
export async function createDocument(formData) {
  const supabase = await createClient()
  
  // 사용자 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  const title = formData.get('title') || '제목 없음'
  const content = formData.get('content')
  
  let parsedContent
  try {
    parsedContent = content ? JSON.parse(content) : []
  } catch (e) {
    return { error: '잘못된 문서 형식입니다.' }
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      title,
      content: parsedContent,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating document:', error)
    return { error: '문서 생성에 실패했습니다.' }
  }

  revalidatePath('/dashboard')
  redirect(`/documents/${data.id}`)
}

/**
 * 문서 목록 조회
 */
export async function getDocuments() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return { data: null, error: '문서 목록을 불러오는데 실패했습니다.' }
  }

  return { data, error: null }
}

/**
 * 특정 문서 조회
 */
export async function getDocument(id) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('Error fetching document:', error)
    return { data: null, error: '문서를 불러오는데 실패했습니다.' }
  }

  return { data, error: null }
}

/**
 * 문서 업데이트
 */
export async function updateDocument(id, formData) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  const title = formData.get('title')
  const content = formData.get('content')
  
  let parsedContent
  try {
    parsedContent = content ? JSON.parse(content) : []
  } catch (e) {
    return { error: '잘못된 문서 형식입니다.' }
  }

  const updateData = {}
  if (title !== null) updateData.title = title
  if (content !== null) updateData.content = parsedContent

  const { data, error } = await supabase
    .from('documents')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating document:', error)
    return { error: '문서 수정에 실패했습니다.' }
  }

  revalidatePath(`/documents/${id}`)
  revalidatePath('/dashboard')
  
  return { data, error: null }
}

/**
 * 문서 삭제
 */
export async function deleteDocument(id) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting document:', error)
    return { error: '문서 삭제에 실패했습니다.' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

