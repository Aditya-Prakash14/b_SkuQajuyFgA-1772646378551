import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Banner, Button, Card, Loading, Screen, Steps } from '../components/ui'
import { errorMessage, supabase } from '../lib/supabase'
import { colors, radius, space } from '../lib/theme'
import {
  DOC_HINTS,
  DOC_LABELS,
  OPTIONAL_DOCS,
  REQUIRED_DOCS,
  type DocType,
  type Vendor,
  type VendorDocument,
} from '../lib/types'

const BUCKET = 'vendor-docs'

type Picked = { uri: string; mimeType: string; name: string }

export function DocumentsScreen({ vendor, onSubmitted }: { vendor: Vendor; onSubmitted: () => void }) {
  const [docs, setDocs] = useState<VendorDocument[] | null>(null)
  const [uploading, setUploading] = useState<DocType | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('vendor_documents')
      .select('id, vendor_id, doc_type, storage_path, status, review_note, uploaded_at')
      .eq('vendor_id', vendor.id)
    if (error) setError(errorMessage(error, 'Could not load your documents.'))
    setDocs((data as VendorDocument[]) ?? [])
  }, [vendor.id])

  useEffect(() => {
    load()
  }, [load])

  function pick(docType: DocType) {
    Alert.alert(DOC_LABELS[docType], 'How would you like to add this?', [
      { text: 'Take photo', onPress: () => fromCamera(docType) },
      { text: 'Choose photo', onPress: () => fromLibrary(docType) },
      { text: 'Choose PDF', onPress: () => fromFiles(docType) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function fromCamera(docType: DocType) {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setError('Camera permission is needed to photograph your document.')
      return
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 })
    if (!res.canceled) await upload(docType, asPicked(res.assets[0], 'image/jpeg'))
  }

  async function fromLibrary(docType: DocType) {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    })
    if (!res.canceled) await upload(docType, asPicked(res.assets[0], 'image/jpeg'))
  }

  async function fromFiles(docType: DocType) {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    })
    if (!res.canceled) await upload(docType, asPicked(res.assets[0], 'application/pdf'))
  }

  /**
   * Upload the file, then record it.
   *
   * Order matters: storage first, table second. If the upload succeeds but the
   * insert fails we leave an orphan object (harmless, overwritten on retry). The
   * reverse would leave a vendor_documents row pointing at nothing, which would
   * satisfy submit_vendor_for_review()'s presence check with no actual document.
   */
  async function upload(docType: DocType, file: Picked) {
    setUploading(docType)
    setError(null)
    try {
      const ext = extensionFor(file)
      // The storage RLS policy authorises on the first path segment, so the
      // vendor id prefix is mandatory, not cosmetic.
      const path = `${vendor.id}/${docType}.${ext}`

      const bytes = await new File(file.uri).arrayBuffer()
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: file.mimeType, upsert: true })
      if (upErr) throw upErr

      // unique(vendor_id, doc_type) makes this a replace. RLS lets a vendor
      // delete only their own not-yet-verified rows, so a verified document
      // cannot be swapped out from under an approver.
      const existing = docs?.find((d) => d.doc_type === docType)
      if (existing) {
        const { error: delErr } = await supabase.from('vendor_documents').delete().eq('id', existing.id)
        if (delErr) throw delErr
      }

      const { error: insErr } = await supabase.from('vendor_documents').insert({
        vendor_id: vendor.id,
        doc_type: docType,
        storage_path: path,
        status: 'pending',
      })
      if (insErr) throw insErr

      await load()
    } catch (err) {
      setError(errorMessage(err, 'Upload failed. Check your connection and try again.'))
    } finally {
      setUploading(null)
    }
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const { error } = await supabase.rpc('submit_vendor_for_review')
      if (error) throw error
      onSubmitted()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!docs) return <Loading label="Loading your documents…" />

  const byType = new Map(docs.map((d) => [d.doc_type, d]))
  const missing = REQUIRED_DOCS.filter((t) => !byType.has(t))
  const canSubmit = missing.length === 0 && !uploading

  return (
    <ScrollView contentContainerStyle={{ padding: space(5), paddingBottom: space(12) }}>
      <Steps current={2} labels={['Account', 'Profile', 'Documents', 'Review']} />
      <View style={{ height: space(6) }} />
      <Screen
        title="Verification documents"
        subtitle="We verify every partner before they receive jobs. Your documents are stored privately and are visible only to our onboarding team."
      >
        {error ? <Banner tone="error">{error}</Banner> : null}

        <View style={{ gap: space(3) }}>
          {REQUIRED_DOCS.map((t) => (
            <DocRow key={t} type={t} doc={byType.get(t)} busy={uploading === t} onPick={() => pick(t)} required />
          ))}
          {OPTIONAL_DOCS.map((t) => (
            <DocRow key={t} type={t} doc={byType.get(t)} busy={uploading === t} onPick={() => pick(t)} />
          ))}
        </View>

        {missing.length > 0 ? (
          <Banner tone="warn">
            Still needed: {missing.map((t) => DOC_LABELS[t]).join(', ')}.
          </Banner>
        ) : (
          <Banner tone="success">All required documents uploaded. You can submit for review.</Banner>
        )}

        <Button label="Submit for review" onPress={submit} loading={submitting} disabled={!canSubmit} variant="brand" />
      </Screen>
    </ScrollView>
  )
}

function DocRow({
  type,
  doc,
  busy,
  onPick,
  required,
}: {
  type: DocType
  doc?: VendorDocument
  busy: boolean
  onPick: () => void
  required?: boolean
}) {
  const tone = !doc
    ? { bg: colors.card, border: colors.border, label: required ? 'Required' : 'Optional', color: colors.faint }
    : doc.status === 'verified'
      ? { bg: colors.successBg, border: colors.success, label: 'Verified', color: colors.success }
      : doc.status === 'rejected'
        ? { bg: colors.dangerBg, border: colors.danger, label: 'Rejected', color: colors.danger }
        : { bg: colors.card, border: colors.border, label: 'Uploaded', color: colors.primary }

  // A verified document is final — hide the replace affordance rather than let
  // the tap fail against the RLS delete policy.
  const locked = doc?.status === 'verified'

  return (
    <Pressable onPress={locked || busy ? undefined : onPick} style={[st.row, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={{ flex: 1, gap: space(1) }}>
        <Text style={st.rowTitle}>{DOC_LABELS[type]}</Text>
        <Text style={st.rowHint}>{doc?.review_note ?? DOC_HINTS[type]}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: space(1) }}>
        <Text style={[st.badge, { color: tone.color }]}>{busy ? 'Uploading…' : tone.label}</Text>
        {!locked && !busy ? <Text style={st.action}>{doc ? 'Replace' : 'Add'}</Text> : null}
      </View>
    </Pressable>
  )
}

function asPicked(asset: { uri: string; mimeType?: string | null; fileName?: string | null; name?: string }, fallbackMime: string): Picked {
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? fallbackMime,
    name: asset.fileName ?? asset.name ?? 'document',
  }
}

function extensionFor(file: Picked) {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()! : ''
  if (fromName) return fromName.toLowerCase()
  if (file.mimeType === 'application/pdf') return 'pdf'
  if (file.mimeType === 'image/png') return 'png'
  return 'jpg'
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space(4),
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowHint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  badge: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  action: { fontSize: 12, color: colors.primary, fontWeight: '600' },
})
