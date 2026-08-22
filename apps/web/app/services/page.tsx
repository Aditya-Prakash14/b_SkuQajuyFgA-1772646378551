import { redirect } from 'next/navigation'

/**
 * The flat service index is gone: browsing now goes Deep Cleaning → category →
 * service. This route is kept as a redirect because it was indexed and linked.
 */
export default function ServicesIndexRedirect() {
  redirect('/deep-cleaning')
}
