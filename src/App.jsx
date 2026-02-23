import { useState, useEffect } from 'react'

import { BrowserRouter, Routes } from 'react-router-dom';
import { RenderRoutes } from './routes/routes.jsx';

console.log(['import.meta.env', import.meta.env]);  
const base = import.meta.env.VITE_ENVIRONMENT == 'local' ? '/' : import.meta.env.VITE_ENVIRONMENT == 'development' ? '/dev/sigcon/' : '/sigcon/'

function App() {

  return (
    <BrowserRouter basename={base}>
      <Routes>
        {RenderRoutes()}
      </Routes>
    </BrowserRouter>
  );
}

export default App