import { supabase } from '$lib/supabase_client';
import type { Member, Event, Availability, ConsolidatedAvailability } from '$lib/types/index';

// Member functions
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }
  
  return data as Member[];
}

export async function getMemberById(id: number): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching member with id ${id}:`, error);
    return null;
  }
  
  return data as Member;
}

// Event functions
export async function getDates(startDate?: string, endDate?: string): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*')
    .order('date');
  
  if (startDate) {
    query = query.gte('date', startDate);
  }
  
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching dates:', error);
    return [];
  }
  
  return data as Event[];
}

// Availability functions
export async function getMemberAvailability(memberId: number): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('member_id', memberId);
  
  if (error) {
    console.error(`Error fetching availability for member ${memberId}:`, error);
    return [];
  }
  
  return data as Availability[];
}

export async function getDateAvailability(dateId: number): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availability')
    .select('*')
    .eq('event_id', dateId);
  
  if (error) {
    console.error(`Error fetching availability for date ${dateId}:`, error);
    return [];
  }
  
  return data as Availability[];
}

export async function updateAvailability(
  memberId: number, 
  dateId: number, 
  status: 'unknown' | 'available' | 'unavailable'
): Promise<boolean> {
  const { error } = await supabase
    .from('availability')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('member_id', memberId)
    .eq('event_id', dateId);
  
  if (error) {
    console.error(`Error updating availability for member ${memberId} and date ${dateId}:`, error);
    return false;
  }
  
  return true;
}

// Consolidated view functions
export async function updateRehearsalStatus(
  eventId: number, 
  status: 'unconfirmed' | 'confirmed' | 'cancelled'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('events')
      .update({ 
        rehearsal_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .eq('event_type', 'rehearsal');

    if (error) {
      console.error('Error updating rehearsal status:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in updateRehearsalStatus:', error);
    return false;
  }
}

export async function createEvents(events: Omit<Event, 'id' | 'created_at'>[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('events')
      .insert(events);
      
    if (error) {
      console.error('Error creating events:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in createEvents:', error);
    return false;
  }
}

export async function getConsolidatedAvailability(dateId: number): Promise<ConsolidatedAvailability | null> {
  // Get the event
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', dateId)
    .single();
  
  if (eventError || !eventData) {
    console.error(`Error fetching event ${dateId}:`, eventError);
    return null;
  }
  
  const event = eventData as Event;
  const { data: membersData, error: membersError } = await supabase
    .from('members')
    .select('*')
    .order('name');
  
  if (membersError || !membersData) {
    console.error('Error fetching members:', membersError);
    return null;
  }
  
  // Get availability for this event
  const { data: availabilityData, error: availabilityError } = await supabase
    .from('availability')
    .select('*')
    .eq('event_id', dateId);
  
  if (availabilityError) {
    console.error(`Error fetching availability for event ${dateId}:`, availabilityError);
    return null;
  }
  
  // Create availability map for quick lookup
  const availabilityMap = new Map();
  availabilityData.forEach(a => {
    availabilityMap.set(a.member_id, a.status);
  });
  
  // Categorize members by availability
  const availableMembers: Member[] = [];
  const unavailableMembers: Member[] = [];
  const unknownMembers: Member[] = [];
  
  membersData.forEach(member => {
    const status = availabilityMap.get(member.id) || 'unknown';
    if (status === 'available') {
      availableMembers.push(member);
    } else if (status === 'unavailable') {
      unavailableMembers.push(member);
    } else {
      unknownMembers.push(member);
    }
  });
  
  return {
    event: event,
    available: availableMembers,
    unavailable: unavailableMembers,
    unknown: unknownMembers,
    allAvailable: unknownMembers.length === 0 && unavailableMembers.length === 0 && availableMembers.length > 0,
    anyUnavailable: unavailableMembers.length > 0,
    allResponded: unknownMembers.length === 0
  };
}
