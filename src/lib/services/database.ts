import { supabase } from '$lib/supabase_client';
import type { Member, DateEntry, Availability, ConsolidatedAvailability } from '$lib/types';

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

// Date functions
export async function getDates(startDate?: string, endDate?: string): Promise<DateEntry[]> {
  let query = supabase
    .from('dates')
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
  
  return data as DateEntry[];
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
    .eq('date_id', dateId);
  
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
    .eq('date_id', dateId);
  
  if (error) {
    console.error(`Error updating availability for member ${memberId} and date ${dateId}:`, error);
    return false;
  }
  
  return true;
}

// Consolidated view functions
export async function getConsolidatedAvailability(dateId: number): Promise<ConsolidatedAvailability | null> {
  // Get the date
  const { data: dateData, error: dateError } = await supabase
    .from('dates')
    .select('*')
    .eq('id', dateId)
    .single();
  
  if (dateError || !dateData) {
    console.error(`Error fetching date ${dateId}:`, dateError);
    return null;
  }
  
  // Get all members
  const { data: membersData, error: membersError } = await supabase
    .from('members')
    .select('*')
    .order('name');
  
  if (membersError || !membersData) {
    console.error('Error fetching members:', membersError);
    return null;
  }
  
  // Get availability for this date
  const { data: availabilityData, error: availabilityError } = await supabase
    .from('availability')
    .select('*')
    .eq('date_id', dateId);
  
  if (availabilityError) {
    console.error(`Error fetching availability for date ${dateId}:`, availabilityError);
    return null;
  }
  
  // Create availability map for quick lookup
  const availabilityMap = new Map();
  availabilityData.forEach(a => {
    availabilityMap.set(a.member_id, a.status);
  });
  
  // Categorize members by availability
  const available: Member[] = [];
  const unavailable: Member[] = [];
  const unknown: Member[] = [];
  
  membersData.forEach(member => {
    const status = availabilityMap.get(member.id) || 'unknown';
    if (status === 'available') {
      available.push(member);
    } else if (status === 'unavailable') {
      unavailable.push(member);
    } else {
      unknown.push(member);
    }
  });
  
  return {
    date: dateData as DateEntry,
    available,
    unavailable,
    unknown,
    allAvailable: unavailable.length === 0 && unknown.length === 0,
    anyUnavailable: unavailable.length > 0,
    allResponded: unknown.length === 0
  };
}
