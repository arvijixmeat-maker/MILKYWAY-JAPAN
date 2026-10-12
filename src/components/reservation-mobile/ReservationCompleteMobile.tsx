import { useNavigate } from 'react-router-dom';
import { MobileShell } from '../mobile/MobileShell';
import { BookingDoneCard } from '../reservation-shared/BookingDoneCard';
import { BK_PAGE_BG, type CompleteStepProps } from '../reservation-shared/bookingShared';
import { BookingHeaderMobile } from './BookingHeaderMobile';

/** 完了 on mobile (Claude Design: "Booking Done"). No action bar here, so the tab bar is back. */
export function ReservationCompleteMobile(props: CompleteStepProps) {
    const navigate = useNavigate();
    const home = () => {
        navigate('/');
        window.scrollTo(0, 0);
    };
    return (
        <MobileShell title="ご予約" onBack={home}>
            <BookingHeaderMobile step={3} />
            <section style={{ background: BK_PAGE_BG }}>
                <div style={{ padding: '16px 12px 40px' }}>
                    <BookingDoneCard pc={false} {...props} onMyBookings={() => navigate('/mypage/reservations')} onHome={home} />
                </div>
            </section>
        </MobileShell>
    );
}
