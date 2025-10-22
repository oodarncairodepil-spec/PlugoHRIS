import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { Holiday, CreateHolidayData, UpdateHolidayData } from '../models/Holiday';

// Get holidays (optionally only active)
export const getHolidays = async (req: Request, res: Response) => {
  try {
    const includeInactiveParam = req.query.includeInactive as string | undefined;
    const includeInactive = includeInactiveParam === undefined ? true : includeInactiveParam === 'true';

    let query = supabase.from('holidays').select('*');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data: holidays, error } = await query.order('date', { ascending: true });

    if (error) {
      console.error('Error fetching holidays:', error);
      return res.status(500).json({ error: 'Failed to fetch holidays' });
    }

    res.json(holidays);
  } catch (error) {
    console.error('Error in getHolidays:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active holidays only
export const getActiveHolidays = async (req: Request, res: Response) => {
  try {
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('is_active', true)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching active holidays:', error);
      return res.status(500).json({ error: 'Failed to fetch active holidays' });
    }

    res.json(holidays);
  } catch (error) {
    console.error('Error in getActiveHolidays:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get holiday by ID
export const getHolidayById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: holiday, error } = await supabase
      .from('holidays')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !holiday) {
      console.error('Error fetching holiday:', error);
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json(holiday);
  } catch (error) {
    console.error('Error in getHolidayById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new holiday
export const createHoliday = async (req: Request, res: Response) => {
  try {
    const { name, date, is_active = true }: CreateHolidayData = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Holiday name is required' });
    }
    if (!date || String(date).trim() === '') {
      return res.status(400).json({ error: 'Holiday date is required' });
    }

    const { data: holiday, error } = await supabase
      .from('holidays')
      .insert({
        name: name.trim(),
        date,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating holiday:', error);
      if ((error as any).code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Holiday already exists on this date' });
      }
      return res.status(500).json({ error: 'Failed to create holiday' });
    }

    res.status(201).json(holiday);
  } catch (error) {
    console.error('Error in createHoliday:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update holiday
export const updateHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, date, is_active }: UpdateHolidayData = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (date !== undefined) updateData.date = date;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data: holiday, error } = await supabase
      .from('holidays')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating holiday:', error);
      if ((error as any).code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Holiday already exists on this date' });
      }
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.json(holiday);
  } catch (error) {
    console.error('Error in updateHoliday:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle holiday active status
export const toggleHolidayStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: currentHoliday, error: fetchError } = await supabase
      .from('holidays')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !currentHoliday) {
      console.error('Error fetching holiday:', fetchError);
      return res.status(404).json({ error: 'Holiday not found' });
    }

    const { data: holiday, error } = await supabase
      .from('holidays')
      .update({ is_active: !currentHoliday.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling holiday status:', error);
      return res.status(500).json({ error: 'Failed to toggle holiday status' });
    }

    res.json(holiday);
  } catch (error) {
    console.error('Error in toggleHolidayStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete holiday
export const deleteHoliday = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting holiday:', error);
      return res.status(404).json({ error: 'Holiday not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteHoliday:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};