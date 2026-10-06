export async function requestBrowserNotifications() {
  if (!('Notification' in window)) {
    return { ok: false, message: 'Browser notifications are not supported.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, message: 'Notification permission was not granted.' }
  }

  new Notification('Apex Signal Terminal', {
    body: 'Strong-signal alerts are enabled for this browser.',
  })

  return { ok: true, message: 'Browser alerts enabled.' }
}
