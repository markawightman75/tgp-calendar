export interface Member {
  id: number;
  name: string;
  instrument: string | null;
  email: string | null;
  created_at: string;
}

export interface Event {
  id: number;
  date: string;
  event_type: 'rehearsal' | 'gig-confirmed' | 'gig-unconfirmed' | 'gig-available';
  rehearsal_status?: 'unconfirmed' | 'confirmed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Availability {
  id: number;
  member_id: number;
  event_id: number;
  status: 'unknown' | 'available' | 'unavailable';
  created_at: string;
  updated_at: string;
}

export interface MemberAvailability extends Availability {
  member: Member;
}

export interface EventAvailability extends Event {
  availabilities: Availability[];
}

export interface ConsolidatedAvailability {
  event: Event;
  available: Member[];
  unavailable: Member[];
  unknown: Member[];
  allAvailable: boolean;
  anyUnavailable: boolean;
  allResponded: boolean;
}

export interface UserPreferences {
  memberId: number | null;
  memberName: string | null;
  lastView: 'personal' | 'consolidated';
}
