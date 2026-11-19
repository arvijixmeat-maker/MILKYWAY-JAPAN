import React from 'react';
import {
    Activity, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, Award, BadgeCheck, Ban, BedDouble, BellRing,
    BookOpen, Building2, Calendar, CalendarCheck, CalendarDays, CalendarX, Camera, Car, Check, CheckCheck, ChevronDown,
    ChevronLeft, ChevronRight, ChevronUp, Circle, CircleAlert, CircleCheck, CircleDot, CircleHelp, CirclePlus, CircleX,
    ClipboardCheck, ClipboardClock, ClipboardList, Clock, CloudUpload, Compass, Copy, CreditCard, DollarSign, Download,
    Ellipsis, ExternalLink, Eye, FilePen, FileSearch, FileSignature, FileText, FolderTree, Footprints, GalleryHorizontal,
    Gift, GripVertical, Headset, Heart, History, Hotel, Hourglass, House, IdCard, Image, ImagePlus, Images, Inbox, Info,
    Languages, LayoutDashboard, LayoutGrid, Lightbulb, Link, List, ListChecks, ListOrdered, LoaderCircle, LogIn, Luggage,
    Mail, MailCheck, MailPlus, Map, MapPin, MapPinPlus, Megaphone, MessageSquareText, Minus, Monitor, Moon, NotebookPen,
    Package, PanelsTopLeft, PawPrint, Pencil, Phone, PlaneLanding, PlaneTakeoff, Play, Plus, QrCode, ReceiptText,
    RefreshCw, RotateCcw, Route, Save, Search, Send, Shapes, SlidersHorizontal, Smartphone, Sparkles, Star, StickyNote,
    Table, Tag, Tent, Ticket, Trash2, TriangleAlert, Upload, User, UserPlus, UserX, Users, Utensils, Wallet, X,
    type LucideIcon,
} from 'lucide-react';

/**
 * 관리자 아이콘 — Lucide 선 아이콘(굵기 1.5).
 * 호출부는 예전처럼 Material Symbols 이름(`<Icon name="add" />`)을 그대로 쓰고, 여기서 Lucide 그림으로 바꿔 준다.
 * 크기는 글자 크기(1em)를 따른다 — admin-console.css 가 `.btn .material-symbols-outlined { font-size }` 처럼
 * 자리마다 정해 둔 크기가 그대로 먹도록 같은 클래스 이름을 붙여 둔다.
 * 아래 표에 없는 이름은 예전 Material Symbols 글꼴로 그린다(빈칸이 되지 않게).
 */
