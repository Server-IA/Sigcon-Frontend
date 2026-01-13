import { useState, useEffect } from 'react'

import { BrowserRouter, Routes } from 'react-router-dom';
import { RenderRoutes } from './routes/routes.jsx';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {RenderRoutes()}
      </Routes>
    </BrowserRouter>
  );
}

export default App