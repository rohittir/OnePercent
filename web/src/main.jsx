// @ts-check
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './App.jsx'
import { loadContent } from './content.js'
import { startSync } from './sync.js'
import './styles.css'

createRoot(/** @type {HTMLElement} */ (document.getElementById('root'))).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
)
startSync()
void loadContent()
// The installed, offline app (public/sw.js). Dev runs without it, so code changes always show.
if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js')
