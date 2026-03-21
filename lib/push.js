import { subscribePush, unsubscribePush } from '@/lib/api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerPush(userName) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported')
    return
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) {
    console.log('VAPID public key not configured')
    return
  }

  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  await subscribePush(userName, subscription.toJSON())
  console.log('Push subscription registered')
  return subscription
}

export async function unregisterPush() {
  if (!('serviceWorker' in navigator)) return

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await unsubscribePush(subscription.endpoint)
    await subscription.unsubscribe()
    console.log('Push subscription removed')
  }
}
