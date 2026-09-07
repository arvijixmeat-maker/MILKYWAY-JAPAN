import React from 'react';
import { Navigate } from 'react-router-dom';

export const ReservationStatus: React.FC = () => {
    return <Navigate to="/mypage/reservations" replace />;
};
