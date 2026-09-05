import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PayrunsPage } from './PayrunsPage';

export function PayrollRouter() {
  return (
    <Routes>
      <Route index element={<PayrunsPage />} />
      <Route path="payruns" element={<PayrunsPage />} />
    </Routes>
  );
}
