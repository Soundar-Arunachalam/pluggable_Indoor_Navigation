import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useUIStore } from '../../stores/uiStore';
import { useVenueStore } from '../../stores/venueStore';
import { api } from '../../api/client';
import { Building2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CreateVenueModal: React.FC = () => {
  const { isCreateVenueOpen, closeModal, addToast } = useUIStore();
  const { fetchVenues, selectVenue } = useVenueStore();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('hospital');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newVenue = await api.createVenue({
        name,
        description,
        category,
        levels: [
          { name: 'Ground Floor', short_name: 'G', ordinal: 0 }
        ]
      });
      
      await fetchVenues(); // Refresh list
      selectVenue(newVenue); // Select the new venue
      addToast({ type: 'success', message: 'Venue created successfully.' });
      closeModal('isCreateVenueOpen');
      
      // Navigate to editor for the new venue
      navigate(`/editor/${newVenue.id}`);
      
      // Reset form
      setName('');
      setDescription('');
      setCategory('hospital');
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Failed to create venue' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isCreateVenueOpen} onClose={() => closeModal('isCreateVenueOpen')} title="Create New Venue" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center mb-2 mx-auto">
          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Venue Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Central City Hospital"
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="hospital">Hospital / Medical</option>
            <option value="mall">Shopping Mall</option>
            <option value="airport">Airport</option>
            <option value="campus">University Campus</option>
            <option value="office">Corporate Office</option>
            <option value="transit">Transit Hub</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of the facility..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => closeModal('isCreateVenueOpen')}
            className="px-4 py-2 rounded-lg font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="px-4 py-2 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? 'Creating...' : 'Create Venue'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
