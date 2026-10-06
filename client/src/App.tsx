import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VisitorPage } from './components/pages/VisitorPage';
import { EditorPage } from './components/pages/EditorPage';
import { StudioPage } from './components/pages/StudioPage';
import { AppShell } from './components/layout/AppShell';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/venue" replace />} />
          <Route path="/venue" element={<VisitorPage />} />
          <Route path="/venue/:venueId" element={<VisitorPage />} />
          <Route path="/venue/:venueId/level/:levelId" element={<VisitorPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/editor/:venueId" element={<EditorPage />} />
          <Route path="/editor/:venueId/level/:levelId" element={<EditorPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/studio/:venueId" element={<StudioPage />} />
          <Route path="/studio/:venueId/level/:levelId" element={<StudioPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