const MAP: Record<string, LucideIcon> = {
    ad_units: Smartphone, add: Plus, add_a_photo: Camera, add_circle: CirclePlus, add_location: MapPinPlus,
    add_photo_alternate: ImagePlus, arrow_back: ArrowLeft, arrow_downward: ArrowDown, arrow_forward: ArrowRight,
    arrow_upward: ArrowUp, article: FileText, assignment: ClipboardList, assignment_ind: IdCard,
    assignment_turned_in: ClipboardCheck, attach_money: DollarSign, auto_awesome: Sparkles, auto_stories: BookOpen,
    badge: IdCard, block: Ban, business: Building2, calendar_month: CalendarDays, calendar_today: Calendar,
    calendar_view_day: Calendar, call: Phone, campaign: Megaphone, cancel: CircleX, category: Shapes, check: Check,
    check_circle: CircleCheck, checklist: ListChecks, chevron_left: ChevronLeft, chevron_right: ChevronRight,
    close: X, cloud_upload: CloudUpload, confirmation_number: Ticket, content_copy: Copy, contract: FileSignature,
    dashboard: LayoutDashboard, delete: Trash2, delete_outline: Trash2, description: FileText, desktop_windows: Monitor,
    directions_car: Car, done: Check, done_all: CheckCheck, download: Download, drag_indicator: GripVertical,
    edit: Pencil, edit_document: FilePen, edit_note: NotebookPen, email: Mail, error: CircleAlert, event: Calendar,
    event_available: CalendarCheck, event_busy: CalendarX, event_note: CalendarDays, expand_less: ChevronUp,
    expand_more: ChevronDown, explore: Compass, fact_check: ClipboardCheck, favorite: Heart, favorite_border: Heart,
    fiber_new: Sparkles, flight_land: PlaneLanding, flight_takeoff: PlaneTakeoff, folder_managed: FolderTree,
    format_list_bulleted: List, format_list_numbered: ListOrdered, forward_to_inbox: MailPlus, grade: Star,
    grid_view: LayoutGrid, groups: Users, help: CircleHelp, hiking: Footprints, history: History, home: House,
    horizontal_rule: Minus, hotel: BedDouble, hourglass_empty: Hourglass, hourglass_top: Hourglass, image: Image,
    inbox: Inbox, info: Info, inventory_2: Package, label: Tag, lightbulb: Lightbulb, link: Link, list: List,
    list_alt: ClipboardList, local_taxi: Car, location_on: MapPin, login: LogIn, mail: Mail,
    manage_search: FileSearch, map: Map, mark_email_read: MailCheck, menu_book: BookOpen, more_horiz: Ellipsis,
    night_shelter: Tent, nights_stay: Moon, notification_important: BellRing, open_in_new: ExternalLink,
    outgoing_mail: Send, paid: BadgeCheck, payments: Wallet, pending: Clock, pending_actions: ClipboardClock,
    people: Users, person: User, person_add: UserPlus, person_off: UserX, pets: PawPrint, phone: Phone,
    photo_library: Images, picture_as_pdf: FileText, place: MapPin, play_arrow: Play, preview: Eye,
    priority_high: CircleAlert, progress_activity: LoaderCircle, qr_code_2: QrCode, radio_button_checked: CircleDot,
    radio_button_unchecked: Circle, rate_review: MessageSquareText, receipt_long: ReceiptText, redeem: Gift,
    refresh: RefreshCw, request_quote: ReceiptText, restart_alt: RotateCcw, restaurant: Utensils,
    reviews: MessageSquareText, route: Route, save: Save, schedule: Clock, search: Search, send: Send,
    smartphone: Smartphone, star: Star, star_border: Star, sticky_note_2: StickyNote, support_agent: Headset,
    swap_horiz: ArrowLeftRight, sync_alt: ArrowLeftRight, table_view: Table, task_alt: CircleCheck,
    timeline: Activity, tour: Luggage, translate: Languages, tune: SlidersHorizontal, upload: Upload,
    verified: BadgeCheck, view_carousel: GalleryHorizontal, visibility: Eye, warning: TriangleAlert,
    web: PanelsTopLeft, workspace_premium: Award, credit_card: CreditCard, apartment: Hotel,
};

/** 속을 채워도 모양이 읽히는 아이콘만 채운다 (나머지는 선 그대로) */
const SOLID = new Set(['star', 'grade', 'favorite']);

export interface IconProps {
    name: string;
    /** 속을 채운 모양 (별점 등) */
    fill?: boolean;
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    onClick?: (e: React.MouseEvent<Element>) => void;
}

export const Icon: React.FC<IconProps> = ({ name, fill, className = '', style, title, onClick }) => {
    const Glyph = MAP[name];
    if (!Glyph) {
        return (
            <span
                className={`material-symbols-outlined ${className}`}
                style={fill ? { fontVariationSettings: "'FILL' 1", ...style } : style}
                title={title} onClick={onClick} aria-hidden="true"
            >
                {name}
            </span>
        );
    }
    return (
        <Glyph
            className={`material-symbols-outlined mw-ico ${className}`}
            width="1em" height="1em" strokeWidth={1.5}
            fill={fill && SOLID.has(name) ? 'currentColor' : 'none'}
            style={{ flex: 'none', ...style }}
            onClick={onClick}
            aria-hidden={title ? undefined : true}
            aria-label={title}
        />
    );
};

export default Icon;
