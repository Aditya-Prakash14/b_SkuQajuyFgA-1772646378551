'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ExternalLink, FileText, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  KYC_DOC_LABELS,
  KYC_REQUIRED_DOCS,
  type KycDocStatus,
  type KycDocType,
  type OnboardingStep,
  type VendorStatus,
} from '@prime/shared'
import { decideVendor, reviewDocument, type KycDecision } from '@/app/dashboard/vendors/actions'
import { VendorStatusBadge } from '@/components/status-badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface KycDoc {
  id: string
  doc_type: KycDocType
  status: KycDocStatus
  review_note: string | null
  uploaded_at: string | null
  reviewed_at: string | null
  /** Signed URL (1h) minted server-side from the private vendor-docs bucket. */
  url: string | null
  isImage: boolean
}

export interface KycVendor {
  id: string
  name: string
  status: VendorStatus
  onboarding_step: OnboardingStep
  submitted_at: string | null
  rejection_reason: string | null
  application_note: string | null
  hasAppAccount: boolean
}

const STEP_LABEL: Record<OnboardingStep, string> = {
  profile: 'Filling profile',
  documents: 'Uploading documents',
  review: 'Submitted for review',
  done: 'Onboarding complete',
}

function ago(iso: string | null) {
  if (!iso) return null
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

export function KycReview({ vendor, docs }: { vendor: KycVendor; docs: KycDoc[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [decision, setDecision] = useState<Extract<KycDecision, 'reject' | 'suspend'> | null>(null)
  const [reason, setReason] = useState('')
  const [rejecting, setRejecting] = useState<KycDoc | null>(null)
  const [note, setNote] = useState('')

  const byType = new Map(docs.map((d) => [d.doc_type, d]))
  const required = KYC_REQUIRED_DOCS.map((t) => ({ type: t, doc: byType.get(t) ?? null }))
  const optional = docs.filter((d) => !KYC_REQUIRED_DOCS.includes(d.doc_type))
  const verifiedRequired = required.filter((r) => r.doc?.status === 'verified').length
  const allVerified = verifiedRequired === KYC_REQUIRED_DOCS.length
  const awaiting = vendor.onboarding_step === 'review' && (vendor.status === 'pending' || vendor.status === 'rejected')

  function run(label: string, fn: () => Promise<{ error: string } | { ok: true }>) {
    start(async () => {
      const r = await fn()
      if ('error' in r) toast.error(r.error)
      else {
        toast.success(label)
        router.refresh()
      }
    })
  }

  function review(doc: KycDoc, status: 'verified' | 'rejected', text: string | null) {
    run(
      status === 'verified' ? `${KYC_DOC_LABELS[doc.doc_type]} verified` : `${KYC_DOC_LABELS[doc.doc_type]} sent back`,
      () => reviewDocument(doc.id, vendor.id, status, text),
    )
  }

  function decide(d: KycDecision, text?: string) {
    const labels: Record<KycDecision, string> = {
      approve: 'Partner approved',
      activate: 'Partner activated — eligible for jobs',
      reject: 'Application rejected — partner notified in app',
      suspend: 'Partner suspended',
    }
    run(labels[d], () => decideVendor(vendor.id, d, text ?? null))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> KYC review
            </CardTitle>
            <CardDescription>
              {STEP_LABEL[vendor.onboarding_step]}
              {vendor.submitted_at ? ` · submitted ${ago(vendor.submitted_at)}` : ''}
              {vendor.hasAppAccount ? ' · uses the partner app' : ' · no app account yet'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <VendorStatusBadge status={vendor.status} />
            <Badge variant={allVerified ? 'success' : 'secondary'}>
              {verifiedRequired}/{KYC_REQUIRED_DOCS.length} verified
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {awaiting ? (
          <Alert>
            <AlertTitle>Waiting on your decision</AlertTitle>
            <AlertDescription>
              The partner has submitted their documents. Verify each one, then approve or reject.
            </AlertDescription>
          </Alert>
        ) : null}

        {vendor.status === 'rejected' && vendor.rejection_reason ? (
          <Alert variant="destructive">
            <AlertTitle>Rejected — reason shown to partner</AlertTitle>
            <AlertDescription>{vendor.rejection_reason}</AlertDescription>
          </Alert>
        ) : null}

        {vendor.application_note ? (
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Experience &amp; team (from partner)
            </p>
            <p className="leading-relaxed">{vendor.application_note}</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required documents</p>
          {required.map(({ type, doc }) => (
            <DocRow
              key={type}
              type={type}
              doc={doc}
              busy={pending}
              onVerify={() => doc && review(doc, 'verified', null)}
              onReject={() => {
                if (!doc) return
                setRejecting(doc)
                setNote(doc.review_note ?? '')
              }}
            />
          ))}
          {optional.length ? (
            <>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Optional</p>
              {optional.map((doc) => (
                <DocRow
                  key={doc.id}
                  type={doc.doc_type}
                  doc={doc}
                  busy={pending}
                  onVerify={() => review(doc, 'verified', null)}
                  onReject={() => {
                    setRejecting(doc)
                    setNote(doc.review_note ?? '')
                  }}
                />
              ))}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          {vendor.status !== 'active' ? (
            <Button onClick={() => decide('activate')} disabled={pending || !allVerified}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve &amp; activate
            </Button>
          ) : null}
          {vendor.status === 'pending' || vendor.status === 'rejected' ? (
            <Button variant="outline" onClick={() => decide('approve')} disabled={pending || !allVerified}>
              Approve only
            </Button>
          ) : null}
          {vendor.status !== 'rejected' ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setDecision('reject')
                setReason(vendor.rejection_reason ?? '')
              }}
              disabled={pending}
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
          ) : null}
          {vendor.status === 'active' || vendor.status === 'approved' ? (
            <Button
              variant="ghost"
              onClick={() => {
                setDecision('suspend')
                setReason('')
              }}
              disabled={pending}
            >
              Suspend
            </Button>
          ) : null}
          {!allVerified ? (
            <p className="ml-auto text-xs text-muted-foreground">
              Approval unlocks once all {KYC_REQUIRED_DOCS.length} required documents are verified.
            </p>
          ) : null}
        </div>
      </CardContent>

      {/* Reject / suspend with a reason the partner will read */}
      <Dialog open={decision !== null} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === 'reject' ? 'Reject application' : 'Suspend partner'}</DialogTitle>
            <DialogDescription>
              {decision === 'reject'
                ? 'The partner sees this reason in the app and can fix their documents and resubmit.'
                : 'The partner loses access to jobs until reinstated. A note is optional.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="kyc-reason">Reason</Label>
            <Textarea
              id="kyc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={
                decision === 'reject'
                  ? 'e.g. Aadhaar photo is blurred — upload a clear photo of the front and back.'
                  : 'Optional'
              }
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              variant={decision === 'reject' ? 'destructive' : 'default'}
              disabled={pending || (decision === 'reject' && !reason.trim())}
              onClick={() => {
                const d = decision!
                setDecision(null)
                decide(d, reason)
              }}
            >
              {decision === 'reject' ? 'Reject application' : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send one document back */}
      <Dialog open={rejecting !== null} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send back {rejecting ? KYC_DOC_LABELS[rejecting.doc_type] : 'document'}</DialogTitle>
            <DialogDescription>Tell the partner what to fix. They can replace this file in the app.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="doc-note">What needs fixing</Label>
            <Textarea
              id="doc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Name on the passbook doesn't match the Aadhaar card."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !note.trim()}
              onClick={() => {
                const d = rejecting!
                setRejecting(null)
                review(d, 'rejected', note)
              }}
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function DocRow({
  type,
  doc,
  busy,
  onVerify,
  onReject,
}: {
  type: KycDocType
  doc: KycDoc | null
  busy: boolean
  onVerify: () => void
  onReject: () => void
}) {
  const tone = !doc ? 'outline' : doc.status === 'verified' ? 'success' : doc.status === 'rejected' ? 'destructive' : 'warning'
  const label = !doc ? 'Not uploaded' : doc.status === 'verified' ? 'Verified' : doc.status === 'rejected' ? 'Sent back' : 'Awaiting review'

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {doc?.url && doc.isImage ? (
          // Plain <img>: a signed, short-lived URL from private storage — not a next/image candidate.
          <img src={doc.url} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{KYC_DOC_LABELS[type]}</p>
          <Badge variant={tone}>{label}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {doc?.uploaded_at ? `Uploaded ${ago(doc.uploaded_at)}` : 'The partner has not uploaded this yet'}
          {doc?.reviewed_at ? ` · reviewed ${ago(doc.reviewed_at)}` : ''}
        </p>
        {doc?.status === 'rejected' && doc.review_note ? (
          <p className="mt-1 text-xs text-destructive">“{doc.review_note}”</p>
        ) : null}
      </div>
      {doc ? (
        <div className="flex items-center gap-1.5">
          {doc.url ? (
            <Button asChild variant="outline" size="sm">
              <a href={doc.url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
            </Button>
          ) : null}
          {doc.status !== 'verified' ? (
            <Button size="sm" onClick={onVerify} disabled={busy}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Verify
            </Button>
          ) : null}
          {doc.status !== 'rejected' ? (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onReject} disabled={busy}>
              Send back
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
