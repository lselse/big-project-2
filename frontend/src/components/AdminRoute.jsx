import React from 'react';
import { Navigate } from 'react-router-dom';

// roles를 지정하지 않으면 기본값으로 ADMIN만 허용한다.
export default function AdminRoute({ children, roles = ['ADMIN'] }) {
  const userRole = localStorage.getItem('userRole');

  if (!roles.includes(userRole)) {
    alert('🚨 접근 권한이 없습니다.');
    return <Navigate to="/home" replace />;
  }

  return children;
}
