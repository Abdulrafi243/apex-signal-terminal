import { useEffect, useRef, useState } from 'react'
import type { Candle } from '../services/api'

export type StreamState = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'STALE' | 'OFFLINE'

function wsBase() {
  const explicit = import.meta.env.VITE_WS_BASE_URL
  if (explicit) return String(explicit).replace(/\/$/, '')

  const api = String(import.meta.env.VITE_API_BASE_URL || '/api/v1')
  if (/^https?:\/\//i.test(api)) {
    const url = new URL(api)
    return `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}`
  }

  // In Vite development connect directly to FastAPI. This avoids a dev-proxy
  // websocket race that can show "closed before connection is established".
  if (['localhost','127.0.0.1'].includes(window.location.hostname)) {
    return 'ws://127.0.0.1:8000'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function useMarketStream(symbol:string,timeframe:string,onCandle:(c:Candle)=>void){
  const [state,setState]=useState<StreamState>('CONNECTING')
  const [lastMessageAt,setLastMessageAt]=useState<number|null>(null)
  const cb=useRef(onCandle); cb.current=onCandle

  useEffect(()=>{
    let ws:WebSocket|null=null, stopped=false, retry=0
    let reconnectTimer:number|undefined, staleTimer:number|undefined
    let lastFrame=0

    const connect=()=>{
      if(stopped)return
      setState(retry?'RECONNECTING':'CONNECTING')
      const socket=new WebSocket(`${wsBase()}/ws/market/${encodeURIComponent(symbol)}/${encodeURIComponent(timeframe)}`)
      ws=socket
      socket.onopen=()=>{
        if(stopped){ socket.close(1000,'component disposed'); return }
        retry=0;setState('LIVE')
      }
      socket.onmessage=(event)=>{
        if(stopped)return
        try{
          const payload=JSON.parse(event.data)
          if(payload.type==='kline'&&payload.candle){
            lastFrame=Date.now();cb.current(payload.candle as Candle);setLastMessageAt(lastFrame);setState('LIVE')
          }
          if(payload.type==='error')setState('OFFLINE')
        }catch{/* ignore malformed frames */}
      }
      socket.onerror=()=>{ if(!stopped)setState('RECONNECTING') }
      socket.onclose=()=>{
        if(stopped)return
        retry+=1
        setState(retry>6?'OFFLINE':'RECONNECTING')
        reconnectTimer=window.setTimeout(connect,Math.min(1000*Math.pow(2,Math.min(retry,5)),30000))
      }
    }

    staleTimer=window.setInterval(()=>{
      if(!stopped&&lastFrame&&Date.now()-lastFrame>15000&&ws?.readyState===WebSocket.OPEN)setState('STALE')
    },5000)
    connect()
    return()=>{
      stopped=true
      if(reconnectTimer)clearTimeout(reconnectTimer)
      if(staleTimer)clearInterval(staleTimer)
      // Never call close() while CONNECTING; Chrome reports that as a failed WS.
      if(ws?.readyState===WebSocket.OPEN)ws.close(1000,'component disposed')
    }
  },[symbol,timeframe])
  return {state,lastMessageAt}
}
