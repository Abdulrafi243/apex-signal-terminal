import { useCallback, useEffect, useRef, useState } from 'react'

export function usePolling<T>(loader:()=>Promise<T>, intervalMs=15000, enabled=true) {
  const [data,setData]=useState<T|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const mounted=useRef(true)
  const inFlight=useRef(false)
  const timerRef=useRef<number|null>(null)

  const refresh=useCallback(async()=>{
    // Never stack another HTTP request while the previous one is still running.
    // This is especially important for the 3s signal-analysis loop.
    if(inFlight.current) return
    inFlight.current=true
    try {
      const value=await loader()
      if(mounted.current){ setData(value); setError(null) }
    } catch(e) {
      if(mounted.current) setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      inFlight.current=false
      if(mounted.current) setLoading(false)
    }
  },[loader])

  useEffect(()=>{
    mounted.current=true
    if(!enabled) return ()=>{mounted.current=false}

    let cancelled=false
    const loop=async()=>{
      await refresh()
      if(cancelled || !mounted.current) return
      // Schedule the next poll only after this one has completed.
      timerRef.current=window.setTimeout(loop,intervalMs)
    }
    void loop()

    return ()=>{
      cancelled=true
      mounted.current=false
      if(timerRef.current!==null) window.clearTimeout(timerRef.current)
    }
  },[refresh,intervalMs,enabled])

  return {data,loading,error,refresh}
}
