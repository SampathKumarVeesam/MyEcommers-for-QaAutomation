import {
  Camera,
  Check,
  CheckCircle2,
  FileImage,
  Sparkles,
  UploadCloud,
  User as UserIcon,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config/api.js';
import { useAuth } from '../context/AuthContext.js';
import { DeliveryAgent, Gender, User } from '../types.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Can be used for customer or delivery agent
  agent?: DeliveryAgent | null;
  onAgentUpdated?: (updated: DeliveryAgent) => void;
}

// Curated gender-matched illustrated avatars
export const GENDER_PRESET_AVATARS: Record<Gender, string[]> = {
  male: [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  ],
  female: [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  ],
  non_binary: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  ],
  prefer_not_to_say: [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  ],
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  agent,
  onAgentUpdated,
}) => {
  const { user, token, updateProfile, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAgentMode = Boolean(agent);
  const targetName = isAgentMode ? agent?.name : user?.name;
  const targetEmail = isAgentMode ? agent?.email : user?.email;
  const targetPhone = isAgentMode ? agent?.phone : user?.phone;
  const targetGender = isAgentMode ? agent?.gender : user?.gender;
  const targetAvatar = isAgentMode ? agent?.avatarUrl : user?.avatarUrl || user?.avatar;

  const [name, setName] = useState(targetName || '');
  const [phone, setPhone] = useState(targetPhone || '');
  const [gender, setGender] = useState<Gender>(targetGender || 'prefer_not_to_say');
  const [selectedAvatar, setSelectedAvatar] = useState(targetAvatar || GENDER_PRESET_AVATARS.prefer_not_to_say[0]);
  const [isCustomUploaded, setIsCustomUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(targetName || '');
      setPhone(targetPhone || '');
      const initGender = targetGender || 'prefer_not_to_say';
      setGender(initGender);
      setSelectedAvatar(targetAvatar || GENDER_PRESET_AVATARS[initGender][0]);
      setIsCustomUploaded(false);
      setUploadError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, targetName, targetPhone, targetGender, targetAvatar]);

  if (!isOpen) return null;

  const handleGenderChange = (newGender: Gender) => {
    setGender(newGender);
    // If not a custom upload, switch to matching preset avatar
    if (!isCustomUploaded) {
      const presets = GENDER_PRESET_AVATARS[newGender];
      setSelectedAvatar(presets[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type (JPG / JPEG / PNG only)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = /\.(jpe?g|png)$/i;

    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      setUploadError('Invalid file format. Please upload a .jpg, .jpeg, or .png image.');
      return;
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    // Read as Base64 Data URL for permanent PostgreSQL storage
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedAvatar(reader.result);
        setIsCustomUploaded(true);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setUploadError(null);
    setSuccessMsg(null);

    try {
      if (isAgentMode && agent) {
        // Agent Profile Save
        const agentToken = localStorage.getItem('shopsphere_agent_token');
        const res = await fetch(apiUrl('/api/agent/profile'), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${agentToken}`,
          },
          body: JSON.stringify({
            name,
            phone,
            gender,
            avatarUrl: selectedAvatar,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setSuccessMsg('Delivery Agent profile updated successfully!');
          if (onAgentUpdated && data.data) {
            onAgentUpdated(data.data);
          }
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setUploadError(data.message || 'Failed to update delivery agent profile');
        }
      } else {
        // Customer Profile Save
        const ok = await updateProfile({
          name,
          phone,
          gender,
          avatarUrl: selectedAvatar,
        });

        if (ok) {
          await refreshUser();
          setSuccessMsg('Profile updated successfully!');
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setUploadError('Failed to update profile. Please verify your connection.');
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  const currentPresets = GENDER_PRESET_AVATARS[gender] || GENDER_PRESET_AVATARS.prefer_not_to_say;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-test="profile-settings-modal"
        data-testid="profile-settings-modal"
        className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 via-white to-blue-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                {isAgentMode ? 'Delivery Agent Profile' : 'Profile Settings'}
              </h3>
              <p className="text-xs text-slate-500">
                Customize your name, phone, gender, and avatar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
              {uploadError}
            </div>
          )}

          {/* Current Avatar & Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
            <div className="relative group shrink-0">
              <img
                src={selectedAvatar}
                alt="Profile Avatar"
                className="w-20 h-20 rounded-full object-cover border-3 border-indigo-500 shadow-md ring-4 ring-indigo-100"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Upload custom image"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-bold text-slate-900 text-sm">Avatar Customization</span>
                {isCustomUploaded && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Custom Upload
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Upload your own JPG/PNG or select a gender-matched illustrated avatar below.
              </p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-test="input-custom-avatar"
                  data-testid="input-custom-avatar"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Upload JPG / PNG (Max 5MB)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gender Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Gender (Matches Default Avatars)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
                { id: 'non_binary', label: 'Non-Binary' },
                { id: 'prefer_not_to_say', label: 'Prefer Not to Say' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  data-test={`gender-option-${opt.id}`}
                  data-testid={`gender-option-${opt.id}`}
                  onClick={() => handleGenderChange(opt.id as Gender)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    gender === opt.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender-Matched Preset Avatars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Preset Avatars for {gender.replace(/_/g, ' ').toUpperCase()}</span>
              </label>
              <span className="text-[11px] text-slate-400">Click to choose</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {currentPresets.map((avatarUrl, idx) => {
                const isSelected = selectedAvatar === avatarUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    data-test={`preset-avatar-${idx}`}
                    data-testid={`preset-avatar-${idx}`}
                    onClick={() => {
                      setSelectedAvatar(avatarUrl);
                      setIsCustomUploaded(false);
                    }}
                    className={`relative p-1 rounded-2xl border-2 transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-3 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <img
                      src={avatarUrl}
                      alt={`Preset Avatar ${idx + 1}`}
                      className="w-full aspect-square rounded-xl object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                data-test="input-profile-name"
                data-testid="input-profile-name"
                placeholder="Your Full Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address (Read-Only)
              </label>
              <input
                type="email"
                value={targetEmail || ''}
                disabled
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              data-test="input-profile-phone"
              data-testid="input-profile-phone"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:text-slate-900"
            />
          </div>

          {/* Footer Save Button */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-test="btn-save-profile"
              data-testid="btn-save-profile"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
