const ISSUE_KEY = /[A-Z][A-Z0-9_]*-\d+/i

export interface CommentLink {
  key: string
  commentId: string
}

export const parseCommentUrl = (input: string): CommentLink | null => {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return null
  }

  const commentId = url.searchParams.get('focusedCommentId') ?? url.hash.match(/comment-(\d+)/)?.[1]
  const key =
    url.pathname.match(new RegExp(`/browse/(${ISSUE_KEY.source})`, 'i'))?.[1] ??
    url.searchParams.get('selectedIssue') ??
    url.pathname.match(ISSUE_KEY)?.[0]

  if (!key || !commentId || !/^\d+$/.test(commentId)) return null
  return { key: key.toUpperCase(), commentId }
}
