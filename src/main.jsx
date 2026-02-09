import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './utils/reducers/store.jsx'

// import $ from 'jquery';

// window.$ = window.jQuery = $;

// // CSS
// import 'select2/dist/css/select2.min.css';

// // JS (FULL)
// import 'select2/dist/js/select2.full.min.js';

import App from './App.jsx'



createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
