import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.js'
// import SimpleApp from './SimpleApp.js'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <div>
      <h1>TipTap Content AI Agent Demo</h1>
      <p>Select some text in the editor and click a recipe button to see AI transformations with diff preview.</p>
      <App />
    </div>
  </React.StrictMode>,
)
