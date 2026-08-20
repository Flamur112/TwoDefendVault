import { getSupabaseAdmin } from './supabase'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 512 * 1024

function avatarPath(userId: string, ext: 'jpg' | 'png' | 'webp'): string {
  return `${userId}/avatar.${ext}`
}

function extensionFromContentType(contentType: string | null): 'jpg' | 'png' | 'webp' {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('webp')) return 'webp'
  return 'jpg'
}

export async function syncUserAvatarFromUrl(
  userId: string,
  sourceUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(sourceUrl, { redirect: 'follow' })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.startsWith('image/')) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) return null

    const ext = extensionFromContentType(contentType)
    const path = avatarPath(userId, ext)
    const supabase = getSupabaseAdmin()

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, {
        upsert: true,
        contentType: contentType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        cacheControl: '86400',
      })

    if (uploadError) {
      console.error('[avatar] upload failed:', uploadError.message)
      return null
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    const avatarUrl = data.publicUrl

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId)

    if (updateError) {
      console.error('[avatar] user update failed:', updateError.message)
      return null
    }

    return avatarUrl
  }
  catch (err) {
    console.error('[avatar] sync failed:', err)
    return null
  }
}
