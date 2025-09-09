export type AgentStatus = 'idle' | 'loading' | 'reviewingToolCall' | 'error'

export interface ContextSourceRef {
  id: string
  kind: 'doc' | 'code' | 'ticket' | 'dashboard' | 'other'
  uri: string
  title?: string
  snippet?: string
  score?: number
  meta?: Record<string, unknown>
}

export interface ContextPack {
  selectionSpan?: { from: number; to: number }
  docMeta?: { id: string; title?: string; path?: string; entityRefs?: Array<{ id: string; type: string }> }
  sources: ContextSourceRef[]
}

export interface ToolCall {
  id: string
  type: 'edit' | 'insert' | 'comment' | 'transform'
  payload: { from: number; to: number; text?: string; meta?: Record<string, unknown> }
  provenance?: ContextSourceRef[]
}

export type DiffTuple = [op: -1 | 0 | 1, text: string]

export interface Suggestion {
  id: string
  authorId?: string
  createdAt: number
  // Anchors should be serialized Y.RelativePosition strings in collaborative mode
  relativeFrom?: string
  relativeTo?: string
  // Optional absolute snapshot for debugging/UI
  from?: number
  to?: number
  originalHash?: string
  generated: string
  diff: DiffTuple[]
  status: 'pending' | 'accepted' | 'rejected' | 'stale'
  lockedBy?: string
  lockExpiresAt?: number
  provenance?: ContextSourceRef[]
}

export interface Message {
  id: string
  role: 'user' | 'ai' | 'system' | 'tool'
  content: string
  createdAt: number
  meta?: Record<string, unknown>
}

export interface AIOperation {
  id: string
  userId: string
  type: 'inline' | 'chat' | 'context'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  permissions?: { canApprove?: string[]; requiresApproval?: boolean; autoApprove?: boolean }
  conflictResolution?: { strategy?: 'latest-wins' | 'merge' | 'user-choice'; conflictsWith?: string[] }
  attribution?: { triggeredBy: string; approvedBy?: string; timestamp: number }
}

export interface ContextResult extends ContextSourceRef {}

export default {}

