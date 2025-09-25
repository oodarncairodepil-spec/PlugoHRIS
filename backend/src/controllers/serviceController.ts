import { Request, Response } from 'express';
import { supabase } from '../utils/supabase';
import { Service, CreateServiceData, UpdateServiceData } from '../models/Service';

// Get all services
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching services:', error);
      return res.status(500).json({ error: 'Failed to fetch services' });
    }

    res.json(services);
  } catch (error) {
    console.error('Error in getAllServices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active services only
export const getActiveServices = async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching active services:', error);
      return res.status(500).json({ error: 'Failed to fetch active services' });
    }

    res.json(services);
  } catch (error) {
    console.error('Error in getActiveServices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get service by ID
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching service:', error);
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error in getServiceById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new service
export const createService = async (req: Request, res: Response) => {
  try {
    const { name, description, is_active = true }: CreateServiceData = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Service name is required' });
    }

    const { data: service, error } = await supabase
      .from('services')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Service name already exists' });
      }
      return res.status(500).json({ error: 'Failed to create service' });
    }

    res.status(201).json(service);
  } catch (error) {
    console.error('Error in createService:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update service
export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_active }: UpdateServiceData = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data: service, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Service name already exists' });
      }
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error in updateService:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle service active status
export const toggleServiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First get current status
    const { data: currentService, error: fetchError } = await supabase
      .from('services')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching service:', fetchError);
      return res.status(404).json({ error: 'Service not found' });
    }

    // Toggle the status
    const { data: service, error } = await supabase
      .from('services')
      .update({ is_active: !currentService.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling service status:', error);
      return res.status(500).json({ error: 'Failed to toggle service status' });
    }

    res.json(service);
  } catch (error) {
    console.error('Error in toggleServiceStatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      return res.status(404).json({ error: 'Service not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error in deleteService:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};