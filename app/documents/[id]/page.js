import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getDocument } from '@/app/actions/documents'
import DocumentDetailClient from './DocumentDetailClient'

export default async function DocumentDetail({ params }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { id } = await params
  const { data: document, error } = await getDocument(id)

  if (error || !document) {
    notFound()
  }

  return <DocumentDetailClient document={document} />
}
