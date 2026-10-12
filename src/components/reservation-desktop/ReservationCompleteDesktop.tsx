import { useNavigate } from 'react-router-dom';
import { BookingDoneCard } from '../reservation-shared/BookingDoneCard';
import type { CompleteStepProps } from '../reservation-shared/bookingShared';
import { ReservationShell } from './ReservationShell';

/** 完了 on PC — confirmation card under the finished stepper. */
export function ReservationCompleteDesktop(props: CompleteStepProps) {
    const navigate = useNavigate();
    return (
        <ReservationShell step={3} productName={props.productName} hideBack>
            <div style={{ flex: '1 1 100%', minWidth: 0, maxWidth: 760, margin: '0 auto' }}>
                <BookingDoneCard pc {...props} onMyBookings={() => navigate('/mypage/reservations')} onHome={() => navigate('/')} />
            </div>
        </ReservationShell>
    );
}
