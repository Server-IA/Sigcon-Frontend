import { useState, useEffect } from 'react'

import { BrowserRouter, Routes } from 'react-router-dom';
import { RenderRoutes } from './routes/routes.jsx';

const base = import.meta.env.MODE === 'production' ? '/sigcon/' : '/'

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